import PropTypes from 'prop-types';

/**
 * MessageText - Text message component
 * TODO: Render text with proper formatting
 * TODO: Support markdown/links
 * TODO: Add timestamp display
 * TODO: Show message status (sent, delivered, read)
 * TODO: Handle quick replies
 */
export function MessageText({ message }) {
  // TODO: Implement text message rendering
  // TODO: Parse and render links
  // TODO: Support markdown if needed
  
  return (
    <div className={`weni-message weni-message-${message.sender}`}>
      <div className="weni-message-content">
        <p className="weni-message-text">{message.text}</p>
        {/* TODO: Add timestamp */}
        {/* TODO: Add quick replies if present */}
      </div>
    </div>
  );
}

MessageText.propTypes = {
  message: PropTypes.shape({
    text: PropTypes.string.isRequired,
    sender: PropTypes.oneOf(['client', 'agent', 'bot']).isRequired,
    timestamp: PropTypes.number,
    quickReplies: PropTypes.array
  }).isRequired
};

export default MessageText;

