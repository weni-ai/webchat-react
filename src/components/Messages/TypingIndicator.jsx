import PropTypes from 'prop-types';

import './TypingIndicator.scss';

/**
 * TypingIndicator - Shows animated typing indicator when an agent is typing.
 * Displays three animated dots, optionally paired with a human-agent label
 * in the Stage 3 Figma horizontal layout.
 */
export function TypingIndicator({ label }) {
  const CLASS_DOT = 'weni-typing-indicator__dot';

  if (label) {
    return (
      <section className="weni-typing-indicator weni-typing-indicator--with-label">
        <span className="weni-typing-indicator__bubble">
          <span className={CLASS_DOT} />
          <span className={CLASS_DOT} />
          <span className={CLASS_DOT} />
        </span>
        <span className="weni-typing-indicator__label">{label}</span>
      </section>
    );
  }

  return (
    <section className="weni-typing-indicator">
      <span className={CLASS_DOT} />
      <span className={CLASS_DOT} />
      <span className={CLASS_DOT} />
    </section>
  );
}

TypingIndicator.propTypes = {
  label: PropTypes.string,
};

export default TypingIndicator;
