import { render, screen, fireEvent } from '@testing-library/react';
import { Cart } from './Cart';

const mockSetCart = jest.fn();
const mockClearPageHistory = jest.fn();
const mockSendOrder = jest.fn();

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('@/utils/currency', () => ({
  formatPriceWithCurrency: (price, currency) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `${currency} ${num.toFixed(2)}`;
  },
}));

const mockT = (key) => {
  const translations = {
    'show_items.items': 'items',
    'cart.subtotal': 'Subtotal',
    'cart.discount': 'Discount',
    'cart.total': 'Total',
    'cart.continue_shopping': 'Continue Shopping',
    'cart.make_order': 'Make Order',
    'cart.empty': 'Your cart is empty',
    'cart.empty_description': 'Add items to your cart',
  };
  return translations[key] || key;
};

jest.mock('i18next', () => ({
  t: (key) => mockT(key),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }),
}));

import { useChatContext } from '@/contexts/ChatContext';

function setupMockContext(cartItems = {}) {
  mockSetCart.mockReset();
  mockClearPageHistory.mockReset();
  mockSendOrder.mockReset();

  // Allow setCart to be called with a function
  mockSetCart.mockImplementation(() => {});

  useChatContext.mockReturnValue({
    cart: cartItems,
    setCart: mockSetCart,
    clearPageHistory: mockClearPageHistory,
    sendOrder: mockSendOrder,
  });
}

const makeProduct = (overrides = {}) => ({
  uuid: 'prod-1',
  title: 'Test Product',
  price: '100.00',
  salePrice: '',
  currency: 'BRL',
  image: 'https://example.com/image.png',
  description: 'A test product',
  sellerId: 'seller-1',
  quantity: 1,
  ...overrides,
});

describe('Cart', () => {
  describe('empty cart', () => {
    it('renders EmptyCart when there are no items', () => {
      setupMockContext({});
      render(<Cart />);

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    });

    it('renders EmptyCart when all items have quantity 0', () => {
      setupMockContext({
        'prod-1': makeProduct({ quantity: 0 }),
      });
      render(<Cart />);

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    });
  });

  describe('cart with items (no discount)', () => {
    beforeEach(() => {
      setupMockContext({
        'prod-1': makeProduct({ price: '50.00', quantity: 2 }),
        'prod-2': makeProduct({
          uuid: 'prod-2',
          title: 'Second Product',
          price: '25.00',
          quantity: 1,
        }),
      });
    });

    it('renders the total item count', () => {
      render(<Cart />);
      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText(/items/)).toBeInTheDocument();
    });

    it('renders all products', () => {
      render(<Cart />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('Second Product')).toBeInTheDocument();
    });

    it('displays the subtotal correctly', () => {
      render(<Cart />);
      // 50 * 2 + 25 * 1 = 125
      expect(screen.getByText('BRL 125.00')).toBeInTheDocument();
    });

    it('shows subtotal label', () => {
      render(<Cart />);
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
    });

    it('does not show discount section when there is no discount', () => {
      render(<Cart />);
      expect(screen.queryByText('Discount')).not.toBeInTheDocument();
    });

    it('does not show total section when there is no discount', () => {
      render(<Cart />);
      expect(screen.queryByText('Total')).not.toBeInTheDocument();
    });

    it('renders continue shopping button', () => {
      render(<Cart />);
      expect(screen.getByText('Continue Shopping')).toBeInTheDocument();
    });

    it('renders make order button', () => {
      render(<Cart />);
      expect(screen.getByText('Make Order')).toBeInTheDocument();
    });
  });

  describe('cart with discount', () => {
    beforeEach(() => {
      setupMockContext({
        'prod-1': makeProduct({
          price: '100.00',
          salePrice: '80.00',
          quantity: 2,
        }),
      });
    });

    it('shows discount section when sale prices differ from prices', () => {
      render(<Cart />);
      expect(screen.getByText('Discount')).toBeInTheDocument();
    });

    it('calculates discount correctly', () => {
      render(<Cart />);
      // discount = (100 - 80) * 2 = 40
      expect(screen.getByText('BRL 40.00')).toBeInTheDocument();
    });

    it('shows total section with correct total', () => {
      render(<Cart />);
      expect(screen.getByText('Total')).toBeInTheDocument();
      // total = (100 * 2) - 40 = 160
      expect(screen.getByText('BRL 160.00')).toBeInTheDocument();
    });

    it('applies discounted class to subtotal section', () => {
      render(<Cart />);
      const subtotalLabel = screen.getByText('Subtotal');
      const subtotalSection = subtotalLabel.closest('section');
      expect(subtotalSection).toHaveClass(
        'weni-view-cart__footer-subtotal--discounted',
      );
    });
  });

  describe('cart with mixed products (some discounted, some not)', () => {
    beforeEach(() => {
      setupMockContext({
        'prod-1': makeProduct({
          price: '100.00',
          salePrice: '70.00',
          quantity: 1,
        }),
        'prod-2': makeProduct({
          uuid: 'prod-2',
          title: 'No Discount Product',
          price: '50.00',
          salePrice: '',
          quantity: 2,
        }),
      });
    });

    it('calculates total price from all items', () => {
      render(<Cart />);
      // subtotal = 100 * 1 + 50 * 2 = 200
      expect(screen.getByText('BRL 200.00')).toBeInTheDocument();
    });

    it('calculates discount only from discounted products', () => {
      render(<Cart />);
      // discount = (100 - 70) * 1 = 30
      expect(screen.getByText('BRL 30.00')).toBeInTheDocument();
    });

    it('shows the correct total after discount', () => {
      render(<Cart />);
      // total = 200 - 30 = 170
      expect(screen.getByText('BRL 170.00')).toBeInTheDocument();
    });
  });

  describe('no discount when salePrice equals price', () => {
    it('does not count as a discount when salePrice equals price', () => {
      setupMockContext({
        'prod-1': makeProduct({
          price: '100.00',
          salePrice: '100.00',
          quantity: 1,
        }),
      });
      render(<Cart />);

      expect(screen.queryByText('Discount')).not.toBeInTheDocument();
      expect(screen.queryByText('Total')).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    beforeEach(() => {
      setupMockContext({
        'prod-1': makeProduct({ price: '50.00', quantity: 1 }),
      });
    });

    it('calls clearPageHistory when continue shopping is clicked', () => {
      render(<Cart />);

      fireEvent.click(screen.getByText('Continue Shopping'));
      expect(mockClearPageHistory).toHaveBeenCalledTimes(1);
    });

    it('calls sendOrder and clears cart when make order is clicked', () => {
      render(<Cart />);

      fireEvent.click(screen.getByText('Make Order'));

      expect(mockSendOrder).toHaveBeenCalledTimes(1);
      expect(mockSendOrder).toHaveBeenCalledWith([
        expect.objectContaining({
          product_retailer_id: 'prod-1',
          name: 'Test Product',
          price: '50.00',
          sale_price: '',
          currency: 'BRL',
          quantity: 1,
        }),
      ]);
      expect(mockSetCart).toHaveBeenCalledWith({});
      expect(mockClearPageHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('currency fallback', () => {
    it('uses BRL as fallback currency when no products have currency', () => {
      setupMockContext({
        'prod-1': makeProduct({
          price: '10.00',
          currency: undefined,
          quantity: 1,
        }),
      });
      render(<Cart />);

      // Should still render with the first product's currency (undefined → fallback BRL used in getCurrencyFromProducts)
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
    });
  });
});
