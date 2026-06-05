import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ProductCarouselCard } from './ProductCarouselCard';

import './ProductCarousel.scss';

function mapProductItem(item) {
  return {
    uuid: item.product_retailer_id,
    image: item.image,
    title: item.name,
    description: item.description,
    price: item.price,
    salePrice: item.sale_price,
    currency: item.currency ?? 'BRL',
    sellerId: item.seller_id,
    productURL: item.product_url,
  };
}

export function ProductCarousel({ productItems, disabled = false }) {
  const { t } = useTranslation();

  const products = useMemo(
    () => productItems.map(mapProductItem),
    [productItems],
  );

  return (
    <section
      className="weni-product-carousel"
      aria-label={t('show_items.catalog_title')}
      data-testid="product-carousel"
    >
      {products.map((product) => (
        <ProductCarouselCard
          key={product.uuid}
          product={product}
          disabled={disabled}
        />
      ))}
    </section>
  );
}

ProductCarousel.propTypes = {
  productItems: PropTypes.arrayOf(
    PropTypes.shape({
      product_retailer_id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      image: PropTypes.string.isRequired,
      sale_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      currency: PropTypes.string,
      description: PropTypes.string,
      seller_id: PropTypes.string,
      product_url: PropTypes.string,
    }),
  ).isRequired,
  disabled: PropTypes.bool,
};
