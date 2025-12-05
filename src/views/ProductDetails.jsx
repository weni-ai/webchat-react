import PropTypes from 'prop-types';
import { useMemo } from 'react';

import Button from '@/components/common/Button';
import { useChatContext } from '@/contexts/ChatContext';

import './ProductDetails.scss';
import { CounterControls } from '@/components/Product/InlineProduct';

export function ProductDetails({ product }) {
  const { cart, setCart } = useChatContext();

  const quantity = useMemo(() => {
    return cart[product.uuid]?.quantity || 0;
  }, [cart]);

  function getCounter(productKey) {
    return cart[productKey]?.quantity || 0;
  }

  function setCounter(productKey, product, counter) {
    setCart((prevCart) => ({ ...prevCart, [productKey]: { ...product, quantity: counter } }));
  }

  const totalItems = useMemo(() => {
    return Object.values(cart).reduce((acc, product) => acc + product.quantity, 0);
  }, [cart]);

  return (
    <section className="weni-view-product-details">
      <section className="weni-view-product-details__content">
        <img className="weni-view-product-details__image" src={product.image} alt={product.title} />

        <section className="weni-view-product-details__product-title">
          <h1>{product.title}</h1>
          <p>{product.price}</p>
        </section>

        <p className="weni-view-product-details__product-description">{product.description}</p>
      </section>

      <footer className="weni-view-product-details__footer">
        {quantity === 0 && <Button icon="add" onClick={() => setCounter(product.uuid, product, 1)} className="weni-view-product-details__footer-button">Adicionar ao carrinho</Button>}
        {quantity > 0 && <>
          <CounterControls counter={quantity} setCounter={(counter) => setCounter(product.uuid, product, counter)} size="medium" />
          <Button className="weni-view-product-details__footer-button">Ver carrinho ({totalItems})</Button>
        </>}
      </footer>
    </section>
  );
}

ProductDetails.propTypes = {
  product: PropTypes.object.isRequired,
};
