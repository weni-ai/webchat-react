import PropTypes from 'prop-types';

/**
 * MessageVideo - Video message component
 * TODO: Render video with native controls
 * TODO: Add poster/thumbnail support
 * TODO: Handle video loading
 * TODO: Add fullscreen support
 * TODO: Handle video playback errors
 */
export function MessageVideo({ message }) {
  // TODO: Implement video message rendering
  // TODO: Add video controls
  // TODO: Handle loading and error states

  return (
    <div className={`weni-message weni-message-${message.sender}`}>
      <div className="weni-message-content weni-message-video">
        {/* TODO: Render video with proper controls */}
        <video
          src={message.url}
          controls
          className="weni-message-video-content"
          poster={message.poster}
        >
          Your browser does not support the video tag.
        </video>
        {/* TODO: Add caption if present */}
        {/* TODO: Add timestamp */}
      </div>
    </div>
  );
}

MessageVideo.propTypes = {
  message: PropTypes.shape({
    url: PropTypes.string.isRequired,
    sender: PropTypes.oneOf(['client', 'agent', 'bot']).isRequired,
    poster: PropTypes.string,
    caption: PropTypes.string,
    timestamp: PropTypes.number,
  }).isRequired,
};

export default MessageVideo;
