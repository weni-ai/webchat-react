import { render, screen } from '@testing-library/react';

import { MessageOrder } from './MessageOrder';

function orderMessage(productItems) {
  return {
    order: { product_items: productItems },
  };
}

describe('MessageOrder', () => {
  it('uses the first product image as the order thumbnail', () => {
    render(
      <MessageOrder
        message={orderMessage([
          {
            product_retailer_id: 'sku-1',
            name: 'Empty',
            price: '10',
            image: '',
          },
          {
            product_retailer_id: 'sku-2',
            name: 'Shoe',
            price: '20',
            image: 'https://cdn.example/shoe.webp',
          },
        ])}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://cdn.example/shoe.webp',
    );
  });
});
