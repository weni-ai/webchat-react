import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FSButton } from '@/components/common/FSButton';
import { useChatContext } from '@/contexts/ChatContext';

import './WhatsappOffersOptIn.scss';

export function WhatsappOffersOptIn({ couponPercent = null }) {
  const { t } = useTranslation();
  const { clearPageHistory, simulateMessageReceived } = useChatContext();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const isCoupon = couponPercent != null;
  const title = isCoupon
    ? t('whatsapp_offers_opt_in.coupon_form_title', { percent: couponPercent })
    : t('whatsapp_offers_opt_in.form_title');
  const description = isCoupon
    ? t('whatsapp_offers_opt_in.coupon_form_description')
    : t('whatsapp_offers_opt_in.form_description');

  function handleSubmit(event) {
    event.preventDefault();
    clearPageHistory();
    simulateMessageReceived({
      type: 'message',
      message: { text: t('whatsapp_offers_opt_in.agent_confirmation') },
    });
    simulateMessageReceived({
      type: 'message',
      message: { text: t('whatsapp_offers_opt_in.agent_follow_up') },
    });
  }

  function handleNotNow() {
    clearPageHistory();
  }

  return (
    <section className="weni-view-whatsapp-offers">
      <form
        className="weni-view-whatsapp-offers__content"
        onSubmit={handleSubmit}
      >
        <header className="weni-view-whatsapp-offers__header">
          <h1 className="weni-view-whatsapp-offers__title">{title}</h1>
          <p className="weni-view-whatsapp-offers__description">
            {description}
          </p>
        </header>

        <section className="weni-view-whatsapp-offers__fields">
          <label className="weni-view-whatsapp-offers__field">
            <span className="weni-view-whatsapp-offers__label">
              {t('back_in_stock.name_label')}
            </span>
            <input
              className="weni-view-whatsapp-offers__input"
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="weni-view-whatsapp-offers__field">
            <span className="weni-view-whatsapp-offers__label">
              {t('back_in_stock.whatsapp_label')}
            </span>
            <input
              className="weni-view-whatsapp-offers__input"
              type="tel"
              name="whatsapp"
              autoComplete="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </label>
        </section>

        <footer className="weni-view-whatsapp-offers__footer">
          <FSButton type="submit">
            {t('whatsapp_offers_opt_in.sign_me_up')}
          </FSButton>
          <FSButton
            type="button"
            variant="tertiary"
            onClick={handleNotNow}
          >
            {t('whatsapp_offers_opt_in.not_now')}
          </FSButton>
        </footer>
      </form>
    </section>
  );
}

WhatsappOffersOptIn.propTypes = {
  couponPercent: PropTypes.number,
};
