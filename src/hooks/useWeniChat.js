import { useChatContext } from '@/contexts/ChatContext.jsx';
import { useMemo } from 'react';

/**
 * useWeniChat - Custom hook to access chat functionality
 *
 * This hook provides:
 * - Access to service state (messages, connection, typing)
 * - UI-specific state (chat open/closed, unread count)
 * - Computed values (sorted messages; one group per message for layout)
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

  // One group per message — no batching by direction or type (keeps shape for UI)
  const messageGroups = useMemo(
    () =>
      sortedMessages.map((message) => ({
        direction: message.direction,
        messages: [message],
      })),
    [sortedMessages],
  );

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
