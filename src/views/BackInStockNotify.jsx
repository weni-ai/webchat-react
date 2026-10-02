import { useEffect, useRef, useState } from 'react';

import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { FSButton } from '@/components/common/FSButton';
import { useChatContext } from '@/contexts/ChatContext';
import { subscribeAvailabilityNotify } from '@/utils/availabilityNotify';
import {
  callingCodeDigits,
  callingCodeForAlpha2,
  formatNationalNumber,
  internationalDigits,
  isValidInternationalNumber,
  loadStoreCountryAlpha3,
  nationalDigits,
  phoneCountryFromAlpha3,
  readInitialPhoneCountry,
} from '@/utils/phoneCountry';

import './BackInStockNotify.scss';

export function BackInStockNotify({
  productName = '',
  skuId = '',
  seller = '',
}) {
  const { t, i18n } = useTranslation();
  const { clearPageHistory, sendMessage } = useChatContext();
  const [phoneCountry, setPhoneCountry] = useState(readInitialPhoneCountry);
  const [name, setName] = useState('');
  const [ddi, setDdi] = useState(phoneCountry.ddi);
  const ddiEditedRef = useRef(false);
  const [nationalNumber, setNationalNumber] = useState('');
  const [showNameError, setShowNameError] = useState(false);
  const [showPhoneError, setShowPhoneError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (phoneCountry.alpha2) return undefined;

    let cancelled = false;

    loadStoreCountryAlpha3().then((alpha3) => {
      if (cancelled || ddiEditedRef.current || !alpha3) return;
      const nextCountry = phoneCountryFromAlpha3(alpha3);
      if (!nextCountry.ddi) return;
      setPhoneCountry(nextCountry);
      setDdi(nextCountry.ddi);
    });

    return () => {
      cancelled = true;
    };
  }, [phoneCountry.alpha2]);

  function formatterCountry(ddiValue) {
    if (!phoneCountry.alpha2) return null;
    const callingCode = callingCodeForAlpha2(phoneCountry.alpha2);
    if (!callingCode || callingCodeDigits(ddiValue) !== callingCode)
      return null;
    return phoneCountry.alpha2;
  }

  function formatForDdi(value, ddiValue) {
    const digits = nationalDigits(value, ddiValue);
    const country = formatterCountry(ddiValue);
    return country ? formatNationalNumber(digits, country) : digits;
  }

  function handleDdiChange(event) {
    ddiEditedRef.current = true;
    const digits = callingCodeDigits(event.target.value);
    const nextDdi = digits ? `+${digits}` : '';
    setDdi(nextDdi);
    setNationalNumber((current) => formatForDdi(current, nextDdi));
    setShowPhoneError(false);
  }

  function handleNationalChange(event) {
    setNationalNumber(formatForDdi(event.target.value, ddi));
    setShowPhoneError(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nameMissing = name.trim() === '';
    const phoneInvalid = !isValidInternationalNumber(ddi, nationalNumber);
    setShowNameError(nameMissing);
    setShowPhoneError(phoneInvalid);
    if (nameMissing || phoneInvalid) return;

    setShowNameError(false);
    setShowPhoneError(false);
    setIsSubmitting(true);
    try {
      await subscribeAvailabilityNotify({
        name,
        phone: internationalDigits(ddi, nationalNumber),
        skuId,
        seller,
        language: i18n.language,
      });
    } finally {
      setSubmitted(true);
    }
  }

  function handleNotNow() {
    clearPageHistory();
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
            <p className="weni-view-back-in-stock__description">
              {t('back_in_stock.wait_prompt')}
            </p>
          </header>

          <footer className="weni-view-back-in-stock__footer">
            <FSButton onClick={handleShowSimilarProducts}>
              {t('back_in_stock.show_similar_products')}
            </FSButton>
          </footer>
        </section>
      </section>
    );
  }

  return (
    <section className="weni-view-back-in-stock">
      <form
        className="weni-view-back-in-stock__content"
        noValidate
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
          <div className="weni-view-back-in-stock__field-group">
            <label className="weni-view-back-in-stock__field">
              <input
                className={`weni-view-back-in-stock__input${showNameError ? ' weni-view-back-in-stock__input--invalid' : ''}`}
                type="text"
                name="name"
                autoComplete="name"
                placeholder=" "
                aria-required="true"
                aria-invalid={showNameError}
                aria-describedby={
                  showNameError ? 'back-in-stock-name-error' : undefined
                }
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setShowNameError(false);
                }}
              />
              <span className="weni-view-back-in-stock__label">
                {t('back_in_stock.name_label')}
              </span>
            </label>

            {showNameError && (
              <p
                id="back-in-stock-name-error"
                className="weni-view-back-in-stock__error"
                role="alert"
              >
                {t('back_in_stock.name_required')}
              </p>
            )}
          </div>

          <div className="weni-view-back-in-stock__field-group">
            <div className="weni-view-back-in-stock__phone-row">
              <label className="weni-view-back-in-stock__field weni-view-back-in-stock__field--ddi">
                <input
                  className={`weni-view-back-in-stock__input${showPhoneError ? ' weni-view-back-in-stock__input--invalid' : ''}`}
                  type="tel"
                  name="ddi"
                  inputMode="tel"
                  autoComplete="tel-country-code"
                  placeholder=" "
                  aria-invalid={showPhoneError}
                  value={ddi}
                  onChange={handleDdiChange}
                />
                <span className="weni-view-back-in-stock__label">
                  {t('back_in_stock.ddi_label')}
                </span>
              </label>

              <label className="weni-view-back-in-stock__field weni-view-back-in-stock__field--phone">
                <input
                  className={`weni-view-back-in-stock__input${showPhoneError ? ' weni-view-back-in-stock__input--invalid' : ''}`}
                  type="tel"
                  name="whatsapp"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder=" "
                  aria-invalid={showPhoneError}
                  aria-describedby={
                    showPhoneError ? 'back-in-stock-phone-error' : undefined
                  }
                  value={nationalNumber}
                  onChange={handleNationalChange}
                />
                <span className="weni-view-back-in-stock__label">
                  {t('back_in_stock.whatsapp_label')}
                </span>
              </label>
            </div>

            {showPhoneError && (
              <p
                id="back-in-stock-phone-error"
                className="weni-view-back-in-stock__error"
                role="alert"
              >
                {t('back_in_stock.invalid_phone')}
              </p>
            )}
          </div>
        </section>

        <footer className="weni-view-back-in-stock__footer">
          <FSButton
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {t('back_in_stock.notify_me')}
          </FSButton>
          <FSButton
            type="button"
            variant="tertiary"
            onClick={handleNotNow}
          >
            {t('back_in_stock.not_now')}
          </FSButton>
        </footer>
      </form>
    </section>
  );
}

BackInStockNotify.propTypes = {
  productName: PropTypes.string,
  skuId: PropTypes.string,
  seller: PropTypes.string,
};
