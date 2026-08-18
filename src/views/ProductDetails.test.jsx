import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('@/utils/currency', () => ({
  formatPriceWithCurrency: (price, currency) => `${currency}:${price}`,
}));

jest.mock('@/components/Product/CounterControls', () => ({
  CounterControls: ({ setCounter, counter }) => (
    <button
      type="button"
      data-testid="counter"
      onClick={() => setCounter(counter + 1)}
    >
      {counter}
    </button>
  ),
}));

import { useChatContext } from '@/contexts/ChatContext';
import { ProductDetails } from './ProductDetails';

const product = {
  uuid: 'sku#seller',
  title: 'Blue shoe',
  image: 'https://example.com/shoe.png',
  description: 'A comfortable shoe',
  price: '99.90',
  currency: 'BRL',
  sellerId: '1',
};

function setup(overrides = {}) {
  const setCart = jest.fn();
  const setCurrentPage = jest.fn();
  useChatContext.mockReturnValue({
    cart: {},
    setCart,
    setCurrentPage,
    isInsideVTEXStore: false,
    ...overrides,
  });
  return { setCart, setCurrentPage };
}

describe('ProductDetails', () => {
  it('renders product content and the add-to-cart button when quantity is zero', () => {
    setup();
    render(<ProductDetails product={product} />);
    expect(
      screen.getByRole('heading', { name: 'Blue shoe' }),
    ).toBeInTheDocument();
    expect(screen.getByText('A comfortable shoe')).toBeInTheDocument();
    expect(screen.getByText('BRL:99.90')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Blue shoe' })).toHaveAttribute(
      'src',
      product.image,
    );
    expect(screen.getByText('product_details.add_to_cart')).toBeInTheDocument();
    expect(screen.queryByTestId('counter')).not.toBeInTheDocument();
  });

  it('adds the product to the cart with quantity 1', () => {
    const { setCart } = setup();
    render(<ProductDetails product={product} />);
    fireEvent.click(screen.getByText('product_details.add_to_cart'));
    expect(setCart).toHaveBeenCalledTimes(1);
    const updater = setCart.mock.calls[0][0];
    expect(updater({})).toEqual({
      'sku#seller': { ...product, quantity: 1 },
    });
  });

  it('shows counter and see-cart when the product is already in the cart', () => {
    const { setCurrentPage } = setup({
      cart: {
        'sku#seller': { ...product, quantity: 2 },
        other: { quantity: 1 },
      },
    });
    render(<ProductDetails product={product} />);
    expect(
      screen.queryByText('product_details.add_to_cart'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('counter')).toHaveTextContent('2');
    expect(screen.getByText('cart.see_cart (3)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('cart.see_cart (3)'));
    expect(setCurrentPage).toHaveBeenCalledWith({
      view: 'cart',
      title: 'cart.title',
    });
  });

  it('shows only the counter inside a VTEX store', () => {
    setup({
      isInsideVTEXStore: true,
      cart: {},
    });
    render(<ProductDetails product={product} />);
    expect(
      screen.queryByText('product_details.add_to_cart'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/cart.see_cart/)).not.toBeInTheDocument();
    expect(screen.getByTestId('counter')).toHaveTextContent('0');
  });

  it('updates quantity through the counter', () => {
    const { setCart } = setup({
      cart: { 'sku#seller': { ...product, quantity: 1 } },
    });
    render(<ProductDetails product={product} />);
    fireEvent.click(screen.getByTestId('counter'));
    const updater = setCart.mock.calls[0][0];
    expect(updater({})).toEqual({
      'sku#seller': { ...product, quantity: 2 },
    });
  });
});
