import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { marked } from 'marked';

import { ListMessage } from './TextComponents/ListMessage';
import { CallToAction } from './TextComponents/CallToAction';
import { useStreamingBuffer } from '@/hooks/useStreamingBuffer';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

import './MessageText.scss';

const STREAMING_CARET = '<span class="weni-message-text__caret"></span>';
const TEXT_CONTAINER_CLOSE = /<\/(p|li|h[1-6]|td|th|dd|code)>/gi;

/**
 * marked wraps streamed text in block elements (`<p>`, `<li>`, …).
 * A caret placed after that markup is a sibling of the block and drops
 * onto the next line. Insert it before the last text-container close tag
 * so it stays at the end of the words revealed so far.
 */
export function appendStreamingCaret(html) {
  if (!html) return STREAMING_CARET;

  const matches = [...html.matchAll(TEXT_CONTAINER_CLOSE)];
  const last = matches[matches.length - 1];
  if (!last) return `${html}${STREAMING_CARET}`;

  const index = last.index;
  return `${html.slice(0, index)}${STREAMING_CARET}${html.slice(index)}`;
}

/**
 * Parses message text the same way a text bubble does: bullet normalization,
 * markdown with line breaks, then sanitization. Does not add the streaming caret.
 */
export function renderMessageMarkdown(text) {
  if (!text) return '';

  marked.use({
    breaks: true,
    useNewRenderer: true,
    renderer: {
      link(token) {
        if (typeof token === 'string' && token.includes('mailto:')) {
          return token.replace('mailto:', '');
        }
        return `<a target="_blank" href="${token.href || token}">${token.text || token}</a>`;
      },
    },
  });

  const processedContent = text
    .replace(/\n•\s*/g, '\n* ')
    .replace(/^•\s*/g, '* ');

  return sanitizeHtml(marked.parse(processedContent));
}

/**
 * MessageText - Text message component with markdown support
 * Renders text with proper formatting, links, and markdown syntax
 * TODO: Add timestamp display
 * TODO: Show message status (sent, delivered, read)
 */
export function MessageText({
  message,
  componentsEnabled,
  displayedText: externalDisplayedText,
  isBuffering: externalIsBuffering,
  renderListSlot,
  renderCtaSlot,
}) {
  const hasExternalBuffer =
    externalDisplayedText !== undefined || externalIsBuffering !== undefined;

  const internalBuffer = useStreamingBuffer({
    text: hasExternalBuffer ? '' : message.text,
    isStreaming: hasExternalBuffer ? false : message.status === 'streaming',
  });

  const displayedText = hasExternalBuffer
    ? (externalDisplayedText ?? '')
    : internalBuffer.displayedText;
  const isBuffering = hasExternalBuffer
    ? Boolean(externalIsBuffering)
    : internalBuffer.isBuffering;

  const html = useMemo(() => {
    if (!displayedText && !isBuffering) return '';

    const purifiedHtml = renderMessageMarkdown(displayedText);

    return isBuffering ? appendStreamingCaret(purifiedHtml) : purifiedHtml;
  }, [displayedText, isBuffering]);

  const listNode =
    renderListSlot !== undefined
      ? renderListSlot
      : message.list_message && (
          <ListMessage
            buttonText={message.list_message.button_text}
            items={message.list_message.list_items}
            disabled={!componentsEnabled}
          />
        );

  const ctaNode =
    renderCtaSlot !== undefined
      ? renderCtaSlot
      : message.cta_message && (
          <CallToAction
            buttonText={message.cta_message.display_text}
            url={message.cta_message.url}
            disabled={!componentsEnabled}
          />
        );

  const hasComponentSlot = Boolean(listNode || ctaNode);
  const shouldRenderTextSection = Boolean(html) || !hasComponentSlot;

  return (
    <>
      {shouldRenderTextSection && (
        <section
          className={`weni-message-text weni-message-text--${message.direction}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {listNode}

      {ctaNode}
    </>
  );
}

MessageText.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    timestamp: PropTypes.number.isRequired,
    direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
    status: PropTypes.string,
    streamPhase: PropTypes.oneOf([
      'streaming_text',
      'awaiting_components',
      'completed',
    ]),
    componentHints: PropTypes.arrayOf(
      PropTypes.shape({
        componentType: PropTypes.oneOf([
          'list_message',
          'cta_message',
          'quick_replies',
        ]).isRequired,
        labels: PropTypes.arrayOf(PropTypes.string),
        count: PropTypes.number,
        itemCount: PropTypes.number,
      }),
    ),
    metadata: PropTypes.object,
    header: PropTypes.string,
    list_message: PropTypes.shape({
      button_text: PropTypes.string.isRequired,
      list_items: PropTypes.array.isRequired,
      item_count: PropTypes.number,
    }),
    cta_message: PropTypes.shape({
      url: PropTypes.string.isRequired,
      display_text: PropTypes.string.isRequired,
    }),
    product_list: PropTypes.shape({
      text: PropTypes.string,
      buttonText: PropTypes.string.isRequired,
      sections: PropTypes.arrayOf(
        PropTypes.shape({
          title: PropTypes.string.isRequired,
          product_items: PropTypes.arrayOf(
            PropTypes.shape({
              product_retailer_id: PropTypes.string.isRequired,
              name: PropTypes.string.isRequired,
              price: PropTypes.string.isRequired,
              sale_price: PropTypes.string,
              currency: PropTypes.string,
              image: PropTypes.string.isRequired,
              description: PropTypes.string,
              seller_id: PropTypes.string,
            }),
          ).isRequired,
        }),
      ).isRequired,
    }),
    product_carousel: PropTypes.shape({
      text: PropTypes.string,
      product_items: PropTypes.arrayOf(
        PropTypes.shape({
          product_retailer_id: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
          price: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
            .isRequired,
          image: PropTypes.string.isRequired,
          sale_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          currency: PropTypes.string,
          description: PropTypes.string,
          seller_id: PropTypes.string,
          product_url: PropTypes.string,
        }),
      ),
    }),
  }).isRequired,
  componentsEnabled: PropTypes.bool,
  displayedText: PropTypes.string,
  isBuffering: PropTypes.bool,
  renderListSlot: PropTypes.node,
  renderCtaSlot: PropTypes.node,
};

export default MessageText;
