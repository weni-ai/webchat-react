import { useRef, useEffect } from 'react';


import MessageContainer from './MessageContainer';
import MessageAudio from './MessageAudio';
import MessageDocument from './MessageDocument';
import MessageImage from './MessageImage';
import MessageText from './MessageText';
import MessageVideo from './MessageVideo';
import Avatar from '@/components/common/Avatar'

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';

import './MessagesList.scss';

/**
 * MessagesList - Scrollable list of messages
 * TODO: Render all messages with proper message components
 * TODO: Implement auto-scroll to bottom on new messages
 * TODO: Add virtualization for large message lists
 * TODO: Handle loading history on scroll
 * TODO: Show typing indicator
 */
export function MessagesList() {
  const { isTyping, messageGroups, isChatOpen } = useWeniChat();
  const { config } = useChatContext();
  const messagesEndRef = useRef(null);

  function scrollToBottom(behavior = 'smooth') {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messageGroups]);

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom('instant')
    }, 50);
  }, [isChatOpen]);

  // TODO: Handle scroll to load history

  const enableComponents = (message) => {
    const isMessageInLastGroup = messageGroups.at(-1)?.messages.some(m => m.id === message.id);
    return message.direction === 'incoming' && isMessageInLastGroup;
  };

  const renderMessage = (message) => {
    // TODO: Implement proper message type routing
    switch (message.type) {
      case 'text':
      case 'message':
        return <MessageText message={message} componentsEnabled={enableComponents(message)}/>;
      case 'image':
        return <MessageImage message={message} />;
      case 'video':
        return <MessageVideo message={message} />;
      case 'audio':
        return <MessageAudio message={message} />;
      case 'document':
      case 'file':
        return <MessageDocument message={message} />;
      default:
        return <MessageText message={message} componentsEnabled={enableComponents(message)}/>;
    }
  };

  return (
    <section className="weni-messages-list">
      {/* TODO: Add empty state when no messages */}
      {messageGroups.map((group, index) => (
        <section 
          className={`weni-messages-list__direction-group weni-messages-list__direction-group--${group.direction}`} 
          key={index}
        >
          {group.direction === 'incoming' && (
            <Avatar src={config.profileAvatar} name={config.title} />
          )}
          {group.messages.map((message, messageIndex) => (
            <MessageContainer 
              className={`weni-messages-list__message weni-messages-list__message--${group.direction}`} 
              direction={group.direction}
              type={message.type}
              key={message.id || messageIndex}
            >
              {renderMessage(message)}
            </MessageContainer>
          ))}
        </section>
      ))}
      {/* TODO: Add typing indicator component */}
      {isTyping && (
        <div className="weni-typing-indicator">
          {/* TODO: Implement typing animation */}
        </div>
      )}
      <div ref={messagesEndRef} />
    </section>
  );
}

export default MessagesList;

