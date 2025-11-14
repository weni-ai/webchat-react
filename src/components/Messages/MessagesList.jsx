import { useRef, useEffect } from 'react';


import MessageContainer from './MessageContainer';
import MessageAudio from './MessageAudio';
import MessageDocument from './MessageDocument';
import MessageImage from './MessageImage';
import MessageText from './MessageText';
import MessageVideo from './MessageVideo';
import TypingIndicator from './TypingIndicator';
import Avatar from '@/components/common/Avatar'
import Icon from '@/components/common/Icon';
import { MessageButton } from '@/components/common/MessageButton';

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';

import './MessagesList.scss';

export function Message({ message, componentsEnabled }) {
  switch (message.type) {
    case 'text':
    case 'message':
      return <MessageText message={message} componentsEnabled={componentsEnabled}/>;
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
      return <MessageText message={message} componentsEnabled={componentsEnabled}/>;
  }
};

function QuickRepliesWhatsApp({ enableComponents }) {
  const { sendMessage, setCurrentPage } = useWeniChat();

  return (
    <>
      <MessageButton
        className="weni-messages-list__message--incoming"
        disabled={!enableComponents}
        onClick={() => sendMessage('Option 1')}
      >
        Option 1
      </MessageButton>

      <MessageButton
        className="weni-messages-list__message--incoming"
        alignContent="center"
        onClick={() => setCurrentPage({
          name: 'quick-replies',
          goBack: () => setCurrentPage(null),
          props: {
            options: ['Option 1', 'Option 2', 'Option 3'],
          },
        })}
        disabled={!enableComponents}
      >
        <Icon name="list" size="medium" />
        Menu
      </MessageButton>
    </>
  );
}

/**
 * MessagesList - Scrollable list of messages
 * TODO: Render all messages with proper message components
 * TODO: Add virtualization for large message lists
 * TODO: Handle loading history on scroll
 */
export function MessagesList() {
  const { isTyping, isThinking, messageGroups, isChatOpen } = useWeniChat();
  const { config } = useChatContext();
  const messagesEndRef = useRef(null);

  function scrollToBottom(behavior = 'smooth') {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messageGroups, isThinking]);

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
            <>
              <MessageContainer
                className={`weni-messages-list__message weni-messages-list__message--${group.direction}`} 
                direction={group.direction}
                type={message.type}
                key={message.id || messageIndex}
              >
                <Message message={message} componentsEnabled={enableComponents(message)} />

                {message.status === 'pending' && (
                  <Icon name="access_time" size="small" color="fg-muted" />
                )}

                {message.status === 'error' && (
                  <Icon name="error" size="small" color="fg-critical" />
                )}
              </MessageContainer>

              <section className={`weni-messages-list__message-appendages weni-messages-list__message-appendages--${group.direction}`}>
                <QuickRepliesWhatsApp
                  enableComponents={enableComponents(message)}
                />
              </section>
            </>
          ))}
        </section>
      ))}

      {(isTyping || isThinking) && (
        <section className="weni-messages-list__direction-group weni-messages-list__direction-group--incoming">
          <Avatar src={config.profileAvatar} name={config.title} />
          <MessageContainer 
            className="weni-messages-list__message weni-messages-list__message--incoming" 
            direction="incoming"
            type="typing"
          >
            <TypingIndicator />
          </MessageContainer>
        </section>
      )}
      
      <div ref={messagesEndRef} />
    </section>
  );
}

export default MessagesList;

