import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) =>
      options?.count != null ? `${key}:${options.count}` : key,
  }),
}));

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: jest.fn(),
}));

jest.mock('@/views/ProductCatalog', () => ({
  ProductCatalogItem: ({ product, inConversation }) => (
    <div data-testid="single-product">
      {product.title}:{String(inConversation)}
    </div>
  ),
}));

jest.mock('@/components/Product/InlineProduct', () => ({
  InlineProduct: ({ title, lines, button, image }) => (
    <div data-testid="catalog-card">
      <span>{title}</span>
      <span data-testid="lines">{lines.join('|')}</span>
      <span data-testid="image">{image}</span>
      {button}
    </div>
  ),
}));

jest.mock('@/components/common/FSButton', () => ({
  FSButton: ({ children, onClick, disabled }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

import { useWeniChat } from '@/hooks/useWeniChat';
import { ShowItems } from './ShowItems';

const item = (overrides = {}) => ({
  product_retailer_id: 'sku-1',
  image: 'https://example.com/1.png',
  name: 'Runner',
  description: 'A shoe',
  price: '10',
  sale_price: '8',
  currency: 'BRL',
  seller_id: '1',
  product_url: 'https://store.example/p/1',
  ...overrides,
});

describe('ShowItems', () => {
  const setCurrentPage = jest.fn();

  beforeEach(() => {
    setCurrentPage.mockReset();
    useWeniChat.mockReturnValue({ setCurrentPage });
  });

  it('renders a single product in conversation when there is only one item', () => {
    render(
      <ShowItems
        buttonText="View"
        productList={{
          sections: [{ title: 'Shoes', product_items: [item()] }],
        }}
      />,
    );
    expect(screen.getByTestId('single-product')).toHaveTextContent(
      'Runner:true',
    );
    expect(screen.queryByTestId('catalog-card')).not.toBeInTheDocument();
  });

  it('renders a catalog card for multiple items and opens the catalog', () => {
    render(
      <ShowItems
        buttonText="See all"
        header="Custom catalog"
        productList={{
          sections: [
            { title: 'Shoes', product_items: [item()] },
            {
              title: 'Hats',
              product_items: [item({ product_retailer_id: 'sku-2', name: 'Cap' })],
            },
          ],
        }}
      />,
    );

    expect(screen.getByTestId('catalog-card')).toBeInTheDocument();
    expect(screen.getByText('Custom catalog')).toBeInTheDocument();
    expect(screen.getByTestId('lines')).toHaveTextContent(
      '2 show_items.items:2',
    );
    expect(screen.getByTestId('image')).toHaveTextContent(
      'https://example.com/1.png',
    );

    fireEvent.click(screen.getByText('See all'));
    expect(setCurrentPage).toHaveBeenCalledWith({
      view: 'product-catalog',
      title: 'Custom catalog',
      props: {
        productGroups: [
          {
            title: 'Shoes',
            products: [
              {
                uuid: 'sku-1',
                image: 'https://example.com/1.png',
                title: 'Runner',
                description: 'A shoe',
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
                uuid: 'sku-2',
                image: 'https://example.com/1.png',
                title: 'Cap',
                description: 'A shoe',
                price: '10',
                salePrice: '8',
                currency: 'BRL',
                sellerId: '1',
                productURL: 'https://store.example/p/1',
              },
            ],
          },
        ],
      },
    });
  });

  it('uses the default catalog title when header is omitted', () => {
    render(
      <ShowItems
        buttonText="Open"
        productList={{
          sections: [
            {
              title: 'All',
              product_items: [item(), item({ product_retailer_id: 'sku-2' })],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('show_items.catalog_title')).toBeInTheDocument();
  });

  it('disables the catalog button when requested', () => {
    render(
      <ShowItems
        buttonText="Open"
        disabled
        productList={{
          sections: [
            {
              title: 'All',
              product_items: [item(), item({ product_retailer_id: 'sku-2' })],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('Open')).toBeDisabled();
  });

  it('renders an empty catalog card when sections are missing', () => {
    render(
      <ShowItems
        buttonText="Open"
        productList={{}}
      />,
    );
    expect(screen.getByTestId('catalog-card')).toBeInTheDocument();
    expect(screen.getByTestId('lines')).toHaveTextContent(
      '0 show_items.items:0',
    );
  });

  it('stops click propagation from the catalog button', () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <ShowItems
          buttonText="Open"
          productList={{
            sections: [
              {
                title: 'All',
                product_items: [item(), item({ product_retailer_id: 'sku-2' })],
              },
            ],
          }}
        />
      </div>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
