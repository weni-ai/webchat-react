import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/common/Button';
import { InlineProduct } from '@/components/Product/InlineProduct';
import { useChatContext } from '@/contexts/ChatContext';

import './ProductCatalog.scss';

export function ProductCatalog({ productGroups }) {
  const { cart, setCart, setCurrentPage } = useChatContext();
  const { t } = useTranslation();

  function getCounter(productKey) {
    return cart[productKey]?.quantity || 0;
  }

  function setCounter(productKey, product, counter) {
    setCart((prevCart) => ({
      ...prevCart,
      [productKey]: { ...product, quantity: counter },
    }));
  }

  const totalItems = useMemo(() => {
    return Object.values(cart).reduce(
      (acc, product) => acc + product.quantity,
      0,
    );
  }, [cart]);

  return (
    <section className="weni-view-product-catalog">
      <section className="weni-view-product-catalog__products">
        {productGroups.map((productGroup, groupIndex) => (
          <section
            key={groupIndex}
            className="weni-product-group"
          >
            <h2 className="weni-product-group__title">{productGroup.title}</h2>

            {productGroup.products.map((product, productIndex) => (
              <InlineProduct
                variant="product"
                key={productIndex}
                image={product.image}
                title={product.title}
                lines={[product.description, product.price]}
                showCounterControls={true}
                counter={getCounter(product.uuid)}
                setCounter={(counter) =>
                  setCounter(product.uuid, product, counter)
                }
                onClick={() =>
                  setCurrentPage({
                    view: 'product-details',
                    title: t('product_details.title'),
                    props: { product },
                  })
                }
              />
            ))}
          </section>
        ))}
      </section>

      {totalItems > 0 && (
        <footer className="weni-view-product-catalog__footer">
          <Button
            onClick={() =>
              setCurrentPage({
                view: 'cart',
                title: t('cart.title'),
              })
            }
          >
            {t('cart.see_cart')} ({totalItems})
          </Button>
        </footer>
      )}
    </section>
  );
}

ProductCatalog.propTypes = {
  productGroups: PropTypes.array.isRequired,
};
