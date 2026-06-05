/* eslint-disable react/prop-types */
import { render, screen } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: jest.fn(),
}));

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('@/components/Product/CounterControls', () => ({
  CounterControls: ({ uuid, sellerId, productName, className }) => (
    <button
      type="button"
      data-testid="counter-controls"
      data-uuid={uuid}
      data-seller-id={sellerId}
      data-product-name={productName}
      className={className}
    />
  ),
}));

jest.mock('@/components/Product/PriceDisplay', () => ({
  PriceDisplay: ({ price, currency }) => (
    <span data-testid="price-display">{`${currency}:${price}`}</span>
  ),
}));

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';
import { ProductCarousel } from './ProductCarousel';

const productItems = [
  {
    product_retailer_id: '1276545',
    seller_id: '1',
    name: 'A long long long long long product text',
    price: 53.99,
    image: 'https://example.com/shoe-1.jpg',
  },
  {
    product_retailer_id: '9876543',
    seller_id: '2',
    name: 'Brooks Ghost 16 Weatherized',
    price: 299,
    image: 'https://example.com/shoe-2.jpg',
  },
];

beforeEach(() => {
  useWeniChat.mockReturnValue({ setCurrentPage: jest.fn() });
  useChatContext.mockReturnValue({
    cart: {},
    setCart: jest.fn(),
  });
});

describe('ProductCarousel', () => {
  it('renders one card per product item', () => {
    render(<ProductCarousel productItems={productItems} />);

    expect(screen.getByTestId('product-carousel')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('renders product titles including long text', () => {
    render(<ProductCarousel productItems={productItems} />);

    expect(
      screen.getByText('A long long long long long product text'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Brooks Ghost 16 Weatherized'),
    ).toBeInTheDocument();
  });

  it('passes uuid and sellerId to CounterControls', () => {
    render(<ProductCarousel productItems={productItems} />);

    const controls = screen.getAllByTestId('counter-controls');
    expect(controls[0]).toHaveAttribute('data-uuid', '1276545');
    expect(controls[0]).toHaveAttribute('data-seller-id', '1');
    expect(controls[1]).toHaveAttribute('data-uuid', '9876543');
    expect(controls[1]).toHaveAttribute('data-seller-id', '2');
  });

  it('applies disabled styling class to cards when disabled', () => {
    render(
      <ProductCarousel
        productItems={productItems}
        disabled
      />,
    );

    screen.getAllByRole('article').forEach((card) => {
      expect(card).toHaveClass('weni-product-carousel-card--disabled');
    });
  });
});
