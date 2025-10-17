import PropTypes from 'prop-types';

/**
 * MessageDocument - Document/File message component
 * TODO: Display file icon based on type
 * TODO: Show file name and size
 * TODO: Add download button
 * TODO: Handle file preview for supported types
 * TODO: Show upload progress for outgoing files
 */
export function MessageDocument({ message }) {
  // TODO: Implement document message rendering
  // TODO: Add file type icons
  // TODO: Handle download action
  
  return (
    <div className={`weni-message weni-message-${message.sender}`}>
      <div className="weni-message-content weni-message-document">
        {/* TODO: Add file icon based on type */}
        <div className="weni-message-document-info">
          <span className="weni-message-document-name">{message.fileName}</span>
          {/* TODO: Display file size */}
        </div>
        {/* TODO: Add download button */}
        <a 
          href={message.url} 
          download={message.fileName}
          className="weni-message-document-download"
        >
          Download
        </a>
        {/* TODO: Add timestamp */}
      </div>
    </div>
  );
}

MessageDocument.propTypes = {
  message: PropTypes.shape({
    url: PropTypes.string.isRequired,
    fileName: PropTypes.string.isRequired,
    fileSize: PropTypes.number,
    sender: PropTypes.oneOf(['client', 'agent', 'bot']).isRequired,
    timestamp: PropTypes.number
  }).isRequired
};

export default MessageDocument;

