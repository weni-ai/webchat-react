import PropTypes from 'prop-types';

import './MessageImage.scss';

/**
 * MessageImage - Image message component
 * TODO: Handle image errors
 */
export function MessageImage({ message }) {
  return (
    <img 
      src={message.media}
      alt={message.caption || 'Image'}
      className="weni-message-image"
    />
  );
}

MessageImage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    media: PropTypes.string.isRequired,
    direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
    caption: PropTypes.string,
    timestamp: PropTypes.number.isRequired,
    status: PropTypes.string,
    metadata: PropTypes.object
  }).isRequired
};

export default MessageImage;

