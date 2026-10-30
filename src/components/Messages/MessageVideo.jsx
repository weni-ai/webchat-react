import PropTypes from 'prop-types';

function videoSource(message) {
  if (typeof message.media === 'string' && message.media.length > 0) {
    return message.media;
  }

  if (typeof message.url === 'string' && message.url.length > 0) {
    return message.url;
  }

  return undefined;
}

/**
 * MessageVideo - Video message component
 */
export function MessageVideo({ message }) {
  const src = videoSource(message);

  return (
    <div
      className={`weni-message weni-message-${message.direction || 'outgoing'}`}
    >
      <div className="weni-message-content weni-message-video">
        <video
          src={src}
          controls
          className="weni-message-video-content"
          poster={message.poster}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

MessageVideo.propTypes = {
  message: PropTypes.shape({
    media: PropTypes.string,
    url: PropTypes.string,
    direction: PropTypes.oneOf(['outgoing', 'incoming']),
    sender: PropTypes.string,
    poster: PropTypes.string,
    caption: PropTypes.string,
    timestamp: PropTypes.number,
  }).isRequired,
};

export default MessageVideo;
