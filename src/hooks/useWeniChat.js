import { useChatContext } from '@/contexts/ChatContext.jsx';
import { groupMessagesByAuthor } from '@/utils/humanSupportStatus';
import { useMemo } from 'react';

/**
 * useWeniChat - Custom hook to access chat functionality
 *
 * This hook provides:
 * - Access to service state (messages, connection, typing, human support)
 * - UI-specific state (chat open/closed, unread count)
 * - Computed values (sorted messages; messageGroups grouped by author identity
 *   when humanSupportStatus is enabled, or by direction in legacy mode)
 * - Helper methods (toggleChat, sendMessage, etc.)
 *
 * All business logic is handled by WeniWebchatService.
 * This hook only provides conveniences for React components.
 */
export function useWeniChat() {
  const context = useChatContext();
  const isHumanSupportFeatureEnabled = Boolean(
    context.isHumanSupportFeatureEnabled,
  );

  const currentPage = useMemo(() => {
    if (!context.currentPage) return null;
    return context.currentPage;
  }, [context.currentPage]);

  // When humanSupportStatus is enabled, @weni/webchat-service is the single
  // source of truth for server `orderKey` ordering (AD-002 item 4). Re-sorting
  // by client `timestamp` would misplace milestones and pending messages.
  const sortedMessages = useMemo(() => {
    if (isHumanSupportFeatureEnabled) {
      return [...context.messages];
    }
    return [...context.messages].sort((a, b) => a.timestamp - b.timestamp);
  }, [context.messages, isHumanSupportFeatureEnabled]);

  const messageGroups = useMemo(() => {
    if (sortedMessages.length === 0) return [];

    if (isHumanSupportFeatureEnabled) {
      const logContext = {
        channelUuid: context.service?.config?.channelUuid,
        sessionId: context.service?.getSession?.()?.sessionId,
      };
      return groupMessagesByAuthor(sortedMessages, logContext);
    }

    const groups = [];
    let currentGroup = {
      kind: 'messages',
      direction: sortedMessages[0].direction,
      authorKey: null,
      messages: [sortedMessages[0]],
    };

    for (let i = 1; i < sortedMessages.length; i++) {
      const message = sortedMessages[i];
      const last = currentGroup.messages[currentGroup.messages.length - 1];
      const sameBlock = message.direction === last.direction;

      if (sameBlock) {
        currentGroup.messages.push(message);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          kind: 'messages',
          direction: message.direction,
          authorKey: null,
          messages: [message],
        };
      }
    }

    groups.push(currentGroup);
    return groups;
  }, [sortedMessages, isHumanSupportFeatureEnabled, context.service]);

  const toggleChat = () => {
    context.setIsChatOpen(!context.isChatOpen);
    if (!context.isChatOpen) {
      context.setUnreadCount(0);
    }
  };

  return {
    ...context,
    // UI helpers
    toggleChat,
    // Computed values
    sortedMessages,
    messageGroups,
    isHumanSupportFeatureEnabled,
    isHumanSupportActive: Boolean(context.isHumanSupportActive),
    typingAuthor: context.typingAuthor ?? null,
    isConnectionClosed: context.isConnectionClosed,
    connect: context.connect,
    currentPage,
    setCurrentPage: context.setCurrentPage,
    goBack: context.goBack,
    clearPageHistory: context.clearPageHistory,
  };
}

export default useWeniChat;
