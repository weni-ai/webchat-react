import PropTypes from 'prop-types';
import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { FSButton } from '@/components/common/FSButton';
import { ProductCarouselCard } from './ProductCarouselCard';

import './ProductCarousel.scss';

const SCROLL_EDGE_THRESHOLD_PX = 1;

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
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const products = useMemo(
    () => productItems.map(mapProductItem),
    [productItems],
  );

  const syncScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth - clientWidth > SCROLL_EDGE_THRESHOLD_PX;

    setHasOverflow(overflow);
    setCanScrollLeft(overflow && scrollLeft > SCROLL_EDGE_THRESHOLD_PX);
    setCanScrollRight(
      overflow &&
        scrollLeft + clientWidth < scrollWidth - SCROLL_EDGE_THRESHOLD_PX,
    );
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;

    syncScrollState();
    el.addEventListener('scroll', syncScrollState, { passive: true });
    window.addEventListener('resize', syncScrollState);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(syncScrollState)
        : null;
    resizeObserver?.observe(el);

    return () => {
      el.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
      resizeObserver?.disconnect();
    };
  }, [syncScrollState, products]);

  const scrollTrack = useCallback((direction) => {
    const el = trackRef.current;
    if (!el) return;

    const card = el.querySelector('.weni-product-carousel-card');
    if (!card) return;

    const gap = Number.parseFloat(getComputedStyle(el).gap) || 0;

    el.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: 'smooth',
    });
  }, []);

  return (
    <section
      className="weni-product-carousel"
      aria-label={t('show_items.catalog_title')}
      data-testid="product-carousel"
    >
      <section
        ref={trackRef}
        className="weni-product-carousel__track"
        data-testid="product-carousel-track"
      >
        {products.map((product) => (
          <ProductCarouselCard
            key={product.uuid}
            product={product}
            disabled={disabled}
          />
        ))}
      </section>

      {hasOverflow && (
        <section
          className={[
            'weni-product-carousel__nav',
            canScrollLeft && 'weni-product-carousel__nav--can-scroll-left',
            canScrollRight && 'weni-product-carousel__nav--can-scroll-right',
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid="product-carousel-nav"
        >
          <FSButton
            variant="tertiary"
            size="large"
            rounded
            icon="keyboard_arrow_left"
            aria-label={t('product_carousel.scroll_left')}
            className={`weni-product-carousel__nav-button weni-product-carousel__nav-button--left${canScrollLeft ? '' : ' weni-product-carousel__nav-button--hidden'}`}
            onClick={() => scrollTrack(-1)}
            disabled={!canScrollLeft}
          >
            {''}
          </FSButton>

          <FSButton
            variant="tertiary"
            size="large"
            rounded
            icon="keyboard_arrow_right"
            aria-label={t('product_carousel.scroll_right')}
            className={`weni-product-carousel__nav-button weni-product-carousel__nav-button--right${canScrollRight ? '' : ' weni-product-carousel__nav-button--hidden'}`}
            onClick={() => scrollTrack(1)}
            disabled={!canScrollRight}
          >
            {''}
          </FSButton>
        </section>
      )}
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
