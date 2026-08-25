/* eslint-disable react/prop-types */
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('@/contexts/OrderFormContext', () => ({
  useOrderForm: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) =>
      options?.count !== undefined ? `${key}:${options.count}` : key,
  }),
}));

jest.mock('@/components/Product/InlineProduct', () => ({
  InlineProduct: ({
    variant,
    title,
    counter,
    setCounter,
    onClick,
    productURL,
  }) => (
    <div>
      <span data-testid={`product-${title}`}>{title}</span>
      <span data-testid={`variant-${title}`}>{variant}</span>
      <span data-testid={`counter-${title}`}>{counter}</span>
      <span data-testid={`url-${title}`}>{productURL}</span>
      <button
        type="button"
        onClick={onClick}
      >
        open {title}
      </button>
      <button
        type="button"
        onClick={() => setCounter(counter + 1)}
      >
        increment {title}
      </button>
    </div>
  ),
}));

import { useChatContext } from '@/contexts/ChatContext';
import { useOrderForm } from '@/contexts/OrderFormContext';
import { ProductCatalog, ProductCatalogItem } from './ProductCatalog';

const groups = [
  {
    title: 'Shoes',
    products: [
      {
        uuid: 'sku-1#1',
        title: 'Runner',
        image: 'https://example.com/1.png',
        price: '10',
        salePrice: '8',
        currency: 'BRL',
        sellerId: '1',
        productURL: 'https://store.example/p/1',
      },
    ],
  },
  {
    title: 'Hats',
    products: [
      {
        uuid: 'sku-2#1',
        title: 'Cap',
        image: 'https://example.com/2.png',
        price: '20',
        currency: 'BRL',
        sellerId: '1',
      },
    ],
  },
];

function setup(overrides = {}) {
  const { pendingCartItems, ...chatOverrides } = overrides;
  const setCart = jest.fn();
  const setCurrentPage = jest.fn();
  const clearPageHistory = jest.fn();
  useChatContext.mockReturnValue({
    cart: {},
    setCart,
    setCurrentPage,
    clearPageHistory,
    isInsideVTEXStore: false,
    config: { addToCart: false },
    ...chatOverrides,
  });
  useOrderForm.mockReturnValue({
    pendingCartItems: pendingCartItems ?? {},
  });
  return { setCart, setCurrentPage, clearPageHistory };
}

describe('ProductCatalog', () => {
  it('renders every group and product', () => {
    setup();
    render(<ProductCatalog productGroups={groups} />);
    expect(screen.getByText('Shoes')).toBeInTheDocument();
    expect(screen.getByText('Hats')).toBeInTheDocument();
    expect(screen.getByTestId('product-Runner')).toBeInTheDocument();
    expect(screen.getByTestId('product-Cap')).toBeInTheDocument();
  });

  it('hides the see-cart footer when the cart is empty', () => {
    setup();
    render(<ProductCatalog productGroups={groups} />);
    expect(screen.queryByText(/cart.see_cart/)).not.toBeInTheDocument();
  });

  it('opens the cart from the footer when there are items', () => {
    const { setCurrentPage } = setup({
      cart: { 'sku-1#1': { quantity: 2 } },
    });
    render(<ProductCatalog productGroups={groups} />);
    fireEvent.click(screen.getByText('cart.see_cart (2)'));
    expect(setCurrentPage).toHaveBeenCalledWith({
      view: 'cart',
      title: 'cart.title',
    });
  });

  it('hides the see-cart footer inside a VTEX store even with items', () => {
    setup({
      isInsideVTEXStore: true,
      cart: { 'sku-1#1': { quantity: 2 } },
    });
    render(<ProductCatalog productGroups={groups} />);
    expect(screen.queryByText(/cart.see_cart/)).not.toBeInTheDocument();
  });

  it('shows a disabled add-items footer in a VTEX store with addToCart and no pending items', () => {
    setup({
      isInsideVTEXStore: true,
      config: { addToCart: true },
    });
    render(<ProductCatalog productGroups={groups} />);
    expect(
      screen.getByText('product_catalog.items_selected:0'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'product_catalog.add_items_and_return',
      }),
    ).toBeDisabled();
    expect(screen.queryByText(/cart.see_cart/)).not.toBeInTheDocument();
  });

  it('enables the add-items footer for a single pending catalog unit', () => {
    setup({
      isInsideVTEXStore: true,
      config: { addToCart: true },
      pendingCartItems: {
        'sku-1#1': { origin: 'catalog', quantity: 1 },
      },
    });
    render(<ProductCatalog productGroups={groups} />);
    expect(
      screen.getByText('product_catalog.items_selected:1'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'product_catalog.add_items_and_return',
      }),
    ).toBeEnabled();
  });

  it('sums pending catalog quantities and returns to conversation on click', () => {
    const { clearPageHistory } = setup({
      isInsideVTEXStore: true,
      config: { addToCart: true },
      pendingCartItems: {
        'sku-1#1': { origin: 'catalog', quantity: 2 },
        'sku-2#1': { origin: 'catalog', quantity: 1 },
      },
    });
    render(<ProductCatalog productGroups={groups} />);
    expect(
      screen.getByText('product_catalog.items_selected:3'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'product_catalog.add_items_and_return',
      }),
    );
    expect(clearPageHistory).toHaveBeenCalledTimes(1);
  });

  it('ignores conversation-origin and zero-quantity pending items', () => {
    setup({
      isInsideVTEXStore: true,
      config: { addToCart: true },
      pendingCartItems: {
        'sku-1#1': { origin: 'conversation', quantity: 4 },
        'sku-2#1': { origin: 'catalog', quantity: 0 },
      },
    });
    render(<ProductCatalog productGroups={groups} />);
    expect(
      screen.getByText('product_catalog.items_selected:0'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'product_catalog.add_items_and_return',
      }),
    ).toBeDisabled();
  });

  it('hides the add-items footer outside a VTEX store', () => {
    setup({
      config: { addToCart: true },
      cart: { 'sku-1#1': { quantity: 2 } },
    });
    render(<ProductCatalog productGroups={groups} />);
    expect(
      screen.queryByText('product_catalog.add_items_and_return'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('cart.see_cart (2)')).toBeInTheDocument();
  });
});

describe('ProductCatalogItem', () => {
  it('uses the catalog variant by default and opens product details', () => {
    const { setCurrentPage } = setup();
    render(<ProductCatalogItem product={groups[0].products[0]} />);
    expect(screen.getByTestId('variant-Runner')).toHaveTextContent('product');
    fireEvent.click(screen.getByText('open Runner'));
    expect(setCurrentPage).toHaveBeenCalledWith({
      view: 'product-details',
      title: 'product_details.title',
      props: { product: groups[0].products[0] },
    });
  });

  it('uses the conversation variant when requested', () => {
    setup();
    render(
      <ProductCatalogItem
        product={groups[0].products[0]}
        inConversation
      />,
    );
    expect(screen.getByTestId('variant-Runner')).toHaveTextContent(
      'product-in-conversation',
    );
  });

  it('reads quantity from the cart and updates it', () => {
    const { setCart } = setup({
      cart: { 'sku-1#1': { quantity: 3 } },
    });
    render(<ProductCatalogItem product={groups[0].products[0]} />);
    expect(screen.getByTestId('counter-Runner')).toHaveTextContent('3');
    fireEvent.click(screen.getByText('increment Runner'));
    const updater = setCart.mock.calls[0][0];
    expect(updater({})).toEqual({
      'sku-1#1': { ...groups[0].products[0], quantity: 4 },
    });
  });
});
