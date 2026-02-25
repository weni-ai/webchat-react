import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import { VoiceModeButton } from '@/components/VoiceMode';
import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';
import PropTypes from 'prop-types';

import './Header.scss';
import { useMemo } from 'react';

function HeaderTitle({ profileAvatar, title, subtitle, goBack }) {
  return (
    <>
      {goBack && (
        <Button
          onClick={goBack}
          aria-label="Back"
          variant="tertiary"
          icon="arrow_back"
          iconColor="white"
        />
      )}

      {profileAvatar && (
        <Avatar
          className="weni-chat-header__avatar"
          src={profileAvatar}
          size="x-large"
        />
      )}

      <hgroup className="weni-chat-header__title-group">
        <h1 className="weni-chat-header__title">{title}</h1>
        {subtitle && <h2 className="weni-chat-header__subtitle">{subtitle}</h2>}
      </hgroup>
    </>
  );
}

HeaderTitle.propTypes = {
  profileAvatar: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  goBack: PropTypes.func,
};

/**
 * Header - Chat header component
 */
export function Header() {
  const {
    toggleChat,
    isChatFullscreen,
    toggleChatFullscreen,
    currentPage,
    setCurrentPage,
    goBack,
    cart,
  } = useWeniChat();

  const cartTotalItems = useMemo(() => {
    return Object.values(cart).reduce(
      (acc, product) => acc + product.quantity,
      0,
    );
  }, [cart]);

  const { config, isVoiceModeSupported, enterVoiceMode } = useChatContext();
  // TODO: Implement header layout
  // TODO: Add connection status indicator

  return (
    <header className="weni-chat-header">
      <section className="weni-chat-header__info">
        {currentPage ? (
          <HeaderTitle
            title={currentPage.title}
            goBack={goBack}
          />
        ) : (
          <HeaderTitle
            profileAvatar={config.profileAvatar}
            title={config.title}
            subtitle={config.subtitle}
          />
        )}
      </section>

      <section className="weni-chat-header__actions">
        {config.voiceMode?.enabled && isVoiceModeSupported && (
          <VoiceModeButton onClick={enterVoiceMode} />
        )}

        {cartTotalItems > 0 && (
          <Button
            aria-label="Cart"
            variant="primary"
            icon="shopping_cart"
            iconColor="white"
            onClick={() => setCurrentPage({ view: 'cart', title: 'Carrinho' })}
          >
            {cartTotalItems}
          </Button>
        )}

        {config.showFullScreenButton && (
          <Button
            onClick={toggleChatFullscreen}
            aria-label="Fullscreen chat"
            variant="tertiary"
            icon={isChatFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            iconColor="white"
          />
        )}
        {config.showCloseButton && (
          <Button
            onClick={toggleChat}
            aria-label="Close chat"
            variant="tertiary"
            icon="close"
            iconColor="white"
          />
        )}
      </section>
    </header>
  );
}

export default Header;
