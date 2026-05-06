import PropTypes from 'prop-types';

import { ALLOWED_DOCUMENT_TYPES } from '@/utils/constants';

import { Icon } from '@/components/common/Icon';

import './MessageDocument.scss';

const EXTENSION_TO_MIME = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
};

function mimeTypeFromUrl(url) {
  if (!url) return undefined;
  try {
    const ext = new URL(url).pathname.split('.').pop().toLowerCase();
    return EXTENSION_TO_MIME[ext];
  } catch {
    return undefined;
  }
}

/**
 * MessageDocument - Document/File message component
 */
export function MessageDocument({ message }) {
  const { filename, mimeType: metaMimeType } = message.metadata ?? {};
  const mimeType = metaMimeType ?? mimeTypeFromUrl(message.media);
  const label = filename || message.caption || 'file';

  const canViewDocument = () => {
    return ALLOWED_DOCUMENT_TYPES.includes(mimeType);
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
        {label}
      </button>
    </section>
  );
}

MessageDocument.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
    media: PropTypes.string.isRequired,
    caption: PropTypes.string,
    timestamp: PropTypes.number.isRequired,
    status: PropTypes.string,
    metadata: PropTypes.shape({
      mimeType: PropTypes.string,
      size: PropTypes.number,
      filename: PropTypes.string,
    }),
  }).isRequired,
};

export default MessageDocument;
