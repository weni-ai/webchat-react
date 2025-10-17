import PropTypes from 'prop-types';

import './MessageContainer.scss';

export function MessageContainer({ direction, children, className }) {

  return (
    <section className={`weni-message weni-message--${direction} ${className}`}>
      {children}
    </section>
  );
}

MessageContainer.propTypes = {
  direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default MessageContainer;