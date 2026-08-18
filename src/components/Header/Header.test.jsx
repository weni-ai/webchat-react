import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: jest.fn(),
}));

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';
import { Header, HeaderTitle } from './Header';

function setup({
  weniChat = {},
  chatContext = {},
} = {}) {
  const defaults = {
    toggleChat: jest.fn(),
    isChatFullscreen: false,
    toggleChatFullscreen: jest.fn(),
    currentPage: null,
    setCurrentPage: jest.fn(),
    goBack: jest.fn(),
    cart: {},
  };
  const contextDefaults = {
    config: {
      showMode: false,
      mode: 'live',
      addToCart: false,
      showFullScreenButton: false,
      showCloseButton: false,
    },
    isInsideVTEXStore: false,
  };

  useWeniChat.mockReturnValue({ ...defaults, ...weniChat });
  useChatContext.mockReturnValue({
    ...contextDefaults,
    ...chatContext,
    config: { ...contextDefaults.config, ...chatContext.config },
  });

  return {
    ...defaults,
    ...weniChat,
    setCurrentPage: weniChat.setCurrentPage ?? defaults.setCurrentPage,
    goBack: weniChat.goBack ?? defaults.goBack,
    toggleChat: weniChat.toggleChat ?? defaults.toggleChat,
    toggleChatFullscreen:
      weniChat.toggleChatFullscreen ?? defaults.toggleChatFullscreen,
  };
}

describe('Header', () => {
  it('hides the back button when there is no current page', () => {
    setup();
    render(<Header />);
    expect(screen.queryByLabelText('Back')).not.toBeInTheDocument();
  });

  it('hides the back button when goBack is missing', () => {
    setup({
      weniChat: { currentPage: { view: 'cart' }, goBack: null },
    });
    render(<Header />);
    expect(screen.queryByLabelText('Back')).not.toBeInTheDocument();
  });

  it('calls goBack when the back button is clicked', () => {
    const helpers = setup({
      weniChat: { currentPage: { view: 'cart' } },
    });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('Back'));
    expect(helpers.goBack).toHaveBeenCalledTimes(1);
  });

  it('renders the mode tag when showMode is enabled', () => {
    setup({
      chatContext: { config: { showMode: true, mode: 'preview' } },
    });
    render(<Header />);
    expect(screen.getByText('mode.preview.title')).toBeInTheDocument();
  });

  it('hides the cart button when the cart is empty', () => {
    setup();
    render(<Header />);
    expect(screen.queryByLabelText('Cart')).not.toBeInTheDocument();
  });

  it('opens the cart page when the cart button is clicked', () => {
    const helpers = setup({
      weniChat: {
        cart: {
          a: { quantity: 1 },
          b: { quantity: 2 },
        },
      },
    });
    render(<Header />);
    expect(screen.getByLabelText('Cart')).toHaveTextContent('3');
    fireEvent.click(screen.getByLabelText('Cart'));
    expect(helpers.setCurrentPage).toHaveBeenCalledWith({
      view: 'cart',
      title: 'Carrinho',
    });
  });

  it('hides the cart button inside a VTEX store that adds to cart', () => {
    setup({
      weniChat: { cart: { a: { quantity: 1 } } },
      chatContext: {
        isInsideVTEXStore: true,
        config: { addToCart: true },
      },
    });
    render(<Header />);
    expect(screen.queryByLabelText('Cart')).not.toBeInTheDocument();
  });

  it('shows the cart button inside a VTEX store that does not add to cart', () => {
    setup({
      weniChat: { cart: { a: { quantity: 1 } } },
      chatContext: {
        isInsideVTEXStore: true,
        config: { addToCart: false },
      },
    });
    render(<Header />);
    expect(screen.getByLabelText('Cart')).toBeInTheDocument();
  });

  it('toggles fullscreen with the matching icon', () => {
    const helpers = setup({
      weniChat: { isChatFullscreen: true },
      chatContext: { config: { showFullScreenButton: true } },
    });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('Fullscreen chat'));
    expect(helpers.toggleChatFullscreen).toHaveBeenCalledTimes(1);
  });

  it('uses the open fullscreen icon when the chat is not fullscreen', () => {
    setup({
      chatContext: { config: { showFullScreenButton: true } },
    });
    render(<Header />);
    expect(screen.getByLabelText('Fullscreen chat')).toBeInTheDocument();
  });

  it('closes the chat when the close button is clicked', () => {
    const helpers = setup({
      chatContext: { config: { showCloseButton: true } },
    });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('Close chat'));
    expect(helpers.toggleChat).toHaveBeenCalledTimes(1);
  });
});

describe('HeaderTitle', () => {
  it('renders the title without a subtitle', () => {
    render(<HeaderTitle title="Support" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Support' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(
      <HeaderTitle
        title="Support"
        subtitle="Online"
      />,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Online' }),
    ).toBeInTheDocument();
  });
});
