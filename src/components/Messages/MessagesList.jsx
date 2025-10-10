import { useRef, useEffect } from 'react';


import MessageAudio from './MessageAudio';
import MessageDocument from './MessageDocument';
import MessageImage from './MessageImage';
import MessageText from './MessageText';
import MessageVideo from './MessageVideo';

import { useWeniChat } from '@/hooks/useWeniChat';

/**
 * MessagesList - Scrollable list of messages
 * TODO: Render all messages with proper message components
 * TODO: Implement auto-scroll to bottom on new messages
 * TODO: Add virtualization for large message lists
 * TODO: Handle loading history on scroll
 * TODO: Show typing indicator
 */
export function MessagesList() {
  const { messages, isTyping } = useWeniChat();
  const messagesEndRef = useRef(null);
  
  // TODO: Auto-scroll to bottom on new messages
  useEffect(() => {
    // messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages]);
  
  // TODO: Handle scroll to load history
  
  const renderMessage = (message, index) => {
    // TODO: Implement proper message type routing
    switch (message.type) {
      case 'text':
        return <MessageText key={index} message={message} />;
      case 'image':
        return <MessageImage key={index} message={message} />;
      case 'video':
        return <MessageVideo key={index} message={message} />;
      case 'audio':
        return <MessageAudio key={index} message={message} />;
      case 'document':
      case 'file':
        return <MessageDocument key={index} message={message} />;
      default:
        return <MessageText key={index} message={message} />;
    }
  };
  
  return (
    <div className="weni-messages-list">
      {/* TODO: Add empty state when no messages */}
      {messages.map(renderMessage)}
      {/* TODO: Add typing indicator component */}
      {isTyping && (
        <div className="weni-typing-indicator">
          {/* TODO: Implement typing animation */}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessagesList;

