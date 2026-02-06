import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Button from '@/components/common/Button';

export function CounterControls({
  counter,
  setCounter,
  hideWhenNotInteracted = false,
  size = 'small',
  className = '',
}) {
  const [wasCounterInteracted, setWasCounterInteracted] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  function handleCounterChange(type) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setTimeoutId(
      setTimeout(() => {
        setWasCounterInteracted(false);
      }, 2000),
    );

    setWasCounterInteracted(true);

    if (type === 'increment') {
      setCounter(counter + 1);
    } else if (type === 'decrement') {
      setCounter(counter - 1);
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const shouldShowMinusButton =
    (hideWhenNotInteracted && wasCounterInteracted && counter > 0) ||
    !hideWhenNotInteracted;
  const shouldShowAddButton =
    (hideWhenNotInteracted && wasCounterInteracted) ||
    counter === 0 ||
    !hideWhenNotInteracted;
  const isCounterValueInteracted =
    wasCounterInteracted || !hideWhenNotInteracted;

  return (
    <section
      className={`weni-product-quantity-controls weni-product-quantity-controls--${size} ${className}`}
    >
      {shouldShowMinusButton && (
        <Button
          variant="secondary"
          icon="minus"
          size={size}
          onClick={(e) => {
            e.stopPropagation();
            handleCounterChange('decrement');
          }}
        />
      )}

      {counter > 0 && (
        <p
          className={`weni-product-quantity-controls__value ${!isCounterValueInteracted ? 'weni-product-quantity-controls__value--not-interacted' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isCounterValueInteracted) {
              handleCounterChange('none');
            }
          }}
        >
          {String(counter)}
        </p>
      )}

      {shouldShowAddButton && (
        <Button
          variant="secondary"
          icon="add"
          size={size}
          onClick={(e) => {
            e.stopPropagation();
            handleCounterChange('increment');
          }}
        />
      )}
    </section>
  );
}

CounterControls.propTypes = {
  counter: PropTypes.number.isRequired,
  setCounter: PropTypes.func.isRequired,
  hideWhenNotInteracted: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium']),
  className: PropTypes.string,
};

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

      <section className={`weni-inline-product__content weni-inline-product__content--${variant}`}>
        <h3 className="weni-inline-product__title">{title}</h3>
        {lines.map((line, index) => (
          <p
            key={index}
            className="weni-inline-product__line"
          >
            {line}
          </p>
        ))}

        {variant === 'cart' && (
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
