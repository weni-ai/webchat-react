import { useChatContext } from '@/contexts/ChatContext.jsx';
import { useMemo } from 'react';

/**
 * useWeniChat - Custom hook to access chat functionality
 * 
 * This hook provides:
 * - Access to service state (messages, connection, typing)
 * - UI-specific state (chat open/closed, unread count)
 * - Computed values (sorted messages, message groups)
 * - Helper methods (toggleChat, sendMessage, etc.)
 * 
 * All business logic is handled by WeniWebchatService.
 * This hook only provides conveniences for React components.
 */
export function useWeniChat() {
  const context = useChatContext();

  const sortedMessages = useMemo(() => {
    return [...context.messages].sort((a, b) => a.timestamp - b.timestamp);
  }, [context.messages]);
  
  // Computed: Group sequential messages by direction for better UI
  // Service uses 'direction': 'outgoing' (user) or 'incoming' (agent/bot)
  const messageGroups = useMemo(() => {
    if (sortedMessages.length === 0) return [];
    
    const groups = [];
    let currentGroup = {
      direction: sortedMessages[0].direction,
      messages: [sortedMessages[0]]
    };
    
    for (let i = 1; i < sortedMessages.length; i++) {
      const message = sortedMessages[i];

      if (message.direction === currentGroup.direction) {
        currentGroup.messages.push(message);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          direction: message.direction,
          messages: [message]
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
  };
}

export default useWeniChat;

