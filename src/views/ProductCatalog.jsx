import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/common/Button';
import { FSButton } from '@/components/common/FSButton';
import { InlineProduct } from '@/components/Product/InlineProduct';
import { useChatContext } from '@/contexts/ChatContext';
import { useOrderForm } from '@/contexts/OrderFormContext';

import './ProductCatalog.scss';

export function ProductCatalog({ productGroups }) {
  const {
    cart,
    setCurrentPage,
    clearPageHistory,
    isInsideVTEXStore,
    config,
  } = useChatContext();
  const { pendingCartItems } = useOrderForm();
  const { t } = useTranslation();

  const totalItems = useMemo(() => {
    return Object.values(cart).reduce(
      (acc, product) => acc + product.quantity,
      0,
    );
  }, [cart]);

  const pendingSelectedCount = useMemo(() => {
    return Object.values(pendingCartItems).reduce((acc, item) => {
      if (item.origin !== 'catalog') return acc;
      return acc + Math.max(0, Number(item.quantity) || 0);
    }, 0);
  }, [pendingCartItems]);

  const showSeeCartButton = totalItems > 0 && !isInsideVTEXStore;
  const showAddItemsFooter = isInsideVTEXStore && config?.addToCart;

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
              <ProductCatalogItem
                key={productIndex}
                product={product}
              />
            ))}
          </section>
        ))}
      </section>

      {showAddItemsFooter && (
        <footer className="weni-view-product-catalog__footer weni-view-product-catalog__footer--add-items">
          <p className="weni-view-product-catalog__selected-count">
            {t('product_catalog.items_selected', {
              count: pendingSelectedCount,
            })}
          </p>

          <FSButton
            disabled={pendingSelectedCount === 0}
            onClick={() => clearPageHistory()}
            className="weni-view-product-catalog__add-items-button"
          >
            {t('product_catalog.add_items_and_return')}
          </FSButton>
        </footer>
      )}

      {showSeeCartButton && (
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

export function ProductCatalogItem({ product, inConversation = false }) {
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

  return (
    <InlineProduct
      variant={inConversation ? 'product-in-conversation' : 'product'}
      image={product.image}
      title={product.title}
      price={product.price}
      salePrice={product.salePrice}
      currency={product.currency}
      counter={getCounter(product.uuid)}
      setCounter={(counter) => setCounter(product.uuid, product, counter)}
      uuid={product.uuid}
      sellerId={product.sellerId}
      productURL={product.productURL}
      onClick={() =>
        setCurrentPage({
          view: 'product-details',
          title: t('product_details.title'),
          props: { product },
        })
      }
    />
  );
}

ProductCatalogItem.propTypes = {
  product: PropTypes.object.isRequired,
  inConversation: PropTypes.bool,
};
