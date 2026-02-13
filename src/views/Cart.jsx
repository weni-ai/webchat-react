import { useChatContext } from '@/contexts/ChatContext';
import Button from '@/components/common/Button';
import { InlineProduct } from '@/components/Product/InlineProduct';
import { useMemo } from 'react';
import { EmptyCart } from './EmptyCart';
import { formatPriceWithCurrency } from '@/utils/currency';

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

  const totalPrice = useMemo(() => {
    return items.reduce(
      (acc, product) => acc + parseFloat(product.price) * product.quantity,
      0,
    );
  }, [items]);

  const totalDiscount = useMemo(() => {
    return items.reduce((acc, product) => {
      const price = parseFloat(product.price || 0);
      const salePrice = parseFloat(product.salePrice || 0);
      if (price === salePrice || !salePrice) {
        return acc;
      }
      const discount = price - salePrice;
      return acc + discount * product.quantity;
    }, 0);
  }, [items]);

  const hasDiscount = useMemo(() => {
    return totalDiscount > 0;
  }, [totalDiscount]);

  const cartCurrency = useMemo(() => {
    return getCurrencyFromProducts(items);
  }, [items]);

  function setCounter(productKey, product, counter) {
    setCart((prevCart) => ({
      ...prevCart,
      [productKey]: { ...product, quantity: counter },
    }));
  }

  function getCurrencyFromProducts(products) {
    const fallbackCurrency = 'BRL';
    const currencies = products.map((product) => product.currency);
    return currencies.length > 0 ? currencies[0] : fallbackCurrency;
  }

  function handleSendOrder() {
    const productItems = items.map((item) => ({
      product_retailer_id: item.uuid,
      name: item.title,
      price: item.price,
      sale_price: item.salePrice,
      currency: item.currency,
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
            salePrice={product.salePrice}
            currency={product.currency}
            counter={product.quantity}
            setCounter={(counter) => setCounter(product.uuid, product, counter)}
          />
        ))}
      </section>

      <footer className="weni-view-cart__footer">
        <section
          className={`weni-view-cart__footer-subtotal ${hasDiscount ? 'weni-view-cart__footer-subtotal--discounted' : ''}`}
        >
          <p>{t('cart.subtotal')}</p>
          <p>{formatPriceWithCurrency(totalPrice, cartCurrency)}</p>
        </section>

        {hasDiscount && (
          <section className="weni-view-cart__footer-discount">
            <p>{t('cart.discount')}</p>
            <p>{formatPriceWithCurrency(totalDiscount, cartCurrency)}</p>
          </section>
        )}

        {hasDiscount && (
          <section className="weni-view-cart__footer-total">
            <p> {t('cart.total')}</p>
            <p>
              {formatPriceWithCurrency(
                totalPrice - totalDiscount,
                cartCurrency,
              )}
            </p>
          </section>
        )}

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
