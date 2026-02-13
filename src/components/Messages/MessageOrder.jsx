import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

import { InlineProduct } from '@/components/Product/InlineProduct';

import './MessageOrder.scss';

export function MessageOrder({ message }) {
  const productItems = message.order?.product_items || [];
  const { t } = useTranslation();

  const firstImage = useMemo(() => {
    return productItems[0]?.image;
  }, [productItems]);

  const totalItems = useMemo(() => {
    return productItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }, [productItems]);

  return (
    <section className="weni-message-order">
      <InlineProduct
        variant="order"
        image={firstImage}
        title={t('cart.title')}
        lines={[
          `${totalItems} ${t('show_items.items', { count: totalItems })}`,
        ]}
      />
    </section>
  );
}

MessageOrder.propTypes = {
  message: PropTypes.shape({
    order: PropTypes.shape({
      product_items: PropTypes.arrayOf(
        PropTypes.shape({
          product_retailer_id: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
          price: PropTypes.string.isRequired,
          sale_price: PropTypes.string,
          currency: PropTypes.string,
          image: PropTypes.string,
          description: PropTypes.string,
          seller_id: PropTypes.string,
          quantity: PropTypes.number,
        }),
      ).isRequired,
    }).isRequired,
  }).isRequired,
};

export default MessageOrder;
