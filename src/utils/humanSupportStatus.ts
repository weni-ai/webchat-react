const LOG_PREFIX = '[WebChat:HumanSupportStatus]';
const HUMAN_AGENT_ID_PATTERN = /^ha_[0-9a-f]{32}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AUTHOR_NAME_LENGTH = 80;

export const MESSAGE_TYPE_HUMAN_SUPPORT_EVENT = 'human_support_event';
export const MESSAGE_TYPE_CONVERSATION_STATUS = 'conversation_status';

export type AuthorType = 'contact' | 'ai_agent' | 'human_agent';

export type MessageAuthor =
  | { type: 'contact' }
  | { type: 'ai_agent' }
  | { type: 'human_agent'; id: string; name?: string }
  | { type: 'human_agent' };

export type HumanSupportEventType = 'started' | 'ended';

export interface HumanSupportEvent {
  eventId: string;
  event: HumanSupportEventType;
  occurredAt: number;
}

export type ShopperMessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'error';

export interface HumanSupportFeatures {
  humanSupportStatus?: boolean;
}

export interface HumanSupportState {
  active: boolean;
}

export interface TypingAuthor {
  type: 'human_agent';
  name?: string;
}

export interface HumanSupportMessage {
  id?: string;
  type: string;
  direction: 'incoming' | 'outgoing';
  timestamp: number;
  orderKey?: number;
  status?: ShopperMessageStatus | 'streaming';
  author?: MessageAuthor;
  humanSupportEvent?: HumanSupportEvent;
  text?: string;
  [key: string]: unknown;
}

export type MessageGroupKind = 'messages' | 'milestone' | 'conversation_status';

export interface MessageDisplayMetadata {
  showAuthorName: boolean;
  authorName?: string;
  showTimestamp: boolean;
  visibleStatus: ShopperMessageStatus | null;
}

export interface MessageGroup {
  kind: MessageGroupKind;
  direction: 'incoming' | 'outgoing';
  authorKey: string | null;
  messages: HumanSupportMessage[];
  displayMeta?: MessageDisplayMetadata[];
}

export type SupportedLocale = 'en' | 'pt' | 'es';

export interface StatusMetaDescriptor {
  icon: 'schedule' | 'check' | 'done_all' | 'error';
  color: 'fg-base-soft' | 'sl-color-blue-10' | 'fg-critical';
  ariaLabelKey: string;
  includesTime: boolean;
}

export interface MilestoneConfig {
  badgeType: 'success' | 'neutral';
  labelKey: string;
}

export interface HumanSupportLogContext {
  channelUuid?: string;
  sessionId?: string;
  messageId?: string;
  eventId?: string;
}

export interface HumanSupportWarningContext extends HumanSupportLogContext {
  status?: string;
  reason: 'invalid_milestone' | 'invalid_author' | 'invalid_status';
}

export const STATUS_META_MAP: Record<
  ShopperMessageStatus,
  StatusMetaDescriptor
> = {
  pending: {
    icon: 'schedule',
    color: 'fg-base-soft',
    ariaLabelKey: 'human_support.status_sending',
    includesTime: false,
  },
  sent: {
    icon: 'check',
    color: 'fg-base-soft',
    ariaLabelKey: 'human_support.status_sent',
    includesTime: true,
  },
  delivered: {
    icon: 'done_all',
    color: 'fg-base-soft',
    ariaLabelKey: 'human_support.status_delivered',
    includesTime: true,
  },
  read: {
    icon: 'done_all',
    color: 'sl-color-blue-10',
    ariaLabelKey: 'human_support.status_read',
    includesTime: true,
  },
  error: {
    icon: 'error',
    color: 'fg-critical',
    ariaLabelKey: 'human_support.status_error',
    includesTime: false,
  },
};

export const MILESTONE_CONFIG_MAP: Record<
  HumanSupportEventType,
  MilestoneConfig
> = {
  started: {
    badgeType: 'success',
    labelKey: 'human_support.milestone_started',
  },
  ended: {
    badgeType: 'neutral',
    labelKey: 'human_support.milestone_ended',
  },
};

const SUPPORTED_LOCALE_MAP: Record<string, SupportedLocale> = {
  en: 'en',
  pt: 'pt',
  es: 'es',
};

function logWarning(
  message: string,
  context: HumanSupportWarningContext,
): void {
  console.warn(`${LOG_PREFIX} ${message}`, context);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidTimestamp(timestamp: unknown): timestamp is number {
  return (
    typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp > 0
  );
}

export function normalizeLocale(language?: string | null): SupportedLocale {
  if (typeof language !== 'string' || language.trim().length === 0) {
    return 'en';
  }
  const base = language.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALE_MAP[base] ?? 'en';
}

export function formatMessageTimestamp(
  timestamp: unknown,
  language?: string | null,
  now: Date = new Date(),
): string {
  if (!isValidTimestamp(timestamp)) {
    return '';
  }

  const date = new Date(timestamp);
  const locale = normalizeLocale(language);
  const hours = date.getHours();
  const minutes = pad2(date.getMinutes());

  const timeStr =
    locale === 'en'
      ? `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`
      : `${pad2(hours)}:${minutes}`;

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return timeStr;
  }

  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const dateStr = locale === 'en' ? `${month}/${day}` : `${day}/${month}`;

  return `${dateStr} · ${timeStr}`;
}

export function validateAuthor(
  author: unknown,
  logContext?: HumanSupportLogContext,
): MessageAuthor | undefined {
  if (author === undefined || author === null) {
    return undefined;
  }

  if (typeof author !== 'object') {
    logWarning('Discarding malformed author payload', {
      ...logContext,
      reason: 'invalid_author',
    });
    return undefined;
  }

  const candidate = author as Record<string, unknown>;
  const type = candidate.type;

  if (type === 'contact' || type === 'ai_agent') {
    return { type };
  }

  if (type !== 'human_agent') {
    logWarning('Discarding unknown author type', {
      ...logContext,
      reason: 'invalid_author',
    });
    return undefined;
  }

  const rawId = candidate.id;
  const rawName = candidate.name;

  // Live Desk system messages legitimately omit both `id` and `name` (AD-005 item 3).
  if (rawId === undefined && rawName === undefined) {
    return { type: 'human_agent' };
  }

  if (typeof rawId !== 'string' || !HUMAN_AGENT_ID_PATTERN.test(rawId)) {
    logWarning('Invalid human_agent author id', {
      ...logContext,
      reason: 'invalid_author',
    });
    return rawId === undefined ? { type: 'human_agent' } : undefined;
  }

  if (rawName === undefined) {
    return { type: 'human_agent', id: rawId };
  }

  if (typeof rawName !== 'string') {
    logWarning('Invalid human_agent author name', {
      ...logContext,
      reason: 'invalid_author',
    });
    return { type: 'human_agent', id: rawId };
  }

  const trimmedName = rawName.trim();
  if (trimmedName.length === 0 || trimmedName.length > MAX_AUTHOR_NAME_LENGTH) {
    logWarning('Out-of-bounds human_agent author name', {
      ...logContext,
      reason: 'invalid_author',
    });
    return { type: 'human_agent', id: rawId };
  }

  return { type: 'human_agent', id: rawId, name: trimmedName };
}

export function validateHumanSupportEvent(
  event: unknown,
  logContext?: HumanSupportLogContext,
): HumanSupportEvent | null {
  if (!event || typeof event !== 'object') {
    logWarning('Discarding malformed human_support_event payload', {
      ...logContext,
      reason: 'invalid_milestone',
    });
    return null;
  }

  const candidate = event as Record<string, unknown>;
  const eventId = candidate.eventId;
  const eventType = candidate.event;
  const occurredAt = candidate.occurredAt;

  const isEventIdValid =
    typeof eventId === 'string' && UUID_PATTERN.test(eventId);
  const isEventTypeValid = eventType === 'started' || eventType === 'ended';

  if (!isEventIdValid || !isEventTypeValid || !isValidTimestamp(occurredAt)) {
    logWarning('Discarding invalid human_support_event fields', {
      ...logContext,
      eventId: typeof eventId === 'string' ? eventId : logContext?.eventId,
      reason: 'invalid_milestone',
    });
    return null;
  }

  return {
    eventId,
    event: eventType,
    occurredAt,
  };
}

export function validateShopperStatus(
  status: unknown,
  logContext?: HumanSupportLogContext,
): ShopperMessageStatus | null {
  if (status === undefined || status === null || status === 'streaming') {
    return null;
  }

  if (
    typeof status === 'string' &&
    Object.prototype.hasOwnProperty.call(STATUS_META_MAP, status)
  ) {
    return status as ShopperMessageStatus;
  }

  logWarning('Ignoring unexpected shopper message status', {
    ...logContext,
    status: typeof status === 'string' ? status : String(status),
    reason: 'invalid_status',
  });
  return null;
}

export function getAuthorKey(
  author: MessageAuthor | undefined,
  direction: 'incoming' | 'outgoing',
): string {
  if (!author) {
    return `legacy:${direction}`;
  }

  if (author.type === 'contact' || author.type === 'ai_agent') {
    return author.type;
  }

  if ('id' in author && author.id) {
    return `human_agent:${author.id}`;
  }

  return 'human_agent:system';
}

export function getLocalMinuteKey(timestamp: unknown): string | null {
  if (!isValidTimestamp(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function computeMessageDisplayMetadata(
  groupMessages: HumanSupportMessage[],
  logContext?: HumanSupportLogContext,
  prevalidatedAuthors?: Array<MessageAuthor | undefined>,
): MessageDisplayMetadata[] {
  const validatedAuthors =
    prevalidatedAuthors ??
    groupMessages.map((msg) =>
      validateAuthor(msg.author, { ...logContext, messageId: msg.id }),
    );
  const minuteKeys = groupMessages.map((msg) =>
    getLocalMinuteKey(msg.timestamp),
  );

  return groupMessages.map((msg, index) => {
    const author = validatedAuthors[index];
    const minuteKey = minuteKeys[index];
    const isStreaming = msg.status === 'streaming';
    const isOutgoing = msg.direction === 'outgoing';

    const agentName =
      author?.type === 'human_agent' && 'name' in author
        ? author.name
        : undefined;
    const showAuthorName = index === 0 && Boolean(agentName);

    const visibleStatus =
      isOutgoing && author
        ? validateShopperStatus(msg.status, {
            ...logContext,
            messageId: msg.id,
          })
        : null;

    if (!author || !minuteKey || isStreaming) {
      return {
        showAuthorName,
        authorName: showAuthorName ? agentName : undefined,
        showTimestamp: false,
        visibleStatus,
      };
    }

    // Keep send-failure error indicators visible even when followed by another
    // same-minute shopper message so failures are never silently hidden (FR-023).
    if (visibleStatus === 'error') {
      return {
        showAuthorName,
        authorName: showAuthorName ? agentName : undefined,
        showTimestamp: true,
        visibleStatus,
      };
    }

    const nextMsg = groupMessages[index + 1];
    const nextAuthor = validatedAuthors[index + 1];
    const nextMinuteKey = minuteKeys[index + 1];

    const sameMinuteWithNext =
      Boolean(nextMsg) &&
      nextMsg.status !== 'streaming' &&
      Boolean(nextAuthor) &&
      nextMinuteKey === minuteKey;

    return {
      showAuthorName,
      authorName: showAuthorName ? agentName : undefined,
      showTimestamp: !sameMinuteWithNext,
      visibleStatus,
    };
  });
}

export function groupMessagesByAuthor(
  messages: HumanSupportMessage[],
  logContext?: HumanSupportLogContext,
): MessageGroup[] {
  if (messages.length === 0) {
    return [];
  }

  const groups: MessageGroup[] = [];
  const groupAuthors: Array<Array<MessageAuthor | undefined>> = [];

  for (const message of messages) {
    if (message.type === MESSAGE_TYPE_HUMAN_SUPPORT_EVENT) {
      groups.push({
        kind: 'milestone',
        direction: 'incoming',
        authorKey: null,
        messages: [message],
      });
      groupAuthors.push([]);
      continue;
    }

    if (message.type === MESSAGE_TYPE_CONVERSATION_STATUS) {
      const previous = groups[groups.length - 1];
      if (previous && previous.kind === 'conversation_status') {
        previous.messages.push(message);
      } else {
        groups.push({
          kind: 'conversation_status',
          direction: message.direction,
          authorKey: null,
          messages: [message],
        });
        groupAuthors.push([]);
      }
      continue;
    }

    const author = validateAuthor(message.author, {
      ...logContext,
      messageId: message.id,
    });
    const authorKey = getAuthorKey(author, message.direction);
    const previous = groups[groups.length - 1];

    if (
      previous &&
      previous.kind === 'messages' &&
      previous.authorKey === authorKey
    ) {
      previous.messages.push(message);
      groupAuthors[groupAuthors.length - 1].push(author);
    } else {
      groups.push({
        kind: 'messages',
        direction: message.direction,
        authorKey,
        messages: [message],
      });
      groupAuthors.push([author]);
    }
  }

  return groups.map((group, index) =>
    group.kind === 'messages'
      ? {
          ...group,
          displayMeta: computeMessageDisplayMetadata(
            group.messages,
            logContext,
            groupAuthors[index],
          ),
        }
      : group,
  );
}
