import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';

import Button from '@/components/common/Button';
import { FSButton } from '../common/FSButton';
import { useOrderForm } from '@/contexts/OrderFormContext';

function parseUuid(uuid, sellerIdFallback) {
  if (!uuid || typeof uuid !== 'string') return null;
  const parts = uuid.split('#');
  if (parts.length >= 2) {
    return { skuId: parts[0], sellerId: parts[1] };
  }
  if (sellerIdFallback) {
    return { skuId: uuid, sellerId: sellerIdFallback };
  }
  return null;
}

export function CounterControls({
  counter,
  setCounter,
  hideWhenNotInteracted = false,
  size = 'small',
  className = '',
  uuid,
  sellerId: sellerIdProp,
}) {
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [wasCounterInteracted, setWasCounterInteracted] = useState(false);
  const timeoutRef = useRef(null);
  const {
    orderFormId,
    isLoadingOrderForm,
    requestOrderForm,
    addOrderFormItem,
  } = useOrderForm();

  useEffect(() => {
    requestOrderForm();
  }, [requestOrderForm]);

  function handleCounterChange(type) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setWasCounterInteracted(false);
    }, 2000);

    setWasCounterInteracted(true);

    if (type === 'increment') {
      setCounter(counter + 1);
    } else if (type === 'decrement' && counter > 0) {
      setCounter(counter - 1);
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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

  async function handleAddProductToOrderForm() {
    const parsed = parseUuid(uuid, sellerIdProp);

    if (!parsed) return;

    setIsAddingProduct(true);

    try {
      await addOrderFormItem(parsed.skuId, parsed.sellerId);
    } finally {
      setIsAddingProduct(false);
    }
  }

  if (isLoadingOrderForm || orderFormId) {
    return (
      <FSButton
        isLoading={isLoadingOrderForm || isAddingProduct}
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          handleAddProductToOrderForm();
        }}
        icon="shopping_cart"
        >
        Add
      </FSButton>
    );
  }

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
  uuid: PropTypes.string,
  sellerId: PropTypes.string,
};
