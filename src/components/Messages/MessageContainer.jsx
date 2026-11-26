import PropTypes from 'prop-types';

import './MessageContainer.scss';

export function MessageContainer({
  direction,
  children,
  type,
  className = '',
  authorName,
}) {
  return (
    <section
      className={`weni-message weni-message--${direction} weni-message--${type} ${className}`}
    >
      {authorName && (
        <span className="weni-message__author-name">{authorName}</span>
      )}
      {children}
    </section>
  );
}

MessageContainer.propTypes = {
  direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf([
    'message',
    'text',
    'image',
    'video',
    'audio',
    'document',
    'file',
    'order',
    'typing',
    'interactive',
  ]).isRequired,
  className: PropTypes.string,
  authorName: PropTypes.string,
};

export default MessageContainer;
