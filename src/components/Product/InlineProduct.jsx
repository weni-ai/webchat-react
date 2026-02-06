import PropTypes from 'prop-types';

import { CounterControls } from '@/components/Product/CounterControls';

import './InlineProduct.scss';

export function InlineProduct({
  variant = 'catalog',
  image,
  title,
  lines = [],
  price = '',
  showCounterControls = false,
  counter,
  setCounter,
  onClick,
}) {
  const hasCounter = counter !== undefined && setCounter !== undefined;

  return (
    <section
      className={`weni-inline-product weni-inline-product--${variant}`}
      onClick={onClick}
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

        {variant === 'cart' && hasCounter && (
          <CounterControls
            counter={counter}
            setCounter={setCounter}
            className="weni-inline-product__counter-controls"
          />
        )}
      </section>

      {price && <p className="weni-inline-product__price">{price}</p>}

      {showCounterControls && variant === 'product' && (
        <CounterControls
          counter={counter}
          setCounter={setCounter}
          hideWhenNotInteracted
        />
      )}
    </section>
  );
}

InlineProduct.propTypes = {
  variant: PropTypes.oneOf(['catalog', 'cart', 'product', 'order']),
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  lines: PropTypes.array,
  price: PropTypes.string,
  showCounterControls: PropTypes.bool,
  counter: PropTypes.number,
  setCounter: PropTypes.func,
  onClick: PropTypes.func,
};
