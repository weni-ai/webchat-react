import { useState, useCallback } from 'react';
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
  const {
    isChatOpen,
    unreadCount,
    toggleChat,
    isVoiceModePageActive,
    handleCloseVoiceModePage,
    runVoiceModeEntryFlow,
    isVoiceModeActive,
    isVoiceEnabledByClient,
    isVoiceEnabledByServer,
    isVoiceModeSupported,
  } = useWeniChat();

  const { config, title, tooltipMessage, clearTooltipMessage } =
    useChatContext();
  const [isHovering, setIsHovering] = useState(false);

  const handleChatBubbleClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (isVoiceModePageActive) {
        handleCloseVoiceModePage();
      }
      toggleChat();
    },
    [isVoiceModePageActive, handleCloseVoiceModePage, toggleChat],
  );

  const handleGraphicEqClick = useCallback(
    (e) => {
      e.stopPropagation();

      const canStartVoice =
        isVoiceEnabledByClient &&
        isVoiceEnabledByServer &&
        isVoiceModeSupported &&
        !isVoiceModeActive;

      if (canStartVoice) {
        void runVoiceModeEntryFlow();
      }

      toggleChat();
    },
    [
      isChatOpen,
      isVoiceEnabledByClient,
      isVoiceEnabledByServer,
      isVoiceModeSupported,
      isVoiceModeActive,
      runVoiceModeEntryFlow,
    ],
  );

  return (
    <section className="weni-launcher__container">
      <section
        className={`weni-launcher ${isHovering ? 'weni-launcher--hovering' : ''} ${!isHovering ? 'weni-launcher--out-hovering' : ''} ${!isVoiceEnabledByClient ? 'weni-launcher--as-button' : ''}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={toggleChat}
      >
        {isHovering && isVoiceEnabledByClient ? (
          <>
            <button
              type="button"
              onClick={handleChatBubbleClick}
              aria-label="Toggle chat"
            >
              <Icon
                name="chat_bubble"
                size="medium"
              />
            </button>

            <button
              type="button"
              onClick={handleGraphicEqClick}
              aria-label="Toggle chat"
            >
              <Icon
                name="graphic_eq"
                size="medium"
              />
            </button>
          </>
        ) : config.profileAvatar && !isChatOpen ? (
          <Avatar
            className={`${isChatOpen ? 'weni-launcher-icon--click-open' : 'weni-launcher-icon--click-close'}`}
            src={config.profileAvatar}
            size="full"
          />
        ) : (
          <Icon
            className={`${isChatOpen ? 'weni-launcher-icon--click-open' : 'weni-launcher-icon--click-close'}`}
            name="sparkle"
            filled
            size="x-large"
          />
        )}
      </section>

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
