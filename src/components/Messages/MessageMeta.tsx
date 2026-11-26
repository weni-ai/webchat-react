import { useTranslation } from 'react-i18next';

import Icon from '@/components/common/Icon';
import {
  formatMessageTimestamp,
  STATUS_META_MAP,
  type ShopperMessageStatus,
} from '@/utils/humanSupportStatus';

import './MessageMeta.scss';

export interface MessageMetaProps {
  timestamp?: number;
  direction: 'incoming' | 'outgoing';
  status?: ShopperMessageStatus | null;
  showStatus?: boolean;
}

export function MessageMeta({
  timestamp,
  direction,
  status = null,
  showStatus = false,
}: MessageMetaProps) {
  const { t, i18n } = useTranslation();
  const formattedTime = formatMessageTimestamp(timestamp, i18n?.language);
  const descriptor =
    showStatus && status && STATUS_META_MAP[status]
      ? STATUS_META_MAP[status]
      : null;

  if (!formattedTime && !descriptor) {
    return null;
  }

  const ariaLabel = descriptor
    ? descriptor.includesTime && formattedTime
      ? t(descriptor.ariaLabelKey, { time: formattedTime })
      : t(descriptor.ariaLabelKey)
    : undefined;

  return (
    <footer className={`weni-message-meta weni-message-meta--${direction}`}>
      {formattedTime && (
        <time className="weni-message-meta__time">{formattedTime}</time>
      )}

      {descriptor && (
        <span
          className={`weni-message-meta__status weni-message-meta__status--${status}`}
          role="img"
          aria-label={ariaLabel}
        >
          <Icon
            name={descriptor.icon}
            size="small"
            color={descriptor.color}
            aria-hidden="true"
          />
        </span>
      )}
    </footer>
  );
}

export default MessageMeta;
