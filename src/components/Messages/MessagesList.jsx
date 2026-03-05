import { useRef, useEffect } from 'react';

import MessageContainer from './MessageContainer';
import MessageAudio from './MessageAudio';
import MessageDocument from './MessageDocument';
import MessageImage from './MessageImage';
import MessageOrder from './MessageOrder';
import MessageText from './MessageText';
import MessageVideo from './MessageVideo';
import TypingIndicator from './TypingIndicator';
import Avatar from '@/components/common/Avatar';
import Icon from '@/components/common/Icon';
import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';

import './MessagesList.scss';

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

export function MessagesList() {
  const { isTyping, isThinking, messageGroups, isChatOpen } = useWeniChat();
  const { config, isVoiceModeActive, voicePartialTranscript } =
    useChatContext();
  const messagesEndRef = useRef(null);

  function scrollToBottom(behavior = 'smooth') {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messageGroups, isThinking, voicePartialTranscript]);

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom('instant');
    }, 50);
  }, [isChatOpen]);

  const enableComponents = (message) => {
    const isMessageInLastGroup = messageGroups
      .at(-1)
      ?.messages.some((m) => m.id === message.id);
    return message.direction === 'incoming' && isMessageInLastGroup;
  };

  return (
    <section className="weni-messages-list">
      {messageGroups.map((group, index) => (
        <section
          className={`
            weni-messages-list__direction-group 
            weni-messages-list__direction-group--${group.direction} 
            weni-messages-list__direction-group--${group.direction}-${config.showChatAvatar ? 'with' : 'without'}-avatar'
          `}
          key={index}
        >
          {group.direction === 'incoming' && config.showChatAvatar && (
            <Avatar
              src={config.profileAvatar}
              name={config.title}
            />
          )}
          {group.messages.map((message, messageIndex) => (
            <MessageContainer
              className={`weni-messages-list__message weni-messages-list__message--${group.direction}`}
              direction={group.direction}
              type={message.type}
              key={message.id || messageIndex}
            >
              <Message
                message={message}
                componentsEnabled={enableComponents(message)}
              />

              {message.status === 'pending' && (
                <Icon
                  name="schedule"
                  size="small"
                  color="fg-muted"
                />
              )}

              {message.status === 'error' && (
                <Icon
                  name="error"
                  size="small"
                  color="fg-critical"
                />
              )}
            </MessageContainer>
          ))}
        </section>
      ))}

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

      {(isTyping || isThinking) && (
        <section
          className={`
            weni-messages-list__direction-group
            weni-messages-list__direction-group--incoming
            weni-messages-list__direction-group--incoming-${config.showChatAvatar ? 'with' : 'without'}-avatar
          `}
        >
          {config.showChatAvatar && (
            <Avatar
              src={config.profileAvatar}
              name={config.title}
            />
          )}
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
