import PropTypes from 'prop-types';

/**
 * MessageImage - Image message component
 * TODO: Render image with lightbox support
 * TODO: Add loading state
 * TODO: Handle image errors
 * TODO: Add caption support
 * TODO: Implement zoom/preview functionality
 */
export function MessageImage({ message }) {
  // TODO: Implement image message rendering
  // TODO: Add lightbox functionality
  // TODO: Handle loading and error states
  
  return (
    <div className={`weni-message weni-message-${message.sender}`}>
      <div className="weni-message-content weni-message-image">
        {/* TODO: Render image with proper handling */}
        <img 
          src={message.url} 
          alt={message.caption || 'Image'}
          className="weni-message-image-content"
        />
        {/* TODO: Add caption if present */}
        {/* TODO: Add timestamp */}
      </div>
    </div>
  );
}

MessageImage.propTypes = {
  message: PropTypes.shape({
    url: PropTypes.string.isRequired,
    sender: PropTypes.oneOf(['client', 'agent', 'bot']).isRequired,
    caption: PropTypes.string,
    timestamp: PropTypes.number
  }).isRequired
};

export default MessageImage;

