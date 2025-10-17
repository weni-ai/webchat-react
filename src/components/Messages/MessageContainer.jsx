import PropTypes from 'prop-types';

import ThinkingIndicator from './ThinkingIndicator';
import { useWeniChat } from '@/hooks/useWeniChat';

import './MessageContainer.scss';

export function MessageContainer({ direction, children, type, className }) {
  const { isThinking } = useWeniChat();

  return (
    <section className={`weni-message weni-message--${direction} weni-message--${type} ${className}`}>
      {children}
      {type === 'typing' && isThinking && <ThinkingIndicator className='weni-message__thinking-indicator' />}
    </section>
  );
}

MessageContainer.propTypes = {
  direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['message', 'text', 'image', 'video', 'audio', 'document', 'file', 'typing']).isRequired,
  className: PropTypes.string,
};

export default MessageContainer;