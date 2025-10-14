import PropTypes from 'prop-types';

import './MessageContainer.scss';

export function MessageContainer({ direction, children, type, className }) {

  return (
    <section className={`weni-message weni-message--${direction} weni-message--${type} ${className}`}>
      {children}
    </section>
  );
}

MessageContainer.propTypes = {
  direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['message', 'text', 'image', 'video', 'audio', 'document', 'file']).isRequired,
  className: PropTypes.string,
};

export default MessageContainer;