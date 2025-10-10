import PropTypes from 'prop-types';

/**
 * MessageAudio - Audio message component
 * TODO: Render audio player with custom controls
 * TODO: Show waveform visualization
 * TODO: Display playback time and duration
 * TODO: Handle audio loading and errors
 * TODO: Add play/pause controls
 */
export function MessageAudio({ message }) {
  // TODO: Implement audio message rendering
  // TODO: Add custom audio player with waveform
  // TODO: Handle loading and error states
  
  return (
    <div className={`weni-message weni-message-${message.sender}`}>
      <div className="weni-message-content weni-message-audio">
        {/* TODO: Create custom audio player */}
        <audio 
          src={message.url}
          controls
          className="weni-message-audio-content"
        >
          Your browser does not support the audio element.
        </audio>
        {/* TODO: Add duration display */}
        {/* TODO: Add timestamp */}
      </div>
    </div>
  );
}

MessageAudio.propTypes = {
  message: PropTypes.shape({
    url: PropTypes.string.isRequired,
    sender: PropTypes.oneOf(['client', 'agent', 'bot']).isRequired,
    duration: PropTypes.number,
    timestamp: PropTypes.number
  }).isRequired
};

export default MessageAudio;

