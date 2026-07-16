import { render, screen } from '@testing-library/react';
import { Chat } from './Chat';

jest.mock('@/hooks/useVtexCxVisualViewportCssVars', () => ({
  useVtexCxVisualViewportCssVars: jest.fn(),
}));

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: jest.fn(),
}));

jest.mock('@/contexts/OrderFormContext', () => ({
  OrderFormProvider: ({ children }) => children,
}));

jest.mock('@/components/Header/Header', () => () => (
  <div data-testid="header" />
));
jest.mock('@/components/Messages/MessagesList', () => () => (
  <div data-testid="messages-list" />
));
jest.mock('@/components/Input/InputBox', () => () => (
  <div data-testid="input-box" />
));
jest.mock('@/components/common/PoweredBy', () => () => null);
jest.mock('@/components/AlreadyInUse/AlreadyInUse', () => () => (
  <div data-testid="already-in-use" />
));
jest.mock('@/views/ListMessage', () => ({
  ListMessage: () => <div data-testid="list-message" />,
}));
jest.mock('@/views/ProductCatalog', () => ({
  ProductCatalog: () => <div data-testid="product-catalog" />,
}));
jest.mock('@/views/ProductDetails', () => ({
  ProductDetails: () => <div data-testid="product-details" />,
}));
jest.mock('@/views/Cart', () => ({
  Cart: () => <div data-testid="cart" />,
}));
jest.mock('@/views/BackInStockNotify', () => ({
  BackInStockNotify: ({ productName }) => (
    <div data-testid="back-in-stock-notify">{productName}</div>
  ),
}));

import { useWeniChat } from '@/hooks/useWeniChat';

describe('Chat — back-in-stock-notify view', () => {
  it('renders BackInStockNotify when currentPage.view matches', () => {
    useWeniChat.mockReturnValue({
      isChatOpen: true,
      isConnectionClosed: false,
      currentPage: {
        view: 'back-in-stock-notify',
        props: { productName: 'Cool Shoe' },
      },
      config: { embedded: false },
      mode: 'live',
    });

    render(<Chat />);

    expect(screen.getByTestId('back-in-stock-notify')).toHaveTextContent(
      'Cool Shoe',
    );
    expect(screen.queryByTestId('messages-list')).not.toBeInTheDocument();
  });
});
