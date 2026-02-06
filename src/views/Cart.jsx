import { useChatContext } from '@/contexts/ChatContext';
import Button from '@/components/common/Button';
import { InlineProduct } from '@/components/Product/InlineProduct';
import { useMemo } from 'react';
import { EmptyCart } from './EmptyCart';

import './Cart.scss';
import { t } from 'i18next';

export function Cart() {
  const { cart, setCart, clearPageHistory, sendOrder } = useChatContext();

  const items = useMemo(() => {
    return Object.values(cart).filter((product) => product.quantity > 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return items.reduce((acc, product) => acc + product.quantity, 0);
  }, [items]);

  function getPriceWithDecimals(price) {
    // TODO: check how to handle different currencies
    return Number(price.replace('R$', '').replace(',', '.'));
  }

  const totalPrice = useMemo(() => {
    return items.reduce(
      (acc, product) =>
        acc + getPriceWithDecimals(product.price) * product.quantity,
      0,
    );
  }, [items]);

  function setCounter(productKey, product, counter) {
    setCart((prevCart) => ({
      ...prevCart,
      [productKey]: { ...product, quantity: counter },
    }));
  }

  function handleSendOrder() {
    const productItems = items.map((item) => ({
      product_retailer_id: item.uuid,
      name: item.title,
      price: item.price,
      sale_price: item.salePrice || item.price,
      image: item.image,
      description: item.description,
      seller_id: item.sellerId,
      quantity: item.quantity,
    }));

    sendOrder(productItems);
    setCart({});
    clearPageHistory();
  }

  if (totalItems === 0) {
    return <EmptyCart />;
  }

  return (
    <section className="weni-view-cart">
      <section className="weni-view-cart__products">
        <p className="weni-view-cart__total-items">
          {totalItems} {t('show_items.items', { count: totalItems })}
        </p>

        {items.map((product) => (
          <InlineProduct
            variant="cart"
            key={product.uuid}
            image={product.image}
            title={product.title}
            price={product.price}
            showCounterControls={true}
            counter={product.quantity}
            setCounter={(counter) => setCounter(product.uuid, product, counter)}
          />
        ))}
      </section>

      <footer className="weni-view-cart__footer">
        <section className="weni-view-cart__footer-subtotal">
          <p>{t('cart.subtotal')}</p>
          <p>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(totalPrice)}
          </p>
        </section>

        <Button
          variant="secondary"
          onClick={clearPageHistory}
        >
          {t('cart.continue_shopping')}
        </Button>
        <Button onClick={handleSendOrder}>{t('cart.make_order')}</Button>
      </footer>
    </section>
  );
}
