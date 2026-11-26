import { useRef, useEffect, Fragment, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import MessageContainer from './MessageContainer';
import MessageAudio from './MessageAudio';
import MessageDocument from './MessageDocument';
import MessageImage from './MessageImage';
import MessageMeta from './MessageMeta';
import MessageOrder from './MessageOrder';
import MessageText from './MessageText';
import MessageVideo from './MessageVideo';
import HumanSupportMilestone from './HumanSupportMilestone';
import StreamedMessageItem from './StreamedMessageItem';
import ComponentAnnouncementRegion from './ComponentAnnouncementRegion';
import TypingIndicator from './TypingIndicator';
import Icon from '@/components/common/Icon';
import PropTypes from 'prop-types';
import { ChatPresentation } from '@/components/Chat/ChatPresentation';
import { FSButton } from '@/components/common/FSButton';

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';
import { useConversationStarters } from '@/contexts/ConversationStartersContext';
import { MessagesScrollProvider } from '@/contexts/MessagesScrollContext';
import { ConversationStartersFull } from '@/components/ConversationStarters/ConversationStarters';
import { ShowItems } from './TextComponents/ShowItems';
import { ProductCarousel } from './TextComponents/ProductCarousel';
import { QuickReplies } from './TextComponents/QuickReplies';
import { FSBadge } from '../common/FSBadge';
import {
  formatMessageTimestamp,
  MESSAGE_TYPE_CONVERSATION_STATUS,
  MESSAGE_TYPE_HUMAN_SUPPORT_EVENT,
  MILESTONE_CONFIG_MAP,
  validateHumanSupportEvent,
} from '@/utils/humanSupportStatus';

import './MessagesList.scss';
import ThinkingIndicator from './ThinkingIndicator';

const BOTTOM_SCROLL_THRESHOLD_PX = 100;
const NON_STREAMED_MESSAGE_TYPES = new Set([
  'image',
  'video',
  'audio',
  'document',
  'file',
  'order',
]);

export function Message({ message, componentsEnabled }) {
  switch (message.type) {
    case 'text':
    case 'message':
      return (
        <MessageText
          message={message}
          componentsEnabled={componentsEnabled}
        />
      );
    case 'image':
      return <MessageImage message={message} />;
    case 'video':
      return <MessageVideo message={message} />;
    case 'audio':
      return <MessageAudio message={message} />;
    case 'document':
    case 'file':
      return <MessageDocument message={message} />;
    case 'order':
      return <MessageOrder message={message} />;
    default:
      return (
        <MessageText
          message={message}
          componentsEnabled={componentsEnabled}
        />
      );
  }
}

Message.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
  }).isRequired,
  componentsEnabled: PropTypes.bool,
};

function collectMilestoneIdsFromGroups(groups) {
  const ids = new Set();
  for (const group of groups) {
    for (const msg of group.messages || []) {
      const eventId = msg?.humanSupportEvent?.eventId;
      if (msg?.type === MESSAGE_TYPE_HUMAN_SUPPORT_EVENT && eventId) {
        ids.add(eventId);
      }
    }
  }
  return ids;
}

export function MessagesList() {
  const { t, i18n } = useTranslation();
  const {
    isTyping,
    isThinking,
    thinkingText,
    messageGroups,
    isChatOpen,
    isHumanSupportFeatureEnabled,
    isHumanSupportActive,
    typingAuthor,
    service,
  } = useWeniChat();
  const { isVoiceModeActive, voicePartialTranscript } = useChatContext();
  const { questions, isInChatStartersDismissed, handleFullStarterClick } =
    useConversationStarters();
  const messagesEndRef = useRef(null);
  const listRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [showGoToBottom, setShowGoToBottom] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const announcementSeqRef = useRef(0);
  const seenMilestoneIdsRef = useRef(null);
  const lastAnnouncedTypingLabelRef = useRef(null);

  if (seenMilestoneIdsRef.current === null) {
    seenMilestoneIdsRef.current = collectMilestoneIdsFromGroups(messageGroups);
  }

  const showConversationStartersFull =
    questions.length > 0 &&
    !isInChatStartersDismissed &&
    messageGroups.length === 0;

  // Suppress AI thinking indicators while a human support session is open (FR-033).
  const effectiveIsThinking =
    isHumanSupportFeatureEnabled && isHumanSupportActive ? false : isThinking;

  const trimmedTypingName =
    typeof typingAuthor?.name === 'string' ? typingAuthor.name.trim() : '';
  const humanTypingLabel =
    isHumanSupportFeatureEnabled &&
    isTyping &&
    typingAuthor?.type === 'human_agent'
      ? trimmedTypingName
        ? t('human_support.typing_with_name', { name: trimmedTypingName })
        : t('human_support.typing_anonymous')
      : undefined;

  const isNearBottomRef = useRef(true);
  const lastOutgoingIdRef = useRef(null);

  const lastMessage = messageGroups.at(-1)?.messages.at(-1);
  const totalMessageCount = messageGroups.reduce(
    (sum, group) => sum + group.messages.length,
    0,
  );
  const lastItemKey = lastMessage?.id ?? lastMessage?.timestamp ?? null;
  const lastMessageTextLength =
    typeof lastMessage?.text === 'string' ? lastMessage.text.length : 0;

  const handleAnnounce = useCallback((messageId, texts) => {
    if (!Array.isArray(texts) || texts.length === 0) return;
    const nextItems = texts.map((text) => {
      announcementSeqRef.current += 1;
      return {
        id: `${messageId}-${announcementSeqRef.current}`,
        text,
      };
    });
    setAnnouncements((prev) => [...prev, ...nextItems]);
  }, []);

  // Seed seen milestone IDs when history loads so historical milestones are never re-announced (FR-034, NFR-004).
  useEffect(() => {
    if (!service || typeof service.on !== 'function') return undefined;

    const handleHistoryLoaded = (loadedMessages) => {
      if (!Array.isArray(loadedMessages)) return;
      for (const msg of loadedMessages) {
        const eventId = msg?.humanSupportEvent?.eventId;
        if (msg?.type === MESSAGE_TYPE_HUMAN_SUPPORT_EVENT && eventId) {
          seenMilestoneIdsRef.current.add(eventId);
        }
      }
    };

    service.on('history:loaded', handleHistoryLoaded);
    return () => {
      if (typeof service.off === 'function') {
        service.off('history:loaded', handleHistoryLoaded);
      }
    };
  }, [service]);

  // Announce newly arriving live milestones politely without moving focus (NFR-004).
  useEffect(() => {
    if (!isHumanSupportFeatureEnabled) return;

    const newMilestoneTexts = [];
    for (const group of messageGroups) {
      if (group.kind !== 'milestone') continue;
      for (const msg of group.messages) {
        const event = validateHumanSupportEvent(msg.humanSupportEvent);
        if (!event || seenMilestoneIdsRef.current.has(event.eventId)) continue;
        seenMilestoneIdsRef.current.add(event.eventId);
        const time = formatMessageTimestamp(event.occurredAt, i18n?.language);
        if (!time) continue;
        const config = MILESTONE_CONFIG_MAP[event.event];
        newMilestoneTexts.push(t(config.labelKey, { time }));
      }
    }

    if (newMilestoneTexts.length > 0) {
      handleAnnounce('human-support-milestone', newMilestoneTexts);
    }
  }, [
    messageGroups,
    isHumanSupportFeatureEnabled,
    t,
    i18n?.language,
    handleAnnounce,
  ]);

  // Announce human agent typing once on transition/name change; ignore repeated heartbeats (NFR-004, AD-004).
  useEffect(() => {
    if (!humanTypingLabel) {
      lastAnnouncedTypingLabelRef.current = null;
      return;
    }

    if (humanTypingLabel !== lastAnnouncedTypingLabelRef.current) {
      lastAnnouncedTypingLabelRef.current = humanTypingLabel;
      handleAnnounce('human-support-typing', [humanTypingLabel]);
    }
  }, [humanTypingLabel, handleAnnounce]);

  function scrollToBottom(behavior = 'smooth') {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }

  const scrollToBottomOnReveal = useCallback(() => {
    if (isNearBottomRef.current) scrollToBottom();
  }, []);

  const syncScrollState = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const top = el.scrollTop;
    setScrollTop(top);
    const distanceFromBottom = el.scrollHeight - top - el.clientHeight;
    const isNear = distanceFromBottom <= BOTTOM_SCROLL_THRESHOLD_PX;
    isNearBottomRef.current = isNear;
    setShowGoToBottom(!isNear);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    syncScrollState();
    el.addEventListener('scroll', syncScrollState, { passive: true });
    window.addEventListener('resize', syncScrollState);
    return () => {
      el.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
    };
  }, [syncScrollState]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    let lastHeight = vv.height;
    let rafId;

    const handleViewportResize = () => {
      if (vv.height < lastHeight) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => scrollToBottom('instant'));
      }
      lastHeight = vv.height;
    };

    vv.addEventListener('resize', handleViewportResize);
    return () => {
      vv.removeEventListener('resize', handleViewportResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Keyed on structural list changes (count, last item, text growth, typing/thinking)
  // rather than raw `messageGroups` identity so in-place status mutations (sent ->
  // delivered -> read) never alter scroll position (FR-039).
  useEffect(() => {
    const isNewOutgoingMessage =
      lastMessage?.direction === 'outgoing' &&
      lastMessage?.id !== lastOutgoingIdRef.current;

    if (isNewOutgoingMessage) {
      lastOutgoingIdRef.current = lastMessage.id;
      scrollToBottom();
    } else if (isNearBottomRef.current) {
      scrollToBottom();
    }

    const id = requestAnimationFrame(() => syncScrollState());
    return () => cancelAnimationFrame(id);
  }, [
    totalMessageCount,
    lastItemKey,
    lastMessage?.direction,
    lastMessageTextLength,
    effectiveIsThinking,
    voicePartialTranscript,
    isTyping,
    syncScrollState,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollToBottom('instant');
      syncScrollState();
    }, 50);
    return () => clearTimeout(t);
  }, [isChatOpen, syncScrollState]);

  // Only the very last incoming message may have active components (FR-022, BD-003).
  const enableComponents = (message) =>
    message.direction === 'incoming' && lastMessage?.id === message.id;

  const baseLogContext = {
    channelUuid: service?.config?.channelUuid,
    sessionId: service?.getSession?.()?.sessionId,
  };

  return (
    <MessagesScrollProvider onWordRevealed={scrollToBottomOnReveal}>
      <section
        ref={listRef}
        className="weni-messages-list"
        data-scroll-top={scrollTop}
      >
        {/* TODO: Add empty state when no messages */}

        <ChatPresentation />

        {messageGroups.map((group, groupIndex) => {
          const groupKey =
            group.messages[0].id ??
            `grp-${group.messages[0].timestamp}-${groupIndex}`;

          if (group.kind === 'milestone') {
            if (!isHumanSupportFeatureEnabled) {
              return null;
            }
            const milestoneMsg = group.messages[0];
            return (
              <HumanSupportMilestone
                key={groupKey}
                event={milestoneMsg.humanSupportEvent}
                logContext={{
                  ...baseLogContext,
                  messageId: milestoneMsg.id,
                }}
              />
            );
          }

          const groupedModifier =
            isHumanSupportFeatureEnabled && group.kind === 'messages'
              ? ' weni-messages-list__direction-group--grouped'
              : '';

          return (
            <section
              className={`
            weni-messages-list__direction-group
            weni-messages-list__direction-group--${group.direction}${groupedModifier}
          `}
              key={groupKey}
            >
              {renderGroupMessagesWithCollapsedStatus(
                group,
                enableComponents,
                t,
                handleAnnounce,
                isHumanSupportFeatureEnabled,
              )}
            </section>
          );
        })}

        {isVoiceModeActive && voicePartialTranscript && (
          <section className="weni-messages-list__direction-group weni-messages-list__direction-group--outgoing">
            <MessageContainer
              className="weni-messages-list__message weni-messages-list__message--outgoing weni-messages-list__message--voice-transcribing"
              direction="outgoing"
              type="text"
            >
              <section className="weni-message-text weni-message-text--outgoing">
                {voicePartialTranscript}
              </section>
            </MessageContainer>
          </section>
        )}

        {(isTyping || effectiveIsThinking) && (
          <section
            className={`
            weni-messages-list__direction-group
            weni-messages-list__direction-group--incoming
            weni-messages-list__direction-group--typing
          `}
          >
            <MessageContainer
              className="weni-messages-list__message weni-messages-list__message--incoming"
              direction="incoming"
              type="typing"
            >
              {effectiveIsThinking ? (
                <ThinkingIndicator
                  className="weni-message__thinking-indicator"
                  text={thinkingText}
                />
              ) : (
                <TypingIndicator label={humanTypingLabel} />
              )}
            </MessageContainer>
          </section>
        )}

        {showConversationStartersFull && (
          <ConversationStartersFull
            questions={questions}
            onStarterClick={handleFullStarterClick}
          />
        )}

        {showGoToBottom && (
          <GoToBottomButton onScrollToBottom={() => scrollToBottom()} />
        )}

        <ComponentAnnouncementRegion announcements={announcements} />

        <div ref={messagesEndRef} />
      </section>
    </MessagesScrollProvider>
  );
}

export default MessagesList;

function GoToBottomButton({ onScrollToBottom }) {
  const { t } = useTranslation();

  return (
    <section className="weni-messages-list__go-to-bottom-container">
      <FSButton
        variant="tertiary"
        onClick={onScrollToBottom}
        size="large"
        rounded
        icon="arrow_downward"
        aria-label={t('messages_list.scroll_to_bottom')}
        className="weni-messages-list__go-to-bottom-button"
      >
        {''}
      </FSButton>
    </section>
  );
}

GoToBottomButton.propTypes = {
  onScrollToBottom: PropTypes.func.isRequired,
};

/**
 * Index right after the last consecutive `conversation_status` message starting at `start`.
 */
function indexAfterConversationStatusRun(messages, start) {
  let end = start + 1;
  while (
    end < messages.length &&
    messages[end].type === MESSAGE_TYPE_CONVERSATION_STATUS
  ) {
    end += 1;
  }
  return end;
}

function renderConversationStatusBadge(
  rowKey,
  keySuffix,
  statusType,
  children,
) {
  return (
    <section
      className="weni-messages-list__conversation-status"
      key={`${rowKey}-${keySuffix}`}
    >
      <FSBadge type={statusType ?? 'success'}>{children}</FSBadge>
    </section>
  );
}

function renderCollapsedConversationStatusRun(run, startIndex, t) {
  const first = run[0];
  const rowKey =
    first.id ?? `msg-${first.timestamp}-${startIndex}-status-run-${run.length}`;

  return renderConversationStatusBadge(
    rowKey,
    'conversation-status-collapsed',
    first.statusType,
    t('messages_list.items_added_to_cart', { count: run.length }),
  );
}

/**
 * Renders one direction-group: consecutive `conversation_status` messages (2+)
 * become a single summary badge; other types are unchanged.
 */
function renderGroupMessagesWithCollapsedStatus(
  group,
  enableComponents,
  t,
  onAnnounce,
  isHumanSupportFeatureEnabled,
) {
  const { messages } = group;
  const nodes = [];

  for (let index = 0; index < messages.length; ) {
    const message = messages[index];

    if (message.type !== MESSAGE_TYPE_CONVERSATION_STATUS) {
      nodes.push(
        renderMessage(
          group,
          message,
          index,
          enableComponents,
          onAnnounce,
          isHumanSupportFeatureEnabled,
        ),
      );
      index += 1;
      continue;
    }

    const runEnd = indexAfterConversationStatusRun(messages, index);
    const runLength = runEnd - index;
    const isCollapsedRun = runLength > 1;

    if (isCollapsedRun) {
      const statusRun = messages.slice(index, runEnd);
      nodes.push(renderCollapsedConversationStatusRun(statusRun, index, t));
    } else {
      nodes.push(
        renderMessage(
          group,
          messages[index],
          index,
          enableComponents,
          onAnnounce,
          isHumanSupportFeatureEnabled,
        ),
      );
    }

    index = runEnd;
  }

  return nodes;
}

function renderMessage(
  group,
  message,
  messageIndex,
  enableComponents,
  onAnnounce,
  isHumanSupportFeatureEnabled,
) {
  const rowKey = message.id ?? `msg-${message.timestamp}-${messageIndex}`;

  if (message.type === MESSAGE_TYPE_CONVERSATION_STATUS) {
    return renderConversationStatusBadge(
      rowKey,
      'conversation-status',
      message.statusType,
      message.text,
    );
  }

  const displayMeta = group.displayMeta?.[messageIndex];
  const isTextLikeMessage = !NON_STREAMED_MESSAGE_TYPES.has(message.type);
  const hasProductCarousel = Boolean(
    message.product_carousel?.product_items?.length > 0,
  );
  const hasTrailingCard = Boolean(message.product_list || hasProductCarousel);
  const isPostLaunchMessage = Boolean(
    isHumanSupportFeatureEnabled && message.author,
  );
  const showInlineLegacyError =
    message.status === 'error' && !isPostLaunchMessage;
  const authorName =
    isHumanSupportFeatureEnabled && displayMeta?.showAuthorName
      ? displayMeta.authorName
      : undefined;
  const shouldShowFooterMeta = Boolean(
    isHumanSupportFeatureEnabled &&
      (displayMeta?.showTimestamp || displayMeta?.visibleStatus === 'error'),
  );

  return (
    <Fragment key={`${rowKey}-body`}>
      {isTextLikeMessage ? (
        <StreamedMessageItem
          message={message}
          direction={group.direction}
          isLastMessage={enableComponents(message)}
          onAnnounce={onAnnounce}
          displayMeta={displayMeta}
          isHumanSupportFeatureEnabled={isHumanSupportFeatureEnabled}
          hasTrailingCard={hasTrailingCard}
        />
      ) : (
        <>
          <MessageContainer
            className={`weni-messages-list__message weni-messages-list__message--${group.direction}${message.status === 'pending' ? ' weni-messages-list__message--pending' : ''}`}
            direction={group.direction}
            type={message.type}
            authorName={authorName}
          >
            <Message
              message={message}
              componentsEnabled={enableComponents(message)}
            />

            {showInlineLegacyError && (
              <Icon
                name="error"
                size="small"
                color="fg-critical"
              />
            )}
          </MessageContainer>

          {Array.isArray(message.quick_replies) &&
            message.quick_replies.length > 0 && (
              <MessageContainer
                className={`weni-messages-list__message weni-messages-list__message--${group.direction} weni-messages-list__message--quick-replies`}
                direction={group.direction}
                type={message.type}
              >
                <QuickReplies
                  quickReplies={message.quick_replies}
                  disabled={!enableComponents(message)}
                />
              </MessageContainer>
            )}

          {!hasTrailingCard && shouldShowFooterMeta && (
            <MessageMeta
              timestamp={message.timestamp}
              direction={group.direction}
              status={displayMeta?.visibleStatus ?? null}
              showStatus={group.direction === 'outgoing'}
            />
          )}
        </>
      )}

      {message.product_list && (
        <MessageContainer
          className={`weni-messages-list__message weni-messages-list__message--${group.direction} weni-messages-list__message--product-list`}
          direction={group.direction}
          type={message.type}
        >
          <ShowItems
            buttonText={message.product_list.buttonText}
            header={message.header}
            productList={message.product_list}
          />
        </MessageContainer>
      )}

      {hasProductCarousel && (
        <MessageContainer
          className={`weni-messages-list__message weni-messages-list__message--${group.direction} weni-messages-list__message--product-carousel`}
          direction={group.direction}
          type={message.type}
        >
          <ProductCarousel
            productItems={message.product_carousel.product_items}
            disabled={!enableComponents(message)}
          />
        </MessageContainer>
      )}

      {hasTrailingCard && shouldShowFooterMeta && (
        <MessageMeta
          timestamp={message.timestamp}
          direction={group.direction}
          status={displayMeta?.visibleStatus ?? null}
          showStatus={group.direction === 'outgoing'}
        />
      )}
    </Fragment>
  );
}
