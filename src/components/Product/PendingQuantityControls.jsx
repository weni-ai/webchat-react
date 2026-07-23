import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { FSButton } from '../common/FSButton';
import { useOrderForm } from '@/contexts/OrderFormContext';

import './PendingQuantityControls.scss';

export function PendingQuantityControls({
  pendingKey,
  quantity,
  size = 'small',
  className = '',
}) {
  const { updatePendingCartQuantity } = useOrderForm();
  const { t } = useTranslation();

  function handleIncrement(e) {
    e.stopPropagation();
    if (!pendingKey) return;
    updatePendingCartQuantity(pendingKey, quantity + 1);
  }

  function handleDecrement(e) {
    e.stopPropagation();
    if (!pendingKey || quantity <= 0) return;
    updatePendingCartQuantity(pendingKey, quantity - 1);
  }

  function handleInputChange(e) {
    e.stopPropagation();
    if (!pendingKey) return;
    const raw = e.target.value;
    if (raw === '') {
      updatePendingCartQuantity(pendingKey, 0);
      return;
    }
    const parsedValue = Number.parseInt(raw, 10);
    if (Number.isNaN(parsedValue)) return;
    updatePendingCartQuantity(pendingKey, parsedValue);
  }

  return (
    <section
      className={`weni-fs-product-quantity-controls ${className}`}
    >
      <FSButton
        variant="tertiary"
        icon="minus"
        size={size}
        disabled={quantity === 0}
        onClick={handleDecrement}
        onlyIcon
      />
      <input
        type="number"
        min={0}
        inputMode="numeric"
        className="weni-product-quantity-controls__input"
        value={quantity}
        onClick={(e) => e.stopPropagation()}
        onChange={handleInputChange}
        aria-label={t('cart.add')}
      />
      <FSButton
        variant="tertiary"
        icon="add"
        size={size}
        onClick={handleIncrement}
        onlyIcon
      />
    </section>
  );
}

PendingQuantityControls.propTypes = {
  pendingKey: PropTypes.string.isRequired,
  quantity: PropTypes.number.isRequired,
  size: PropTypes.oneOf(['small', 'medium']),
  className: PropTypes.string,
};
