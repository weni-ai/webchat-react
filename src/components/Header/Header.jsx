import { Icon } from '@/components/common/Icon';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';
import PropTypes from 'prop-types';

import './Header.scss';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function HeaderTitle({ profileAvatar, title, subtitle, mode, isModeVisible }) {
  const { t } = useTranslation();

  return (
    <>
      {profileAvatar && (
        <Avatar
          className="weni-chat-header__avatar"
          src={profileAvatar}
          size="x-large"
        />
      )}

      {isModeVisible && mode === 'live' && (
        <Icon
          name="circle"
          color="sl-color-green-8"
          size="xx-small"
          filled
        />
      )}

      <hgroup className="weni-chat-header__title-group">
        <h1 className="weni-chat-header__title">{title}</h1>
        {subtitle && <h2 className="weni-chat-header__subtitle">{subtitle}</h2>}
      </hgroup>

      {isModeVisible && (
        <hgroup>
          <h3
            className={`weni-chat-header__tag weni-chat-header__tag--${mode}`}
          >
            {t(`mode.${mode}.title`)}
          </h3>
        </hgroup>
      )}
    </>
  );
}

HeaderTitle.propTypes = {
  profileAvatar: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  mode: PropTypes.string,
  isModeVisible: PropTypes.bool,
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
    mode,
    isModeVisible,
    interfaceVersion,
  } = useWeniChat();

  const cartTotalItems = useMemo(() => {
    return Object.values(cart).reduce(
      (acc, product) => acc + product.quantity,
      0,
    );
  }, [cart]);

  const fullScreenButtonIcon = useMemo(() => {
    if (interfaceVersion === 2) {
      return isChatFullscreen ? 'close_fullscreen' : 'open_in_full';
    }

    return isChatFullscreen ? 'fullscreen_exit' : 'fullscreen';
  }, [isChatFullscreen, interfaceVersion]);

  const iconColor = useMemo(() => {
    if (interfaceVersion === 2) {
      return 'fg-base';
    }

    return 'white';
  }, [interfaceVersion]);

  const { config } = useChatContext();
  // TODO: Implement header layout
  // TODO: Add connection status indicator

  return (
    <header className="weni-chat-header">
      <section className="weni-chat-header__info">
        {currentPage && goBack && (
          <Button
            onClick={goBack}
            aria-label="Back"
            variant="tertiary"
            icon="arrow_back"
            iconColor={iconColor}
          />
        )}

        {interfaceVersion === 1 &&
          (currentPage ? (
            <HeaderTitle
              title={currentPage.title}
              mode={mode}
              isModeVisible={isModeVisible}
            />
          ) : (
            <HeaderTitle
              profileAvatar={config.profileAvatar}
              title={config.title}
              subtitle={config.subtitle}
              mode={mode}
              isModeVisible={isModeVisible}
            />
          ))}
      </section>

      <section className="weni-chat-header__actions">
        {cartTotalItems > 0 && (
          <Button
            aria-label="Cart"
            variant="primary"
            icon="shopping_cart"
            iconColor={iconColor}
            onClick={() => setCurrentPage({ view: 'cart', title: 'Carrinho' })}
          >
            {cartTotalItems}
          </Button>
        )}

        {(config.showFullScreenButton || interfaceVersion === 2) && (
          <Button
            onClick={toggleChatFullscreen}
            aria-label="Fullscreen chat"
            variant="tertiary"
            icon={fullScreenButtonIcon}
            iconColor={iconColor}
          />
        )}
        {(config.showCloseButton || interfaceVersion === 2) && (
          <Button
            onClick={toggleChat}
            aria-label="Close chat"
            variant="tertiary"
            icon={interfaceVersion === 2 ? 'keyboard_arrow_down' : 'close'}
            iconColor={iconColor}
          />
        )}
      </section>
    </header>
  );
}

export default Header;
