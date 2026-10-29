import { useMemo } from 'react';
import PropTypes from 'prop-types';

import { renderMessageMarkdown } from './MessageText';

import './MessageImage.scss';

function visibleCaption(caption) {
  if (typeof caption !== 'string') return '';
  return caption.trim();
}

function captionToHtml(caption) {
  try {
    return renderMessageMarkdown(caption);
  } catch {
    return '';
  }
}

/**
 * MessageImage - Image message component
 * TODO: Handle image errors
 */
export function MessageImage({ message }) {
  const caption = visibleCaption(message.caption);
  const captionHtml = useMemo(
    () => (caption ? captionToHtml(caption) : ''),
    [caption],
  );

  return (
    <section className="weni-message-image-block">
      <a
        href={message.media}
        target="_blank"
        rel="noopener noreferrer"
        className="weni-message-image__link"
      >
        <img
          src={message.media}
          alt={caption || 'Image'}
          className="weni-message-image"
        />
      </a>
      {captionHtml ? (
        <section
          className={`weni-message-text weni-message-text--${message.direction}`}
          dangerouslySetInnerHTML={{ __html: captionHtml }}
        />
      ) : null}
    </section>
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
    metadata: PropTypes.object,
  }).isRequired,
};

export default MessageImage;
