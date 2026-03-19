import PropTypes from 'prop-types';
import { useCallback, useMemo } from 'react';

import { CounterControls } from '@/components/Product/CounterControls';
import { PriceDisplay } from '@/components/Product/PriceDisplay';

import './InlineProduct.scss';

const CONTENT_SLOT = 'content';
const TRAILING_SLOT = 'trailing';

// Strategy pattern to handle layouts for different variants
const VARIANT_LAYOUT = {
  catalog: {},
  order: {},
  product: {
    priceSlot: CONTENT_SLOT,
    counterSlot: TRAILING_SLOT,
    priceModifier: 'product',
    counterProps: { hideWhenNotInteracted: true },
  },
  cart: {
    priceSlot: TRAILING_SLOT,
    counterSlot: CONTENT_SLOT,
    counterProps: { className: 'weni-inline-product__counter-controls' },
  },
};

export function InlineProduct({
  uuid,
  variant = 'catalog',
  image,
  title,
  lines = [],
  price = '',
  salePrice = '',
  currency = 'BRL',
  counter,
  setCounter,
  onClick,
  productURL,
  sellerId,
}) {
  const layout = VARIANT_LAYOUT[variant] ?? VARIANT_LAYOUT.catalog;
  const hasCounter = counter !== undefined && setCounter !== undefined;

  const priceElement = layout.priceSlot ? (
    <PriceDisplay
      price={price}
      salePrice={salePrice}
      currency={currency}
      priceModifier={layout.priceModifier}
    />
  ) : null;

  const counterElement =
    hasCounter && layout.counterSlot ? (
      <CounterControls
        uuid={uuid}
        counter={counter}
        setCounter={setCounter}
        sellerId={sellerId}
        {...layout.counterProps}
      />
    ) : null;

  const contentSlot =
    layout.priceSlot === CONTENT_SLOT
      ? priceElement
      : layout.counterSlot === CONTENT_SLOT
        ? counterElement
        : null;

  const trailingSlot =
    layout.priceSlot === TRAILING_SLOT
      ? priceElement
      : layout.counterSlot === TRAILING_SLOT
        ? counterElement
        : null;

  const productURLObject = useMemo(() => {
    return URL.canParse(productURL)
      ? new URL(productURL)
      : { origin: '', pathname: '' };
  }, [productURL]);

  const canUserNavigateToProductPage = useMemo(() => {
    return productURLObject.origin === window.location.origin;
  }, [productURLObject]);

  const handleClick = useCallback(() => {
    if (
      canUserNavigateToProductPage &&
      productURLObject.pathname === window.location.pathname
    ) {
      return;
    }

    if (canUserNavigateToProductPage) {
      window.location.href = productURL;
    } else {
      onClick();
    }
  }, [canUserNavigateToProductPage, onClick, productURL]);

  return (
    <section
      className={`weni-inline-product weni-inline-product--${variant}`}
      onClick={handleClick}
    >
      <section className="weni-inline-product__image-container">
        <img
          className={`weni-inline-product__image weni-inline-product__image--${variant}`}
          src={image}
          alt={title}
        />
      </section>

      <section
        className={`weni-inline-product__content weni-inline-product__content--${variant}`}
      >
        <h3 className="weni-inline-product__title">{title}</h3>
        {lines.map((line, index) => (
          <p
            key={index}
            className="weni-inline-product__line"
          >
            {line}
          </p>
        ))}
        {contentSlot}
      </section>

      {trailingSlot}
    </section>
  );
}

InlineProduct.propTypes = {
  uuid: PropTypes.string,
  variant: PropTypes.oneOf(['catalog', 'cart', 'product', 'order']),
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  lines: PropTypes.array,
  price: PropTypes.string,
  salePrice: PropTypes.string,
  currency: PropTypes.string,
  counter: PropTypes.number,
  setCounter: PropTypes.func,
  onClick: PropTypes.func,
  sellerId: PropTypes.string,
  productURL: PropTypes.string,
};
