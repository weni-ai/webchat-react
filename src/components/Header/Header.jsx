import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';

import './Header.scss';

function HeaderTitle({ profileAvatar, title, subtitle, goBack }) {
  return (
    <>
      {goBack && (
        <Button onClick={goBack} aria-label="Back" variant="tertiary" icon="arrow_back" iconColor="white"/>
      )}
    
      {profileAvatar && <Avatar className="weni-chat-header__avatar" src={profileAvatar} size="x-large" />}

      <hgroup className="weni-chat-header__title-group">
        <h1 className="weni-chat-header__title">{title}</h1>
        {subtitle && <h2 className="weni-chat-header__subtitle">{subtitle}</h2>}
      </hgroup>
    </>
  );
}

/**
 * Header - Chat header component
 */
export function Header() {
  const { toggleChat } = useWeniChat();
  const { isChatFullscreen, toggleChatFullscreen, currentPage, setCurrentPage } = useWeniChat();

  const { config } = useChatContext();
  // TODO: Implement header layout
  // TODO: Add connection status indicator
  
  return (
    <header className="weni-chat-header">
      <section className="weni-chat-header__info">
        {
          currentPage ?
            <HeaderTitle title={currentPage.title} goBack={() => setCurrentPage(null)} /> :
            <HeaderTitle profileAvatar={config.profileAvatar} title={config.title} subtitle={config.subtitle} />
        }
      </section>

      <section className="weni-chat-header__actions">
        {config.showFullScreenButton && <Button onClick={toggleChatFullscreen} aria-label="Fullscreen chat" variant="tertiary" icon={isChatFullscreen ? "fullscreen_exit" : "fullscreen"} iconColor="white"/>}
        {config.showCloseButton && <Button onClick={toggleChat} aria-label="Close chat" variant="tertiary" icon="close" iconColor="white"/>}
      </section>
    </header>
  );
}

export default Header;

