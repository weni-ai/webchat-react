import PropTypes from 'prop-types';

import Button from '@/components/common/Button';
import { useWeniChat } from '@/hooks/useWeniChat';

/**
 * Header - Chat header component
 * TODO: Display chat title and status
 * TODO: Add close button
 * TODO: Add fullscreen toggle button
 * TODO: Show connection status indicator
 */
export function Header({ title = 'Chat', subtitle = '' }) {
  const { toggleChat } = useWeniChat();
  
  // TODO: Implement header layout
  // TODO: Add connection status indicator
  
  return (
    <div className="weni-chat-header">
      <div className="weni-chat-header-info">
        <h3 className="weni-chat-header-title">{title}</h3>
        {subtitle && <span className="weni-chat-header-subtitle">{subtitle}</span>}
        {/* TODO: Add connection status indicator */}
      </div>
      <div className="weni-chat-header-actions">
        {/* TODO: Add fullscreen button */}
        <Button onClick={toggleChat} aria-label="Close chat">
          {/* TODO: Add close icon */}
        </Button>
      </div>
    </div>
  );
}

Header.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string
};

export default Header;

