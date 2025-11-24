import PropTypes from 'prop-types';

import { ALLOWED_DOCUMENT_TYPES } from '@/utils/constants';

import { Icon } from '@/components/common/Icon';

import './MessageDocument.scss';

/**
 * MessageDocument - Document/File message component
 */
export function MessageDocument({ message }) {
  const { filename, mimeType } = message.metadata;

  const canViewDocument = () => {
    const fileType = mimeType;
    return ALLOWED_DOCUMENT_TYPES.includes(fileType);
  };

  const handleViewDocument = () => {
    if (canViewDocument()) {
      // For base64 data URLs, create a blob and open it
      if (message.media.startsWith('data:')) {
        const byteCharacters = atob(message.media.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        window.open(blobUrl, '_blank');

        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        window.open(message.media, '_blank');
      }
    }
  };

  return (
    <section className="weni-message-document">
      <Icon
        name="article"
        size="large"
        color={message.direction === 'outgoing' ? 'white' : 'fg-emphasized'}
      />

      <button
        onClick={handleViewDocument}
        className={`weni-message-document__view weni-message-document__view--${message.direction}`}
      >
        {filename}
      </button>
    </section>
  );
}

MessageDocument.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
    media: PropTypes.string.isRequired,
    timestamp: PropTypes.number.isRequired,
    status: PropTypes.string,
    metadata: {
      mimeType: PropTypes.string.isRequired,
      size: PropTypes.number.isRequired,
      filename: PropTypes.string.isRequired,
    },
  }).isRequired,
};

export default MessageDocument;
