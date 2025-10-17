import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';

import './Header.scss';

/**
 * Header - Chat header component
 * TODO: Add fullscreen toggle button
 */
export function Header() {
  const { toggleChat } = useWeniChat();

  const { config } = useChatContext();
  // TODO: Implement header layout
  // TODO: Add connection status indicator
  
  return (
    <header className="weni-chat-header">
      <section className="weni-chat-header__info">
        {config.profileAvatar && <Avatar className="weni-chat-header__avatar" src={config.profileAvatar} size="x-large" />}

        <hgroup className="weni-chat-header__title-group">
          <h1 className="weni-chat-header__title">{config.title}</h1>
          {config.subtitle && <h2 className="weni-chat-header__subtitle">{config.subtitle}</h2>}
        </hgroup>
      </section>

      <section className="weni-chat-header__actions">
        {/* TODO: Add fullscreen button */}
        {config.showCloseButton && <Button onClick={toggleChat} aria-label="Close chat" variant="tertiary" icon="close" iconColor="white"/>}
      </section>
    </header>
  );
}

export default Header;

