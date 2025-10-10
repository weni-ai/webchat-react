import PropTypes from 'prop-types';

import Badge from '@/components/common/Badge';
import { useWeniChat } from '@/hooks/useWeniChat';

/**
 * Launcher - Chat launcher button
 * TODO: Implement launcher button with icon
 * TODO: Add unread count badge
 * TODO: Add open/close animations
 * TODO: Handle click to toggle chat
 */
export function Launcher({ position = 'bottom-right' }) {
  const { isChatOpen, unreadCount, toggleChat } = useWeniChat();
  
  // TODO: Implement launcher visibility logic
  // TODO: Add animations for open/close states
  
  return (
    <div className={`weni-launcher weni-launcher-${position}`}>
      <button 
        className="weni-launcher-button"
        onClick={toggleChat}
        aria-label="Toggle chat"
      >
        {/* TODO: Add launcher icon */}
        {!isChatOpen && unreadCount > 0 && (
          <Badge count={unreadCount} />
        )}
      </button>
    </div>
  );
}

Launcher.propTypes = {
  position: PropTypes.oneOf(['bottom-right', 'bottom-left', 'top-right', 'top-left'])
};

export default Launcher;

