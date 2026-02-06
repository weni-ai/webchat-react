import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useWeniChat } from '@/hooks/useWeniChat';

import Button from '@/components/common/Button';
import { InlineProduct } from '@/components/Product/InlineProduct';

import './ShowItems.scss';

export function ShowItems({
  buttonText,
  header,
  productList,
  disabled = false,
}) {
  const { setCurrentPage } = useWeniChat();
  const { t } = useTranslation();

  // Transform sections to productGroups format expected by ProductCatalog
  const productGroups = useMemo(() => {
    if (!productList?.sections) return [];

    return productList.sections.map((section) => ({
      title: section.title,
      products: section.product_items.map((item) => ({
        uuid: item.product_retailer_id,
        image: item.image,
        title: item.name,
        description: item.description,
        price: item.price,
        salePrice: item.sale_price,
        sellerId: item.seller_id,
      })),
    }));
  }, [productList]);

  // Calculate total items across all sections
  const totalItems = useMemo(() => {
    return productGroups.reduce((acc, group) => acc + group.products.length, 0);
  }, [productGroups]);

  const firstImage = useMemo(() => {
    return productGroups?.[0]?.products?.[0]?.image;
  }, [productGroups]);

  const catalogTitle = header || t('show_items.catalog_title');

  return (
    <section className="weni-show-items">
      <InlineProduct
        image={firstImage}
        title={catalogTitle}
        lines={[
          `${totalItems} ${t('show_items.items', { count: totalItems })}`,
        ]}
      />

      <Button
        className="weni-show-items__button"
        key={buttonText}
        variant="secondary"
        disabled={disabled}
        onClick={() =>
          setCurrentPage({
            view: 'product-catalog',
            title: catalogTitle,
            props: {
              productGroups,
            },
          })
        }
      >
        {buttonText}
      </Button>
    </section>
  );
}

ShowItems.propTypes = {
  buttonText: PropTypes.string.isRequired,
  header: PropTypes.string,
  productList: PropTypes.shape({
    buttonText: PropTypes.string,
    sections: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        product_items: PropTypes.arrayOf(
          PropTypes.shape({
            product_retailer_id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            price: PropTypes.string.isRequired,
            sale_price: PropTypes.string,
            image: PropTypes.string.isRequired,
            description: PropTypes.string,
            seller_id: PropTypes.string,
          }),
        ).isRequired,
      }),
    ).isRequired,
  }).isRequired,
  disabled: PropTypes.bool,
};
