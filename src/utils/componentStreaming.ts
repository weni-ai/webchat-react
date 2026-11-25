export type ComponentType = 'list_message' | 'cta_message' | 'quick_replies';

export type StreamPhase =
  | 'streaming_text'
  | 'awaiting_components'
  | 'completed';

export type ComponentLifecyclePhase = 'skeleton' | 'entering' | 'ready';

export interface ComponentHint {
  componentType: ComponentType;
  labels?: string[];
  count?: number;
  itemCount?: number;
}

export interface QuickReplyObject {
  type?: string;
  title: string;
  payload?: string;
}

export type QuickReplyItem = string | QuickReplyObject;

export interface NormalizedQuickReply {
  label: string;
  key: string;
}

export interface ListItem {
  uuid: string;
  title: string;
  description?: string;
}

export interface ListMessagePayload {
  button_text: string;
  list_items: ListItem[];
  item_count?: number;
}

export interface CtaMessagePayload {
  display_text: string;
  url: string;
}

export interface StreamedMessage {
  id: string;
  type: string;
  text: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'streaming' | 'error';
  streamPhase?: StreamPhase;
  componentHints?: ComponentHint[];
  list_message?: ListMessagePayload;
  cta_message?: CtaMessagePayload;
  quick_replies?: QuickReplyItem[];
  metadata?: Record<string, unknown>;
  header?: string;
  persisted?: boolean;
}

export interface ComponentSchedule {
  totalButtonCount: number;
  durationMs: number;
  staggerMs: number;
  totalSequenceMs: number;
  offsets: Record<ComponentType, number>;
}

export interface AnnouncementItem {
  id: string;
  text: string;
}

export type ComponentStreamingWarningReason =
  | 'invalid_hint'
  | 'invalid_cta_url'
  | 'component_timeout';

export interface ComponentStreamingLogContext {
  channelUuid?: string;
  sessionId?: string;
  messageId: string;
}

export interface ComponentStreamingWarningContext
  extends ComponentStreamingLogContext {
  componentType?: ComponentType | string;
  componentTypes?: ComponentType[];
  reason: ComponentStreamingWarningReason;
}

export type TranslateFn = (
  key: string,
  options?: Record<string, string | number>,
) => string;

/** Fixed visual and announcement order across all multi-component responses (BD-006). */
export const COMPONENT_DISPLAY_ORDER: readonly ComponentType[] = [
  'list_message',
  'cta_message',
  'quick_replies',
] as const;

export const COMPONENT_ENTER_DURATION_MS = 180;
export const COMPONENT_MAX_SEQUENCE_MS = 300;
export const COMPONENT_MAX_STAGGER_MS = 70;
export const LIST_ITEM_MAX_STAGGER_MS = 40;
export const COMPONENT_WAIT_TIMEOUT_MS = 10_000;
export const SKELETON_DEFAULT_WIDTH_PX = 120;
export const SKELETON_CTA_DEFAULT_WIDTH_PX = 210;

const VALID_COMPONENT_TYPES: Readonly<Record<string, ComponentType>> = {
  list_message: 'list_message',
  cta_message: 'cta_message',
  quick_replies: 'quick_replies',
};

const HTTP_URL_PATTERN = /^https?:\/\/.+/i;

const LOG_PREFIX = '[WebChat:ComponentStreaming]';

export function warnComponentStreaming(
  message: string,
  context: ComponentStreamingWarningContext,
): void {
  const payload: Record<string, unknown> = {
    messageId: context.messageId,
    reason: context.reason,
  };

  if (context.channelUuid) {
    payload.channelUuid = context.channelUuid;
  }
  if (context.sessionId) {
    payload.sessionId = context.sessionId;
  }
  if (context.componentType !== undefined) {
    payload.componentType = context.componentType;
  }
  if (context.componentTypes !== undefined) {
    payload.componentTypes = context.componentTypes;
  }

  console.warn(`${LOG_PREFIX} ${message}`, payload);
}

export function computeComponentStaggerMs(count: number): number {
  if (count <= 1) return 0;
  return Math.min(
    COMPONENT_MAX_STAGGER_MS,
    (COMPONENT_MAX_SEQUENCE_MS - COMPONENT_ENTER_DURATION_MS) / (count - 1),
  );
}

export function computeListItemStaggerMs(count: number): number {
  if (count <= 1) return 0;
  return Math.min(
    LIST_ITEM_MAX_STAGGER_MS,
    (COMPONENT_MAX_SEQUENCE_MS - COMPONENT_ENTER_DURATION_MS) / (count - 1),
  );
}

export function computeSequenceDurationMs(
  count: number,
  staggerMs: number,
): number {
  if (count <= 0) return 0;
  return COMPONENT_ENTER_DURATION_MS + staggerMs * (count - 1);
}

export function isValidCtaUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!HTTP_URL_PATTERN.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

export function isValidListMessage(
  payload: unknown,
): payload is ListMessagePayload {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<ListMessagePayload>;
  return (
    typeof candidate.button_text === 'string' &&
    candidate.button_text.trim().length > 0 &&
    Array.isArray(candidate.list_items) &&
    candidate.list_items.length > 0
  );
}

export function isValidCtaMessage(
  payload: unknown,
): payload is CtaMessagePayload {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<CtaMessagePayload>;
  return (
    typeof candidate.display_text === 'string' &&
    candidate.display_text.trim().length > 0 &&
    isValidCtaUrl(candidate.url)
  );
}

export function normalizeQuickReplies(
  items: QuickReplyItem[] | undefined | null,
): NormalizedQuickReply[] {
  if (!Array.isArray(items)) return [];

  const normalized: NormalizedQuickReply[] = [];

  items.forEach((item, index) => {
    const rawLabel =
      typeof item === 'string'
        ? item
        : item && typeof item === 'object' && typeof item.title === 'string'
          ? item.title
          : '';

    if (rawLabel.trim().length === 0) return;

    normalized.push({
      label: rawLabel,
      key: `${index}-${rawLabel}`,
    });
  });

  return normalized;
}

export function hasDeliveredComponent(
  message: StreamedMessage,
  componentType: ComponentType,
): boolean {
  const CHECKERS: Record<ComponentType, () => boolean> = {
    list_message: () => isValidListMessage(message.list_message),
    cta_message: () => isValidCtaMessage(message.cta_message),
    quick_replies: () =>
      normalizeQuickReplies(message.quick_replies).length > 0,
  };

  return CHECKERS[componentType]();
}

export function getDeliveredComponentTypes(
  message: StreamedMessage,
): ComponentType[] {
  return COMPONENT_DISPLAY_ORDER.filter((type) =>
    hasDeliveredComponent(message, type),
  );
}

export function sanitizeComponentHints(
  hints: unknown,
  logContext?: ComponentStreamingLogContext,
): ComponentHint[] {
  if (!Array.isArray(hints)) return [];

  const deduped = new Map<ComponentType, ComponentHint>();

  for (const rawHint of hints) {
    if (!rawHint || typeof rawHint !== 'object') {
      if (logContext) {
        warnComponentStreaming('Discarded malformed component hint', {
          ...logContext,
          reason: 'invalid_hint',
        });
      }
      continue;
    }

    const candidate = rawHint as Record<string, unknown>;
    const rawType = candidate.componentType;
    const validType =
      typeof rawType === 'string' ? VALID_COMPONENT_TYPES[rawType] : undefined;

    if (!validType) {
      if (logContext) {
        warnComponentStreaming('Discarded unknown component hint type', {
          ...logContext,
          componentType: typeof rawType === 'string' ? rawType : 'unknown',
          reason: 'invalid_hint',
        });
      }
      continue;
    }

    const validLabels = Array.isArray(candidate.labels)
      ? candidate.labels.filter(
          (label): label is string =>
            typeof label === 'string' && label.trim().length > 0,
        )
      : [];

    const sanitized: ComponentHint = {
      componentType: validType,
    };

    if (validLabels.length > 0) {
      sanitized.labels = validLabels;
    }

    if (isPositiveInteger(candidate.count)) {
      sanitized.count = candidate.count;
    }

    if (
      validType === 'list_message' &&
      isPositiveInteger(candidate.itemCount)
    ) {
      sanitized.itemCount = candidate.itemCount;
    }

    deduped.set(validType, sanitized);
  }

  return COMPONENT_DISPLAY_ORDER.filter((type) => deduped.has(type)).map(
    (type) => deduped.get(type) as ComponentHint,
  );
}

export function buildComponentSchedule(
  message: StreamedMessage,
  prefersReducedMotion: boolean,
): ComponentSchedule {
  const hasList = hasDeliveredComponent(message, 'list_message');
  const hasCta = hasDeliveredComponent(message, 'cta_message');
  const quickReplyCount = normalizeQuickReplies(message.quick_replies).length;

  const listCount = hasList ? 1 : 0;
  const ctaCount = hasCta ? 1 : 0;
  const totalButtonCount = listCount + ctaCount + quickReplyCount;

  const offsets: Record<ComponentType, number> = {
    list_message: 0,
    cta_message: listCount,
    quick_replies: listCount + ctaCount,
  };

  if (prefersReducedMotion || totalButtonCount === 0) {
    return {
      totalButtonCount,
      durationMs: 0,
      staggerMs: 0,
      totalSequenceMs: 0,
      offsets,
    };
  }

  const staggerMs = computeComponentStaggerMs(totalButtonCount);
  const totalSequenceMs = computeSequenceDurationMs(
    totalButtonCount,
    staggerMs,
  );

  return {
    totalButtonCount,
    durationMs: COMPONENT_ENTER_DURATION_MS,
    staggerMs,
    totalSequenceMs,
    offsets,
  };
}

export function buildActivationAnnouncements(
  message: StreamedMessage,
  t: TranslateFn,
): string[] {
  const BUILDERS: Record<ComponentType, () => string | null> = {
    list_message: () => {
      if (!isValidListMessage(message.list_message)) return null;
      const itemCount = message.list_message.item_count;
      if (isPositiveInteger(itemCount)) {
        return t('streaming_components.list_available_with_count', {
          count: itemCount,
        });
      }
      return t('streaming_components.list_available');
    },
    cta_message: () => {
      if (!isValidCtaMessage(message.cta_message)) return null;
      return t('streaming_components.cta_available', {
        label: message.cta_message.display_text,
      });
    },
    quick_replies: () => {
      const normalized = normalizeQuickReplies(message.quick_replies);
      if (normalized.length === 0) return null;
      return t('streaming_components.quick_replies_available', {
        count: normalized.length,
      });
    },
  };

  const announcements: string[] = [];

  for (const type of COMPONENT_DISPLAY_ORDER) {
    const text = BUILDERS[type]();
    if (text) {
      announcements.push(text);
    }
  }

  return announcements;
}
