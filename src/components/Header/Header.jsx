import Button from '@/components/common/Button';
import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';
import PropTypes from 'prop-types';

import './Header.scss';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function HeaderTitle({ title, subtitle }) {
  return (
    <hgroup className="weni-chat-header__title-group">
      <h1 className="weni-chat-header__title">{title}</h1>
      {subtitle && <h2 className="weni-chat-header__subtitle">{subtitle}</h2>}
    </hgroup>
  );
}

HeaderTitle.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
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

  const { config } = useChatContext();
  // TODO: Implement header layout
  // TODO: Add connection status indicator

  return (
    <header className="weni-chat-header">
      <hgroup className="weni-chat-header__group">
        {currentPage && goBack && (
          <section className="weni-chat-header__info">
            <Button
              onClick={goBack}
              aria-label="Back"
              variant="tertiary"
              icon="arrow_back"
            />
          </section>
        )}

        <ModeTag
          isModeVisible={config.showMode}
          mode={config.mode}
        />
      </hgroup>

      <section className="weni-chat-header__actions">
        {cartTotalItems > 0 && (
          <Button
            aria-label="Cart"
            variant="primary"
            icon="shopping_cart"
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
            icon={isChatFullscreen ? 'close_fullscreen' : 'open_in_full'}
            className="weni--hide-on-mobile"
          />
        )}
        {config.showCloseButton && (
          <Button
            onClick={toggleChat}
            aria-label="Close chat"
            variant="tertiary"
            icon="keyboard_arrow_down"
          />
        )}
      </section>
    </header>
  );
}

export default Header;

function ModeTag({ isModeVisible, mode }) {
  const { t } = useTranslation();

  if (!isModeVisible) {
    return null;
  }

  return (
    <h3 className={`weni-chat-header__tag weni-chat-header__tag--${mode}`}>
      {t(`mode.${mode}.title`)}
    </h3>
  );
}

ModeTag.propTypes = {
  isModeVisible: PropTypes.bool.isRequired,
  mode: PropTypes.string.isRequired,
};
