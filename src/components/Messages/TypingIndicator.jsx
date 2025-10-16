import PropTypes from 'prop-types';

import './TypingIndicator.scss';

/**
 * TypingIndicator - Shows animated typing indicator when user is typing
 * Displays three animated dots to indicate that someone is typing
 */
export function TypingIndicator({ className }) {

  const CLASS_DOT = 'weni-typing-indicator__dot';

  return (
    <section className={`weni-typing-indicator ${className || ''}`}>
      <span className={CLASS_DOT} />
      <span className={CLASS_DOT} />
      <span className={CLASS_DOT} />
    </section>
  );
}

TypingIndicator.propTypes = {
  className: PropTypes.string,
};

export default TypingIndicator;
