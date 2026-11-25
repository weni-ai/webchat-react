import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPONENT_WAIT_TIMEOUT_MS,
  ComponentHint,
  ComponentLifecyclePhase,
  ComponentSchedule,
  ComponentStreamingLogContext,
  ComponentType,
  StreamedMessage,
  buildComponentSchedule,
  getDeliveredComponentTypes,
  hasDeliveredComponent,
  isValidCtaUrl,
  sanitizeComponentHints,
  warnComponentStreaming,
} from '@/utils/componentStreaming';

export interface UseComponentStreamLifecycleParams {
  message: StreamedMessage;
  isTextStreaming: boolean;
  isBuffering: boolean;
  isLastMessage: boolean;
  prefersReducedMotion: boolean;
  logContext: ComponentStreamingLogContext;
  onActivate?: () => void;
}

export interface UseComponentStreamLifecycleResult {
  phase: ComponentLifecyclePhase;
  visibleSkeletonHints: ComponentHint[];
  showRealComponents: boolean;
  shouldAnimate: boolean;
  componentsDisabled: boolean;
  schedule: ComponentSchedule;
}

export function useComponentStreamLifecycle({
  message,
  isTextStreaming,
  isBuffering,
  isLastMessage,
  prefersReducedMotion,
  logContext,
  onActivate,
}: UseComponentStreamLifecycleParams): UseComponentStreamLifecycleResult {
  const isStreamingOnMount = message.status === 'streaming';

  // Messages already completed on mount (history, reload, closed chat, sub-view return)
  // bypass skeletons and entrance animations immediately (BD-007, FR-029, FR-030).
  const [phase, setPhase] = useState<ComponentLifecyclePhase>(() =>
    isStreamingOnMount ? 'skeleton' : 'ready',
  );
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(false);
  const [timedOutTypes, setTimedOutTypes] = useState<ComponentType[]>([]);

  const wasObservedStreamingRef = useRef<boolean>(isStreamingOnMount);
  const hasAnnouncedRef = useRef<boolean>(false);
  const hasLoggedInvalidCtaRef = useRef<boolean>(false);
  const isLastMessageRef = useRef<boolean>(isLastMessage);
  const onActivateRef = useRef<(() => void) | undefined>(onActivate);

  useEffect(() => {
    isLastMessageRef.current = isLastMessage;
  }, [isLastMessage]);

  useEffect(() => {
    onActivateRef.current = onActivate;
  }, [onActivate]);

  useEffect(() => {
    if (message.status === 'streaming') {
      wasObservedStreamingRef.current = true;
    }
  }, [message.status]);

  const { channelUuid, sessionId, messageId } = logContext;

  const sanitizedHints = useMemo(
    () =>
      sanitizeComponentHints(message.componentHints, {
        channelUuid,
        sessionId,
        messageId,
      }),
    [message.componentHints, channelUuid, sessionId, messageId],
  );

  // Log once per message if a delivered CTA payload has an invalid or partial URL (BD-004).
  useEffect(() => {
    if (
      message.cta_message !== undefined &&
      !isValidCtaUrl(message.cta_message.url) &&
      !hasLoggedInvalidCtaRef.current
    ) {
      hasLoggedInvalidCtaRef.current = true;
      warnComponentStreaming('Blocked CTA with invalid or incomplete URL', {
        channelUuid,
        sessionId,
        messageId,
        componentType: 'cta_message',
        reason: 'invalid_cta_url',
      });
    }
  }, [message.cta_message, channelUuid, sessionId, messageId]);

  const isStreamCompleted =
    message.status !== 'streaming' || message.streamPhase === 'completed';

  const [retainedHints, setRetainedHints] = useState<ComponentHint[]>(
    () => sanitizedHints,
  );

  useEffect(() => {
    if (sanitizedHints.length > 0) {
      setRetainedHints(sanitizedHints);
    }
  }, [sanitizedHints]);

  const deliveredTypes = useMemo(
    () => getDeliveredComponentTypes(message),
    [message],
  );

  const activeHints = useMemo(() => {
    // When stream_end arrives before useStreamingBuffer finishes revealing words,
    // @weni/webchat-service clears message.componentHints immediately. Retain skeletons
    // for already-delivered components until text reveal completes so the layout never
    // collapses mid-sentence, while still unmounting undelivered hints immediately (FR-012).
    const sourceHints =
      sanitizedHints.length > 0
        ? sanitizedHints
        : isStreamCompleted && isBuffering && deliveredTypes.length > 0
          ? retainedHints.filter((hint) =>
              deliveredTypes.includes(hint.componentType),
            )
          : [];

    return sourceHints.filter(
      (hint) => !timedOutTypes.includes(hint.componentType),
    );
  }, [
    sanitizedHints,
    isStreamCompleted,
    isBuffering,
    deliveredTypes,
    retainedHints,
    timedOutTypes,
  ]);

  const pendingHintedTypes = useMemo(
    () =>
      activeHints
        .map((hint) => hint.componentType)
        .filter((type) => !hasDeliveredComponent(message, type)),
    [activeHints, message],
  );

  const schedule = useMemo(
    () => buildComponentSchedule(message, prefersReducedMotion),
    [message, prefersReducedMotion],
  );

  const hasPendingHinted = pendingHintedTypes.length > 0;
  const isTextComplete = !isBuffering && !isTextStreaming;
  const hasAnyText = (message.text || '').trim().length > 0;

  // Bounded 10-second wait timer (FR-011, FR-026, FR-028):
  // starts after text ends, or immediately on hint arrival for textless responses
  // (cancelling and restarting if text deltas arrive later).
  const shouldRunWaitTimer =
    phase === 'skeleton' &&
    hasPendingHinted &&
    !isStreamCompleted &&
    (isTextComplete || !hasAnyText);

  const pendingKey = pendingHintedTypes.join(',');

  useEffect(() => {
    if (!shouldRunWaitTimer) return undefined;

    const timer = setTimeout(() => {
      warnComponentStreaming('Timed out waiting for streamed components', {
        channelUuid,
        sessionId,
        messageId,
        componentTypes: pendingHintedTypes,
        reason: 'component_timeout',
      });

      setTimedOutTypes((prev) =>
        Array.from(new Set([...prev, ...pendingHintedTypes])),
      );
    }, COMPONENT_WAIT_TIMEOUT_MS);

    return () => clearTimeout(timer);
    // pendingKey captures exact pendingHintedTypes identity without resetting on unrelated renders.
  }, [shouldRunWaitTimer, pendingKey, channelUuid, sessionId, messageId]);

  // Transition from skeleton -> entering (or ready) once text finishes and components resolve.
  useEffect(() => {
    if (phase !== 'skeleton') return;
    if (!isTextComplete) return;
    if (hasPendingHinted && !isStreamCompleted) return;

    if (deliveredTypes.length === 0) {
      if (isStreamCompleted || timedOutTypes.length > 0) {
        setShouldAnimate(false);
        setPhase('ready');
      }
      return;
    }

    if (prefersReducedMotion || schedule.totalSequenceMs === 0) {
      setShouldAnimate(false);
      setPhase('ready');
      if (
        wasObservedStreamingRef.current &&
        isLastMessageRef.current &&
        !hasAnnouncedRef.current
      ) {
        hasAnnouncedRef.current = true;
        onActivateRef.current?.();
      }
      return;
    }

    setShouldAnimate(true);
    setPhase('entering');
  }, [
    phase,
    isTextComplete,
    hasPendingHinted,
    isStreamCompleted,
    deliveredTypes.length,
    timedOutTypes.length,
    prefersReducedMotion,
    schedule.totalSequenceMs,
  ]);

  // Transition from entering -> ready after the <= 300ms stagger sequence finishes.
  useEffect(() => {
    if (phase !== 'entering') return undefined;

    const finishEntrance = () => {
      setPhase('ready');
      if (
        wasObservedStreamingRef.current &&
        isLastMessageRef.current &&
        !hasAnnouncedRef.current
      ) {
        hasAnnouncedRef.current = true;
        onActivateRef.current?.();
      }
    };

    if (prefersReducedMotion || schedule.totalSequenceMs === 0) {
      setShouldAnimate(false);
      finishEntrance();
      return undefined;
    }

    const timer = setTimeout(finishEntrance, schedule.totalSequenceMs);
    return () => clearTimeout(timer);
  }, [phase, prefersReducedMotion, schedule.totalSequenceMs]);

  const visibleSkeletonHints = phase === 'skeleton' ? activeHints : [];
  const showRealComponents = phase === 'entering' || phase === 'ready';
  const componentsDisabled = phase !== 'ready' || !isLastMessage;

  return {
    phase,
    visibleSkeletonHints,
    showRealComponents,
    shouldAnimate,
    componentsDisabled,
    schedule,
  };
}
