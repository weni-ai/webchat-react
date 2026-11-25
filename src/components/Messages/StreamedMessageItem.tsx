import { Fragment, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import MessageContainer from '@/components/Messages/MessageContainer';
import MessageText from '@/components/Messages/MessageText';
import Icon from '@/components/common/Icon';
import { QuickReplies } from '@/components/Messages/TextComponents/QuickReplies';
import { ListMessage } from '@/components/Messages/TextComponents/ListMessage';
import { CallToAction } from '@/components/Messages/TextComponents/CallToAction';
import { ComponentSkeleton } from '@/components/Messages/TextComponents/ComponentSkeleton';
import { useStreamingBuffer } from '@/hooks/useStreamingBuffer';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useComponentStreamLifecycle } from '@/hooks/useComponentStreamLifecycle';
import { useWeniChat } from '@/hooks/useWeniChat';
import {
  StreamedMessage,
  buildActivationAnnouncements,
  isValidCtaMessage,
  isValidListMessage,
  normalizeQuickReplies,
} from '@/utils/componentStreaming';

export interface StreamedMessageItemProps {
  message: StreamedMessage;
  direction: 'incoming' | 'outgoing';
  isLastMessage: boolean;
  onAnnounce?: (messageId: string, messages: string[]) => void;
}

export function StreamedMessageItem({
  message,
  direction,
  isLastMessage,
  onAnnounce,
}: StreamedMessageItemProps) {
  const { t } = useTranslation();
  const { service } = useWeniChat();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Text streaming ends when streamPhase switches to awaiting_components or completed,
  // even while message.status stays 'streaming' waiting for a delayed CTA URL (FR-009).
  const isTextStreaming =
    message.status === 'streaming' &&
    (message.streamPhase === undefined ||
      message.streamPhase === 'streaming_text');

  const { displayedText, isBuffering } = useStreamingBuffer({
    text: message.text || '',
    isStreaming: isTextStreaming,
  });

  const handleActivate = useCallback(() => {
    if (!onAnnounce) return;
    const announcements = buildActivationAnnouncements(message, t);
    if (announcements.length > 0) {
      onAnnounce(message.id, announcements);
    }
  }, [message, onAnnounce, t]);

  const logContext = useMemo(
    () => ({
      channelUuid: service?.config?.channelUuid,
      sessionId: service?.getSession?.()?.sessionId,
      messageId: message.id,
    }),
    [service, message.id],
  );

  const {
    visibleSkeletonHints,
    showRealComponents,
    shouldAnimate,
    componentsDisabled,
    schedule,
  } = useComponentStreamLifecycle({
    message,
    isTextStreaming,
    isBuffering,
    isLastMessage,
    prefersReducedMotion,
    logContext,
    onActivate: handleActivate,
  });

  const listHint = visibleSkeletonHints.find(
    (hint) => hint.componentType === 'list_message',
  );
  const ctaHint = visibleSkeletonHints.find(
    (hint) => hint.componentType === 'cta_message',
  );
  const quickRepliesHint = visibleSkeletonHints.find(
    (hint) => hint.componentType === 'quick_replies',
  );

  const listSlot = listHint ? (
    <ComponentSkeleton
      variant="list_message"
      labels={listHint.labels}
      count={listHint.count}
    />
  ) : showRealComponents && isValidListMessage(message.list_message) ? (
    <ListMessage
      buttonText={message.list_message.button_text}
      items={message.list_message.list_items}
      disabled={componentsDisabled}
      animate={shouldAnimate}
      staggerOffset={schedule.offsets.list_message}
      staggerMs={schedule.staggerMs}
      durationMs={schedule.durationMs}
    />
  ) : null;

  const ctaSlot = ctaHint ? (
    <ComponentSkeleton
      variant="cta_message"
      labels={ctaHint.labels}
      count={ctaHint.count}
    />
  ) : showRealComponents && isValidCtaMessage(message.cta_message) ? (
    <CallToAction
      buttonText={message.cta_message.display_text}
      url={message.cta_message.url}
      disabled={componentsDisabled}
      animate={shouldAnimate}
      staggerOffset={schedule.offsets.cta_message}
      staggerMs={schedule.staggerMs}
      durationMs={schedule.durationMs}
    />
  ) : null;

  const hasQuickReplies =
    normalizeQuickReplies(message.quick_replies).length > 0;

  const quickRepliesNode = quickRepliesHint ? (
    <ComponentSkeleton
      variant="quick_replies"
      labels={quickRepliesHint.labels}
      count={quickRepliesHint.count}
    />
  ) : showRealComponents && hasQuickReplies && message.quick_replies ? (
    <QuickReplies
      quickReplies={message.quick_replies}
      disabled={componentsDisabled}
      animate={shouldAnimate}
      staggerOffset={schedule.offsets.quick_replies}
      staggerMs={schedule.staggerMs}
      durationMs={schedule.durationMs}
    />
  ) : null;

  const hasTextOrBuffer = Boolean(displayedText) || isBuffering;
  const hasBubbleComponent = Boolean(listSlot || ctaSlot);
  const shouldRenderBubble =
    hasTextOrBuffer ||
    hasBubbleComponent ||
    !quickRepliesNode ||
    message.status === 'error';

  const pendingModifier =
    message.status === 'pending' ? ' weni-messages-list__message--pending' : '';

  return (
    <Fragment>
      {shouldRenderBubble && (
        <MessageContainer
          className={`weni-messages-list__message weni-messages-list__message--${direction}${pendingModifier}`}
          direction={direction}
          type={message.type}
        >
          <MessageText
            message={message}
            componentsEnabled={!componentsDisabled}
            displayedText={displayedText}
            isBuffering={isBuffering}
            renderListSlot={listSlot}
            renderCtaSlot={ctaSlot}
          />

          {message.status === 'error' && (
            <Icon
              name="error"
              size="small"
              color="fg-critical"
            />
          )}
        </MessageContainer>
      )}

      {quickRepliesNode && (
        <MessageContainer
          className={`weni-messages-list__message weni-messages-list__message--${direction} weni-messages-list__message--quick-replies`}
          direction={direction}
          type={message.type}
        >
          {quickRepliesNode}
        </MessageContainer>
      )}
    </Fragment>
  );
}

export default StreamedMessageItem;
