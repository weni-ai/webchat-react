import { useChatContext } from '@/contexts/ChatContext.jsx';

/**
 * useWeniChat - Custom hook to access chat functionality
 * TODO: Add computed values and derived state
 * TODO: Add helper methods for common operations
 * TODO: Add memoization for expensive operations
 */
export function useWeniChat() {
  const context = useChatContext();
  
  // TODO: Add computed values
  // const sortedMessages = useMemo(() => ..., [context.messages])
  
  // TODO: Add helper methods
  const toggleChat = () => {
    context.setIsChatOpen(!context.isChatOpen);
    if (!context.isChatOpen) {
      context.setUnreadCount(0);
    }
  };
  
  return {
    ...context,
    toggleChat
    // TODO: Expose more helper methods
  };
}

export default useWeniChat;

