import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';

import Button from '@/components/common/Button';
import { InlineProduct } from '@/components/Product/InlineProduct';

const productGroups = [{
  title: 'Arroz Japonês',
  products: [
    {
      uuid: '1',
      image: 'https://phygital-files.mercafacil.com/catalogo/uploads/produto/arroz_parboilizado_tipo_1_camil_1kg_e3a06938-9c47-4030-bcbf-ae0e14ea4ab5.jpg',
      title: 'Arroz Japonês GUIN Importado 500g',
      description: 'Texto descritivo que não passa de uma linha',
      price: 'R$ 12,99',
    },
  ],
}, {
  title: 'Tofu',
  products: [
    {
      uuid: '2',
      image: 'https://phygital-files.mercafacil.com/catalogo/uploads/produto/arroz_parboilizado_tipo_1_camil_1kg_e3a06938-9c47-4030-bcbf-ae0e14ea4ab5.jpg',
      title: 'Tofu Fresco Ecobras 270g',
      description: 'Texto descritivo que não passa de uma linha',
      price: 'R$ 23,99',
    },
    {
      uuid: '3',
      image: 'https://phygital-files.mercafacil.com/catalogo/uploads/produto/arroz_parboilizado_tipo_1_camil_1kg_e3a06938-9c47-4030-bcbf-ae0e14ea4ab5.jpg',
      title: 'Tofu Defumado Ecobras 100g',
      description: 'Texto descritivo que não passa de uma linha',
      price: 'R$ 32,99',
    },
  ],
}];

import './ShowItems.scss';
import { useMemo } from 'react';
export function ShowItems({ buttonText, disabled = false }) {
  const { setCurrentPage } = useWeniChat();

  const firstImage = useMemo(() => {
    return productGroups?.[0]?.products?.[0]?.image;
  }, [productGroups]);

  return (
    <section className="weni-show-items">
      <InlineProduct
        image={firstImage}
        title={'Produtos disponíveis para seu CEP'}
        lines={['9 itens']}
      />
      
      <Button
        className="weni-show-items__button"
        key={buttonText}
        variant="secondary"
        disabled={disabled}
        onClick={() =>
          setCurrentPage({
            view: 'product-catalog',
            title: 'Produtos disponíveis para seu CEP',
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
  disabled: PropTypes.bool,
};
