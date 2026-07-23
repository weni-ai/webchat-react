import PropTypes from 'prop-types';
import { useState, useEffect, useRef, useMemo } from 'react';

import Button from '@/components/common/Button';
import { FSButton } from '../common/FSButton';
import { PendingQuantityControls } from './PendingQuantityControls';
import { useOrderForm } from '@/contexts/OrderFormContext';
import { isFastStoreHost } from '@/utils/vtex';
import { useChatContext } from '@/contexts/ChatContext';
import { useTranslation } from 'react-i18next';

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
  productName,
  counter,
  setCounter,
  hideWhenNotInteracted = false,
  size = 'small',
  className = '',
  uuid,
  sellerId: sellerIdProp,
}) {
  const [wasCounterInteracted, setWasCounterInteracted] = useState(false);
  const timeoutRef = useRef(null);
  const {
    orderFormId,
    isLoadingOrderForm,
    requestOrderForm,
    pendingCartItems,
    setPendingCartItem,
  } = useOrderForm();
  const isFastStore = useMemo(() => isFastStoreHost(), []);
  const { config, isInsideVTEXStore } = useChatContext();
  const { t } = useTranslation();

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

  const parsed = useMemo(
    () => parseUuid(uuid, sellerIdProp),
    [uuid, sellerIdProp],
  );

  const pendingKey = useMemo(() => {
    if (uuid) return uuid;
    if (parsed?.skuId && parsed?.sellerId) {
      return `${parsed.skuId}#${parsed.sellerId}`;
    }
    return null;
  }, [uuid, parsed]);

  const pendingItem = pendingKey ? pendingCartItems[pendingKey] : null;

  const isAbleToAddProduct = useMemo(() => {
    return !!(
      isInsideVTEXStore &&
      parsed?.skuId &&
      parsed?.sellerId &&
      (orderFormId || isFastStore)
    );
  }, [isInsideVTEXStore, orderFormId, parsed, isFastStore]);

  function handleStageProduct(e) {
    e.stopPropagation();
    if (!pendingKey || !parsed) return;

    setPendingCartItem({
      key: pendingKey,
      skuId: parsed.skuId,
      sellerId: parsed.sellerId,
      quantity: 1,
      productName,
    });
  }

  if (
    config.addToCart &&
    isAbleToAddProduct &&
    (isLoadingOrderForm || orderFormId || isFastStore)
  ) {
    if (pendingItem) {
      return (
        <PendingQuantityControls
          pendingKey={pendingKey}
          quantity={pendingItem.quantity}
          size={size}
          className={className}
        />
      );
    }

    return (
      <FSButton
        isLoading={isLoadingOrderForm}
        variant="secondary"
        onClick={handleStageProduct}
        icon="shopping_cart"
        className={className}
      >
        {t('cart.add')}
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
  productName: PropTypes.string,
  counter: PropTypes.number.isRequired,
  setCounter: PropTypes.func.isRequired,
  hideWhenNotInteracted: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium']),
  className: PropTypes.string,
  uuid: PropTypes.string,
  sellerId: PropTypes.string,
};
