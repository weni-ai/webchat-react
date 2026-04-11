import { useChatContext } from '@/contexts/ChatContext.jsx';
import { useMemo } from 'react';

/**
 * useWeniChat - Custom hook to access chat functionality
 *
 * This hook provides:
 * - Access to service state (messages, connection, typing)
 * - UI-specific state (chat open/closed, unread count)
 * - Computed values (sorted messages; messageGroups merge consecutive
 *   messages with same direction and same type)
 * - Helper methods (toggleChat, sendMessage, etc.)
 *
 * All business logic is handled by WeniWebchatService.
 * This hook only provides conveniences for React components.
 */
export function useWeniChat() {
  const context = useChatContext();

  const currentPage = useMemo(() => {
    if (!context.currentPage) return null;
    return context.currentPage;
  }, [context.currentPage]);

  const sortedMessages = useMemo(() => {
    return [...context.messages].sort((a, b) => a.timestamp - b.timestamp);
  }, [context.messages]);

  const messageGroups = useMemo(() => {
    if (sortedMessages.length === 0) return [];

    const groups = [];
    let currentGroup = {
      direction: sortedMessages[0].direction,
      messages: [sortedMessages[0]],
    };

    for (let i = 1; i < sortedMessages.length; i++) {
      const message = sortedMessages[i];
      const last = currentGroup.messages[currentGroup.messages.length - 1];
      const sameBlock =
        message.direction === last.direction && message.type === last.type;

      if (sameBlock) {
        currentGroup.messages.push(message);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          direction: message.direction,
          messages: [message],
        };
      }
    }

    groups.push(currentGroup);
    return groups;
  }, [sortedMessages]);

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
    isConnectionClosed: context.isConnectionClosed,
    connect: context.connect,
    currentPage,
    setCurrentPage: context.setCurrentPage,
    goBack: context.goBack,
    clearPageHistory: context.clearPageHistory,
  };
}

export default useWeniChat;
