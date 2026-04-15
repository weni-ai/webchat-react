import PropTypes from 'prop-types';
import { useState, useEffect, useRef, useMemo } from 'react';

import Button from '@/components/common/Button';
import { FSButton } from '../common/FSButton';
import { useOrderForm } from '@/contexts/OrderFormContext';
import { getVtexAccount } from '@/utils/vtex';
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
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [wasCounterInteracted, setWasCounterInteracted] = useState(false);
  const timeoutRef = useRef(null);
  const {
    orderFormId,
    isLoadingOrderForm,
    requestOrderForm,
    trySyncFaststoreCart,
  } = useOrderForm();
  const { addProductToCart, config, addConversationStatus } = useChatContext();
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
    if (!justAdded) {
      return undefined;
    }
    const id = setTimeout(() => {
      setJustAdded(false);
    }, 2000);
    return () => clearTimeout(id);
  }, [justAdded]);

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

  const isAbleToAddProduct = useMemo(() => {
    return !!(
      getVtexAccount() &&
      orderFormId &&
      parsed?.skuId &&
      parsed?.sellerId
    );
  }, [getVtexAccount, orderFormId, parsed]);

  async function handleAddProductToOrderForm() {
    setJustAdded(false);
    setIsAddingProduct(true);

    try {
      await addProductToCart({
        VTEXAccountName: getVtexAccount(),
        orderFormId: orderFormId,
        seller: parsed.sellerId,
        id: parsed.skuId,
      });

      setJustAdded(true);

      addConversationStatus(
        t('cart.product_added_to_cart', {
          productName: productName ?? '',
        }),
        'success',
      );

      trySyncFaststoreCart();
    } finally {
      setIsAddingProduct(false);
    }
  }

  if (
    config.addToCart &&
    isAbleToAddProduct &&
    (isLoadingOrderForm || orderFormId)
  ) {
    return (
      <FSButton
        isLoading={isLoadingOrderForm || isAddingProduct}
        variant={isAddingProduct || justAdded ? 'tertiary' : 'secondary'}
        onClick={(e) => {
          e.stopPropagation();
          handleAddProductToOrderForm();
        }}
        icon={justAdded ? 'check_small' : 'shopping_cart'}
      >
        {justAdded ? t('cart.added') : t('cart.add')}
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
