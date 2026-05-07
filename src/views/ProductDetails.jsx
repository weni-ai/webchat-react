import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/common/Button';
import { useChatContext } from '@/contexts/ChatContext';

import './ProductDetails.scss';
import { CounterControls } from '@/components/Product/CounterControls';
import { formatPriceWithCurrency } from '@/utils/currency';

export function ProductDetails({ product }) {
  const { cart, setCart, setCurrentPage, isInsideVTEXStore } = useChatContext();
  const { t } = useTranslation();

  const quantity = useMemo(() => {
    return cart[product.uuid]?.quantity || 0;
  }, [cart, product.uuid]);

  function setCounter(productKey, product, counter) {
    setCart((prevCart) => ({
      ...prevCart,
      [productKey]: { ...product, quantity: counter },
    }));
  }

  const totalItems = useMemo(() => {
    return Object.values(cart).reduce(
      (acc, product) => acc + product.quantity,
      0,
    );
  }, [cart]);

  const showAddToCartButton = quantity === 0 && !isInsideVTEXStore;
  const showSeeCartButton =
    quantity > 0 && totalItems > 0 && !isInsideVTEXStore;
  const showCounterControls = quantity > 0 || isInsideVTEXStore;

  return (
    <section className="weni-view-product-details">
      <section className="weni-view-product-details__content">
        <img
          className="weni-view-product-details__image"
          src={product.image}
          alt={product.title}
        />

        <section className="weni-view-product-details__product-title">
          <h1>{product.title}</h1>
          <p>{formatPriceWithCurrency(product.price, product.currency)}</p>
        </section>

        <p className="weni-view-product-details__product-description">
          {product.description}
        </p>
      </section>

      <footer className="weni-view-product-details__footer">
        {showAddToCartButton && (
          <Button
            icon="add"
            onClick={() => setCounter(product.uuid, product, 1)}
            className="weni-view-product-details__footer-button"
          >
            {t('product_details.add_to_cart')}
          </Button>
        )}

        {showCounterControls && (
          <CounterControls
            productName={product.title}
            counter={quantity}
            setCounter={(counter) => setCounter(product.uuid, product, counter)}
            size="medium"
            uuid={product.uuid}
            sellerId={product.sellerId}
          />
        )}

        {showSeeCartButton && (
          <Button
            className="weni-view-product-details__footer-button"
            onClick={() =>
              setCurrentPage({
                view: 'cart',
                title: t('cart.title'),
              })
            }
          >
            {t('cart.see_cart')} ({totalItems})
          </Button>
        )}
      </footer>
    </section>
  );
}

ProductDetails.propTypes = {
  product: PropTypes.object.isRequired,
};
