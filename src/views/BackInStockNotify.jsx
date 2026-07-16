import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FSButton } from '@/components/common/FSButton';
import { useChatContext } from '@/contexts/ChatContext';

import './BackInStockNotify.scss';

export function BackInStockNotify({ productName = '' }) {
  const { t } = useTranslation();
  const { clearPageHistory, sendMessage } = useChatContext();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  function handleShowSimilarProducts() {
    const similarProductsLabel = t('back_in_stock.show_similar_products');
    clearPageHistory();
    sendMessage(similarProductsLabel);
  }

  if (submitted) {
    return (
      <section className="weni-view-back-in-stock">
        <section className="weni-view-back-in-stock__content weni-view-back-in-stock__content--success">
          <header className="weni-view-back-in-stock__header">
            <h1 className="weni-view-back-in-stock__title">
              {t('back_in_stock.success_title')}
            </h1>
            <p className="weni-view-back-in-stock__description">
              {t('back_in_stock.success_description', { productName })}
            </p>
          </header>

          <p className="weni-view-back-in-stock__description">
            {t('back_in_stock.wait_prompt')}
          </p>

          <FSButton onClick={handleShowSimilarProducts}>
            {t('back_in_stock.show_similar_products')}
          </FSButton>
        </section>
      </section>
    );
  }

  return (
    <section className="weni-view-back-in-stock">
      <form
        className="weni-view-back-in-stock__content"
        onSubmit={handleSubmit}
      >
        <header className="weni-view-back-in-stock__header">
          <h1 className="weni-view-back-in-stock__title">
            {t('back_in_stock.form_title')}
          </h1>
          <p className="weni-view-back-in-stock__description">
            {t('back_in_stock.form_description', { productName })}
          </p>
        </header>

        <section className="weni-view-back-in-stock__fields">
          <label className="weni-view-back-in-stock__field">
            <span className="weni-view-back-in-stock__label">
              {t('back_in_stock.name_label')}
            </span>
            <input
              className="weni-view-back-in-stock__input"
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="weni-view-back-in-stock__field">
            <span className="weni-view-back-in-stock__label">
              {t('back_in_stock.whatsapp_label')}
            </span>
            <input
              className="weni-view-back-in-stock__input"
              type="tel"
              name="whatsapp"
              autoComplete="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </label>
        </section>

        <footer className="weni-view-back-in-stock__footer">
          <FSButton type="submit">{t('back_in_stock.notify_me')}</FSButton>
        </footer>
      </form>
    </section>
  );
}

BackInStockNotify.propTypes = {
  productName: PropTypes.string,
};
