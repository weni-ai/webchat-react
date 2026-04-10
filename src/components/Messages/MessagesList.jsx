import { useRef, useEffect } from 'react';

import MessageContainer from './MessageContainer';
import MessageAudio from './MessageAudio';
import MessageDocument from './MessageDocument';
import MessageImage from './MessageImage';
import MessageOrder from './MessageOrder';
import MessageText from './MessageText';
import MessageVideo from './MessageVideo';
import TypingIndicator from './TypingIndicator';
import Icon from '@/components/common/Icon';
import PropTypes from 'prop-types';
import { ChatPresentation } from '@/components/Chat/ChatPresentation';

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';
import { useConversationStarters } from '@/contexts/ConversationStartersContext';
import { ConversationStartersFull } from '@/components/ConversationStarters/ConversationStarters';
import { ShowItems } from './TextComponents/ShowItems';
import { FSBadge } from '../common/FSBadge';

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
  const { isVoiceModeActive, voicePartialTranscript } =
    useChatContext();
  const { questions, isInChatStartersDismissed, handleFullStarterClick } =
    useConversationStarters();
  const messagesEndRef = useRef(null);
  const showConversationStartersFull =
    questions.length > 0 && !isInChatStartersDismissed;

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
      {/* TODO: Add empty state when no messages */}

      <ChatPresentation />

      {messageGroups.map((group, index) => (
        <section
          className={`
            weni-messages-list__direction-group 
            weni-messages-list__direction-group--${group.direction} 
            weni-messages-list__direction-group--${group.direction}-without-avatar'
            ${group.messages.some((message) => message.type === 'conversation_status') ? 'weni-messages-list__group--with-conversation-status' : ''}
          `}
          key={index}
        >
          {group.messages.map((message, messageIndex) => (
            renderMessage(group, message, messageIndex, enableComponents)
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
            weni-messages-list__direction-group--incoming-without-avatar
          `}
        >
          <MessageContainer
            className="weni-messages-list__message weni-messages-list__message--incoming"
            direction="incoming"
            type="typing"
          >
            <TypingIndicator />
          </MessageContainer>
        </section>
      )}

      {showConversationStartersFull && (
        <ConversationStartersFull
          questions={questions}
          onStarterClick={handleFullStarterClick}
        />
      )}

      <div ref={messagesEndRef} />
    </section>
  );
}

export default MessagesList;

function renderMessage(group, message, messageIndex, enableComponents) {
  switch (message.type) {
    case 'conversation_status':
      return (
        <section className="weni-messages-list__conversation-status" key={`${message.id || messageIndex}-conversation-status`}>
          <FSBadge type={message.statusType}>{message.text}</FSBadge>
        </section>
      );
    default:
      return (
        <>
          <MessageContainer
            className={`weni-messages-list__message weni-messages-list__message--${group.direction}`}
            direction={group.direction}
            type={message.type}
            key={`${message.id || messageIndex}-message-container`}
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

          {message.product_list && (
            <MessageContainer
              className={`weni-messages-list__message weni-messages-list__message--${group.direction} weni-messages-list__message--product-list`}
              direction={group.direction}
              type={message.type}
              key={`${message.id || messageIndex}-product-list`}
            >
              <ShowItems
                buttonText={message.product_list.buttonText}
                header={message.header}
                productList={message.product_list}
              />
            </MessageContainer>
          )}
        </>
      );
  }
}
