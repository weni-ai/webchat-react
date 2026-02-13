import PropTypes from 'prop-types';
import { formatPriceWithCurrency } from '@/utils/currency';

function getPriceClassName(hasSalePrice, priceModifier) {
  const base = 'weni-inline-product__price';
  if (hasSalePrice) return `${base} ${base}--muted`;
  if (priceModifier) return `${base} ${base}--${priceModifier}`;
  return base;
}

export function PriceDisplay({ price, salePrice, currency, priceModifier }) {
  const formattedPrice = price ? formatPriceWithCurrency(price, currency) : '';
  const formattedSalePrice = salePrice
    ? formatPriceWithCurrency(salePrice, currency)
    : '';

  if (!formattedPrice && !formattedSalePrice) return null;

  return (
    <section className="weni-inline-product__price-container">
      {formattedPrice && (
        <p className={getPriceClassName(salePrice, priceModifier)}>
          {formattedPrice}
        </p>
      )}
      {formattedSalePrice && (
        <p className="weni-inline-product__price weni-inline-product__price--sale">
          {formattedSalePrice}
        </p>
      )}
    </section>
  );
}

PriceDisplay.propTypes = {
  price: PropTypes.string,
  salePrice: PropTypes.string,
  currency: PropTypes.string,
  priceModifier: PropTypes.string,
};
