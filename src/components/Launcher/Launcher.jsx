import { useState } from 'react';
import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';

import Badge from '@/components/common/Badge';
import { Icon } from '@/components/common/Icon';
import Avatar from '@/components/common/Avatar';
import { Tooltip } from '@/components/Tooltip/Tooltip';

import { useChatContext } from '@/contexts/ChatContext';

import './Launcher.scss';

/**
 * Launcher - Chat launcher button
 * TODO: Add unread count badge
 * TODO: Add dinamically image url as Icon
 */
export function Launcher() {
  const { isChatOpen, unreadCount, toggleChat } = useWeniChat();

  const { config, title, tooltipMessage, clearTooltipMessage } =
    useChatContext();
  const [isHovering, setIsHovering] = useState(false);

  return (
    <section className="weni-launcher__container">
      <button
        className={`weni-launcher ${isHovering ? 'weni-launcher--hovering' : ''} ${!isHovering ? 'weni-launcher--out-hovering' : ''}`}
        onClick={toggleChat}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        aria-label="Toggle chat"
      >
        {config.profileAvatar && !isChatOpen ? (
          <Avatar
            className={`${isChatOpen ? 'weni-launcher-icon--click-open' : 'weni-launcher-icon--click-close'}`}
            src={config.profileAvatar}
            size="full"
          />
        ) : (
          <Icon
            className={`${isChatOpen ? 'weni-launcher-icon--click-open' : 'weni-launcher-icon--click-close'}`}
            name={isChatOpen ? 'close' : 'chat_bubble'}
            filled
            color="white"
            size="x-large"
          />
        )}
      </button>

      <Badge
        isVisible={config.displayUnreadCount && !isChatOpen && unreadCount > 0}
        count={unreadCount}
        className="weni-launcher__badge"
      />

      {tooltipMessage && (
        <Tooltip
          name={title}
          message={tooltipMessage}
          onClose={clearTooltipMessage}
        />
      )}
    </section>
  );
}

Launcher.propTypes = {
  position: PropTypes.oneOf([
    'bottom-right',
    'bottom-left',
    'top-right',
    'top-left',
  ]),
};

export default Launcher;
