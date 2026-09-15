import { render, screen } from '@testing-library/react';
import { Chat } from './Chat';

/* eslint-disable react/prop-types -- jest.mock factories use stub components */

jest.mock('@/hooks/useVtexCxVisualViewportCssVars', () => ({
  useVtexCxVisualViewportCssVars: jest.fn(),
}));

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: jest.fn(),
}));

jest.mock('@/contexts/OrderFormContext', () => ({
  OrderFormProvider: ({ children }) => children,
}));

jest.mock('@/components/Header/Header', () => {
  function MockHeader() {
    return <div data-testid="header" />;
  }
  return MockHeader;
});

jest.mock('@/components/Messages/MessagesList', () => {
  function MockMessagesList() {
    return <div data-testid="messages-list" />;
  }
  return MockMessagesList;
});

jest.mock('@/components/Input/InputBox', () => {
  function MockInputBox() {
    return <div data-testid="input-box" />;
  }
  return MockInputBox;
});

jest.mock('@/components/common/PoweredBy', () => {
  function MockPoweredBy() {
    return null;
  }
  return MockPoweredBy;
});

jest.mock('@/components/AlreadyInUse/AlreadyInUse', () => {
  function MockAlreadyInUse() {
    return <div data-testid="already-in-use" />;
  }
  return MockAlreadyInUse;
});

jest.mock('@/views/ListMessage', () => ({
  ListMessage: function MockListMessage() {
    return <div data-testid="list-message" />;
  },
}));

jest.mock('@/views/ProductCatalog', () => ({
  ProductCatalog: function MockProductCatalog() {
    return <div data-testid="product-catalog" />;
  },
}));

jest.mock('@/views/ProductDetails', () => ({
  ProductDetails: function MockProductDetails() {
    return <div data-testid="product-details" />;
  },
}));

jest.mock('@/views/Cart', () => ({
  Cart: function MockCart() {
    return <div data-testid="cart" />;
  },
}));

jest.mock('@/views/BackInStockNotify', () => {
  function MockBackInStockNotify({ productName }) {
    return <div data-testid="back-in-stock-notify">{productName}</div>;
  }

  return { BackInStockNotify: MockBackInStockNotify };
});

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
