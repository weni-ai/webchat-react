import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { CounterControls } from '@/components/Product/CounterControls';
import { PriceDisplay } from '@/components/Product/PriceDisplay';
import { useChatContext } from '@/contexts/ChatContext';
import { useWeniChat } from '@/hooks/useWeniChat';

import './ProductCarousel.scss';

export function ProductCarouselCard({ product, disabled = false }) {
  const { cart, setCart } = useChatContext();
  const { setCurrentPage } = useWeniChat();
  const { t } = useTranslation();

  function getCounter(productKey) {
    return cart[productKey]?.quantity || 0;
  }

  function setCounter(productKey, productData, counter) {
    setCart((prevCart) => ({
      ...prevCart,
      [productKey]: { ...productData, quantity: counter },
    }));
  }

  function handleCardClick() {
    if (disabled) return;

    setCurrentPage({
      view: 'product-details',
      title: t('product_details.title'),
      props: { product },
    });
  }

  return (
    <article
      className={`weni-product-carousel-card${disabled ? ' weni-product-carousel-card--disabled' : ''}`}
      onClick={handleCardClick}
    >
      <section className="weni-product-carousel-card__image-container">
        <img
          className="weni-product-carousel-card__image"
          src={product.image}
          alt={product.title}
        />
      </section>

      <section className="weni-product-carousel-card__content">
        <h3 className="weni-product-carousel-card__title">{product.title}</h3>
        <PriceDisplay
          price={product.price}
          salePrice={product.salePrice}
          currency={product.currency}
          priceModifier="product"
        />
      </section>

      <CounterControls
        productName={product.title}
        counter={getCounter(product.uuid)}
        setCounter={(counter) =>
          setCounter(product.uuid, product, counter)
        }
        uuid={product.uuid}
        sellerId={product.sellerId}
        className="weni-product-carousel-card__add-button"
      />
    </article>
  );
}

ProductCarouselCard.propTypes = {
  product: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    salePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    currency: PropTypes.string,
    sellerId: PropTypes.string,
    productURL: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  disabled: PropTypes.bool,
};
