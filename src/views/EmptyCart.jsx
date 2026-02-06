import { Icon } from '@/components/common/Icon';
import { useTranslation } from 'react-i18next';

import './Cart.scss';

export function EmptyCart() {
  const { t } = useTranslation();

  return (
    <section className="weni-view-cart weni-view-cart--empty">
      <section className="weni-view-cart__icon">
        <Icon
          name="shopping_cart"
          size="large"
          color="bg-active"
        />
      </section>

      <section className="weni-view-cart__content">
        <h2>{t('cart.empty')}</h2>
        <p>
          {t('cart.empty_description')}
        </p>
      </section>
    </section>
  );
}
