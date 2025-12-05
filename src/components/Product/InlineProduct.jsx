import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Button from '@/components/common/Button';

export function CounterControls({ counter, setCounter, hideWhenNotInteracted = false, size = 'small' }) {
  const [wasCounterInteracted, setWasCounterInteracted] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  function handleCounterChange(type) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setTimeoutId(setTimeout(() => {
      setWasCounterInteracted(false);
    }, 2000));

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

  const shouldShowMinusButton = (hideWhenNotInteracted && wasCounterInteracted && counter > 0) || !hideWhenNotInteracted;
  const shouldShowAddButton = (hideWhenNotInteracted && wasCounterInteracted) || counter === 0 || !hideWhenNotInteracted;
  const isCounterValueInteracted = wasCounterInteracted || !hideWhenNotInteracted;

  return (
    <section className={`weni-product-quantity-controls weni-product-quantity-controls--${size}`}>
      {shouldShowMinusButton && <Button variant="secondary" icon="minus" size={size} onClick={(e) => { e.stopPropagation(); handleCounterChange('decrement'); }} />}

      {counter > 0 && <p
        className={`weni-product-quantity-controls__value ${!isCounterValueInteracted ? 'weni-product-quantity-controls__value--not-interacted' : ''}`}
        onClick={(e) => { e.stopPropagation(); !isCounterValueInteracted && handleCounterChange('none'); }}
      >{counter}</p>}

      {shouldShowAddButton && <Button variant="secondary" icon="add" size={size} onClick={(e) => { e.stopPropagation(); handleCounterChange('increment'); }} />}
    </section>
  );
}

CounterControls.propTypes = {
  counter: PropTypes.number.isRequired,
  setCounter: PropTypes.func.isRequired,
  hideWhenNotInteracted: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium']),
};

import './InlineProduct.scss';

export function InlineProduct({ image, title, lines, showCounterControls = false, counter, setCounter, onClick }) {
  const [wasCounterInteracted, setWasCounterInteracted] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  function handleCounterChange(type) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setTimeoutId(setTimeout(() => {
      setWasCounterInteracted(false);
    }, 2000));

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

  return (
    <section className="weni-inline-product" onClick={onClick}>
      <img className="weni-inline-product__image" src={image} alt={title} />

      <section className="weni-inline-product__content">
        <h3 className="weni-inline-product__title">{title}</h3>
        {lines.map((line, index) => (
          <p key={index} className="weni-inline-product__line">{line}</p>
        ))}
      </section>

      {showCounterControls && (
        <CounterControls counter={counter} setCounter={setCounter} hideWhenNotInteracted />
      )}
    </section>
  );
}

InlineProduct.propTypes = {
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  lines: PropTypes.array.isRequired,
  showCounterControls: PropTypes.bool,
};