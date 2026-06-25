/* eslint-disable react/prop-types */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CounterControls } from './CounterControls';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/contexts/OrderFormContext', () => ({
  useOrderForm: jest.fn(),
}));

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('@/utils/vtex', () => ({
  getVtexAccount: jest.fn(() => 'mystore'),
  isFastStoreHost: jest.fn(() => false),
}));

jest.mock('@/utils/throttleCustomField', () => ({
  createThrottledCustomFieldSetter: jest.fn(() => jest.fn()),
}));

jest.mock('@/components/common/Button', () => ({
  __esModule: true,
  default: ({ icon, onClick, disabled, size }) => (
    <button
      type="button"
      data-testid={`btn-${icon}`}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
    />
  ),
  Button: ({ icon, onClick, disabled, size }) => (
    <button
      type="button"
      data-testid={`btn-${icon}`}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
    />
  ),
}));

jest.mock('@/components/common/FSButton', () => ({
  FSButton: ({ children, onClick, isLoading, disabled, icon, variant }) => (
    <button
      type="button"
      data-testid="fs-button"
      data-icon={icon}
      data-variant={variant}
      data-loading={String(isLoading)}
      onClick={onClick}
      disabled={isLoading || disabled}
    >
      {children}
    </button>
  ),
}));

jest.mock('../common/FSButton', () => ({
  FSButton: ({ children, onClick, isLoading, disabled, icon, variant }) => (
    <button
      type="button"
      data-testid="fs-button"
      data-icon={icon}
      data-variant={variant}
      data-loading={String(isLoading)}
      onClick={onClick}
      disabled={isLoading || disabled}
    >
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Import mocked modules after jest.mock() declarations
// ---------------------------------------------------------------------------

import { useOrderForm } from '@/contexts/OrderFormContext';
import { useChatContext } from '@/contexts/ChatContext';
import { isFastStoreHost } from '@/utils/vtex';
import { UTM_SOURCES } from '@/utils/sendVtexUtm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOrderForm(overrides = {}) {
  return {
    orderFormId: null,
    isLoadingOrderForm: false,
    requestOrderForm: jest.fn(),
    trySyncHostCart: jest.fn(),
    bootstrapFastStoreOrderForm: jest.fn(() => Promise.resolve('bootstrapped')),
    ...overrides,
  };
}

function buildChatContext(overrides = {}) {
  return {
    addProductToCart: jest.fn(() => Promise.resolve()),
    config: { addToCart: false },
    addConversationStatus: jest.fn(),
    setCustomField: jest.fn(),
    sendUtm: jest.fn(),
    isInsideVTEXStore: false,
    ...overrides,
  };
}

function renderCounter(props = {}) {
  const defaults = {
    counter: 0,
    setCounter: jest.fn(),
  };
  return render(
    <CounterControls
      {...defaults}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  useOrderForm.mockReturnValue(buildOrderForm());
  useChatContext.mockReturnValue(buildChatContext());
  isFastStoreHost.mockReturnValue(false);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Counter controls — basic rendering
// ---------------------------------------------------------------------------

describe('CounterControls — counter mode rendering', () => {
  it('renders the counter section', () => {
    const { container } = renderCounter();
    expect(
      container.querySelector('.weni-product-quantity-controls'),
    ).toBeInTheDocument();
  });

  it('applies the size modifier class', () => {
    const { container } = renderCounter({ size: 'medium' });
    expect(
      container.querySelector('.weni-product-quantity-controls--medium'),
    ).toBeInTheDocument();
  });

  it('applies a custom className', () => {
    const { container } = renderCounter({ className: 'my-class' });
    expect(
      container.querySelector('.weni-product-quantity-controls'),
    ).toHaveClass('my-class');
  });

  it('shows the add button when hideWhenNotInteracted is false', () => {
    renderCounter({ hideWhenNotInteracted: false });
    expect(screen.getByTestId('btn-add')).toBeInTheDocument();
  });

  it('shows the minus button when hideWhenNotInteracted is false', () => {
    renderCounter({ hideWhenNotInteracted: false, counter: 0 });
    expect(screen.getByTestId('btn-minus')).toBeInTheDocument();
  });

  it('does not render the counter value when counter is 0', () => {
    renderCounter({ counter: 0 });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders the counter value when counter is greater than 0', () => {
    renderCounter({ counter: 3 });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls requestOrderForm on mount', () => {
    const requestOrderForm = jest.fn();
    useOrderForm.mockReturnValue(buildOrderForm({ requestOrderForm }));
    renderCounter();
    expect(requestOrderForm).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Counter controls — increment / decrement
// ---------------------------------------------------------------------------

describe('CounterControls — increment and decrement', () => {
  it('calls setCounter with counter + 1 when add is clicked', () => {
    const setCounter = jest.fn();
    renderCounter({ counter: 2, setCounter });
    fireEvent.click(screen.getByTestId('btn-add'));
    expect(setCounter).toHaveBeenCalledWith(3);
  });

  it('calls setCounter with counter - 1 when minus is clicked', () => {
    const setCounter = jest.fn();
    renderCounter({ counter: 2, setCounter });
    fireEvent.click(screen.getByTestId('btn-minus'));
    expect(setCounter).toHaveBeenCalledWith(1);
  });

  it('does not call setCounter below 0 when counter is 0', () => {
    const setCounter = jest.fn();
    renderCounter({ counter: 0, setCounter });
    fireEvent.click(screen.getByTestId('btn-minus'));
    expect(setCounter).not.toHaveBeenCalled();
  });

  it('stops event propagation on add button click', () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <CounterControls
          counter={0}
          setCounter={jest.fn()}
        />
      </div>,
    );
    fireEvent.click(screen.getByTestId('btn-add'));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('stops event propagation on minus button click', () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <CounterControls
          counter={1}
          setCounter={jest.fn()}
        />
      </div>,
    );
    fireEvent.click(screen.getByTestId('btn-minus'));
    expect(parentClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Counter controls — hideWhenNotInteracted behaviour
// ---------------------------------------------------------------------------

describe('CounterControls — hideWhenNotInteracted', () => {
  it('shows the add button when counter is 0 and not yet interacted', () => {
    renderCounter({ hideWhenNotInteracted: true, counter: 0 });
    expect(screen.getByTestId('btn-add')).toBeInTheDocument();
  });

  it('hides the minus button when not yet interacted', () => {
    renderCounter({ hideWhenNotInteracted: true, counter: 2 });
    expect(screen.queryByTestId('btn-minus')).not.toBeInTheDocument();
  });

  it('hides the add button when counter > 0 and not yet interacted', () => {
    renderCounter({ hideWhenNotInteracted: true, counter: 2 });
    expect(screen.queryByTestId('btn-add')).not.toBeInTheDocument();
  });

  it('shows both buttons after the value is clicked (triggers interaction)', () => {
    renderCounter({ hideWhenNotInteracted: true, counter: 2 });
    fireEvent.click(screen.getByText('2'));
    expect(screen.getByTestId('btn-add')).toBeInTheDocument();
    expect(screen.getByTestId('btn-minus')).toBeInTheDocument();
  });

  it('hides buttons again after 2s timeout following interaction', () => {
    const setCounter = jest.fn();
    renderCounter({ hideWhenNotInteracted: true, counter: 0, setCounter });

    fireEvent.click(screen.getByTestId('btn-add'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.queryByTestId('btn-minus')).not.toBeInTheDocument();
  });

  it('resets the 2s timeout when a new interaction occurs', () => {
    const setCounter = jest.fn();
    renderCounter({ hideWhenNotInteracted: true, counter: 0, setCounter });

    fireEvent.click(screen.getByTestId('btn-add'));
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    fireEvent.click(screen.getByTestId('btn-add'));
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByTestId('btn-add')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Add-to-cart mode — parseUuid / isAbleToAddProduct
// ---------------------------------------------------------------------------

describe('CounterControls — uuid parsing and add-to-cart eligibility', () => {
  beforeEach(() => {
    useOrderForm.mockReturnValue(buildOrderForm({ orderFormId: 'order-123' }));
    useChatContext.mockReturnValue(
      buildChatContext({
        config: { addToCart: true },
        isInsideVTEXStore: true,
      }),
    );
  });

  it('renders the FSButton when uuid contains skuId#sellerId', () => {
    renderCounter({ uuid: 'sku1#seller1' });
    expect(screen.getByTestId('fs-button')).toBeInTheDocument();
  });

  it('renders the FSButton when uuid is plain skuId and sellerId prop is supplied', () => {
    renderCounter({ uuid: 'sku1', sellerId: 'seller1' });
    expect(screen.getByTestId('fs-button')).toBeInTheDocument();
  });

  it('renders the counter section when uuid is plain and sellerId prop is absent', () => {
    renderCounter({ uuid: 'sku1' });
    expect(screen.queryByTestId('fs-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-add')).toBeInTheDocument();
  });

  it('renders the counter section when uuid is null', () => {
    renderCounter({ uuid: null });
    expect(screen.queryByTestId('fs-button')).not.toBeInTheDocument();
  });

  it('renders the counter section when isInsideVTEXStore is false', () => {
    useChatContext.mockReturnValue(
      buildChatContext({
        config: { addToCart: true },
        isInsideVTEXStore: false,
      }),
    );
    renderCounter({ uuid: 'sku1#seller1' });
    expect(screen.queryByTestId('fs-button')).not.toBeInTheDocument();
  });

  it('renders the counter section when orderFormId is absent', () => {
    useOrderForm.mockReturnValue(buildOrderForm({ orderFormId: null }));
    renderCounter({ uuid: 'sku1#seller1' });
    expect(screen.queryByTestId('fs-button')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Add-to-cart mode — FSButton rendering and interactions
// ---------------------------------------------------------------------------

describe('CounterControls — add-to-cart FSButton', () => {
  let addProductToCart;
  let addConversationStatus;
  let trySyncHostCart;
  let sendUtm;

  beforeEach(() => {
    addProductToCart = jest.fn(() => Promise.resolve());
    addConversationStatus = jest.fn();
    trySyncHostCart = jest.fn(() => Promise.resolve());
    sendUtm = jest.fn();

    useOrderForm.mockReturnValue(
      buildOrderForm({ orderFormId: 'order-123', trySyncHostCart }),
    );
    useChatContext.mockReturnValue(
      buildChatContext({
        config: { addToCart: true },
        isInsideVTEXStore: true,
        addProductToCart,
        addConversationStatus,
        sendUtm,
      }),
    );
  });

  it('renders "Add" label by default', () => {
    renderCounter({ uuid: 'sku1#seller1' });
    expect(screen.getByTestId('fs-button')).toHaveTextContent('Add');
  });

  it('renders the shopping_cart icon by default', () => {
    renderCounter({ uuid: 'sku1#seller1' });
    expect(screen.getByTestId('fs-button')).toHaveAttribute(
      'data-icon',
      'shopping_cart',
    );
  });

  it('shows loading spinner while the order form is loading', () => {
    useOrderForm.mockReturnValue(
      buildOrderForm({ orderFormId: 'order-123', isLoadingOrderForm: true }),
    );
    renderCounter({ uuid: 'sku1#seller1' });
    expect(screen.getByTestId('fs-button')).toHaveAttribute(
      'data-loading',
      'true',
    );
    expect(screen.getByTestId('fs-button')).toBeDisabled();
  });

  it('calls addProductToCart with the correct arguments on click', async () => {
    renderCounter({ uuid: 'sku1#seller1' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(addProductToCart).toHaveBeenCalledWith({
      VTEXAccountName: 'mystore',
      orderFormId: 'order-123',
      seller: 'seller1',
      id: 'sku1',
    });
    expect(sendUtm).toHaveBeenCalledWith(UTM_SOURCES.CART);
  });

  it('shows "Added" label and check_small icon after a successful add', async () => {
    renderCounter({ uuid: 'sku1#seller1' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(screen.getByTestId('fs-button')).toHaveTextContent('Added');
    expect(screen.getByTestId('fs-button')).toHaveAttribute(
      'data-icon',
      'check_small',
    );
  });

  it('reverts to "Add" after 2s following a successful add', async () => {
    renderCounter({ uuid: 'sku1#seller1' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(screen.getByTestId('fs-button')).toHaveTextContent('Added');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId('fs-button')).toHaveTextContent('Add');
  });

  it('calls addConversationStatus with a success message after adding', async () => {
    renderCounter({ uuid: 'sku1#seller1', productName: 'Cool Shoe' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(addConversationStatus).toHaveBeenCalledWith(
      expect.stringContaining('added to cart'),
      'success',
    );
  });

  it('calls trySyncHostCart after a successful add', async () => {
    renderCounter({ uuid: 'sku1#seller1' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(trySyncHostCart).toHaveBeenCalledTimes(1);
  });

  it('is disabled while addProductToCart is in flight', async () => {
    let resolveAdd;
    addProductToCart.mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );
    renderCounter({ uuid: 'sku1#seller1' });

    act(() => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(screen.getByTestId('fs-button')).toBeDisabled();

    await act(async () => {
      resolveAdd();
    });

    expect(screen.getByTestId('fs-button')).not.toBeDisabled();
  });

  it('stops event propagation on FSButton click', async () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <CounterControls
          counter={0}
          setCounter={jest.fn()}
          uuid="sku1#seller1"
        />
      </div>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('renders the FSButton in a loading state when isLoadingOrderForm is true', () => {
    useOrderForm.mockReturnValue(
      buildOrderForm({ orderFormId: 'order-123', isLoadingOrderForm: true }),
    );
    renderCounter({ uuid: 'sku1#seller1' });
    const btn = screen.getByTestId('fs-button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('data-loading', 'true');
    expect(btn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// FastStore add-to-cart — bootstrap flow
// ---------------------------------------------------------------------------

describe('CounterControls — FastStore add-to-cart', () => {
  let addProductToCart;
  let addConversationStatus;
  let trySyncHostCart;
  let bootstrapFastStoreOrderForm;

  beforeEach(() => {
    isFastStoreHost.mockReturnValue(true);
    addProductToCart = jest.fn(() => Promise.resolve());
    addConversationStatus = jest.fn();
    trySyncHostCart = jest.fn(() => Promise.resolve());
    bootstrapFastStoreOrderForm = jest.fn(() => Promise.resolve('boot-123'));

    useOrderForm.mockReturnValue(
      buildOrderForm({
        orderFormId: null,
        trySyncHostCart,
        bootstrapFastStoreOrderForm,
      }),
    );
    useChatContext.mockReturnValue(
      buildChatContext({
        config: { addToCart: true },
        isInsideVTEXStore: true,
        addProductToCart,
        addConversationStatus,
      }),
    );
  });

  it('renders the FSButton without orderFormId when on FastStore', () => {
    renderCounter({ uuid: 'sku1#seller1' });
    expect(screen.getByTestId('fs-button')).toBeInTheDocument();
  });

  it('still falls back to counter when not on FastStore and orderFormId is absent', () => {
    isFastStoreHost.mockReturnValue(false);
    renderCounter({ uuid: 'sku1#seller1' });
    expect(screen.queryByTestId('fs-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-add')).toBeInTheDocument();
  });

  it('calls bootstrap on click and then addProductToCart with the bootstrapped id', async () => {
    renderCounter({ uuid: 'sku1#seller1' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(bootstrapFastStoreOrderForm).toHaveBeenCalledWith({
      skuId: 'sku1',
      sellerId: 'seller1',
    });
    expect(addProductToCart).toHaveBeenCalledWith({
      VTEXAccountName: 'mystore',
      orderFormId: 'boot-123',
      seller: 'seller1',
      id: 'sku1',
    });
  });

  it('calls trySyncHostCart and shows success status after a successful bootstrap + add', async () => {
    renderCounter({ uuid: 'sku1#seller1', productName: 'Cool Shoe' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(trySyncHostCart).toHaveBeenCalledTimes(1);
    expect(addConversationStatus).toHaveBeenCalledWith(
      expect.stringContaining('added to cart'),
      'success',
    );
  });

  it('does not call addProductToCart when bootstrap fails', async () => {
    bootstrapFastStoreOrderForm.mockRejectedValue(new Error('timeout'));
    renderCounter({ uuid: 'sku1#seller1' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(addProductToCart).not.toHaveBeenCalled();
    expect(trySyncHostCart).not.toHaveBeenCalled();
  });

  it('degrades to the +/- counter when bootstrap fails', async () => {
    bootstrapFastStoreOrderForm.mockRejectedValue(new Error('timeout'));
    renderCounter({ uuid: 'sku1#seller1' });

    expect(screen.getByTestId('fs-button')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(screen.queryByTestId('fs-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-add')).toBeInTheDocument();
  });

  it('skips bootstrap when orderFormId is already present on FastStore', async () => {
    useOrderForm.mockReturnValue(
      buildOrderForm({
        orderFormId: 'cached-id',
        trySyncHostCart,
        bootstrapFastStoreOrderForm,
      }),
    );
    renderCounter({ uuid: 'sku1#seller1' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(bootstrapFastStoreOrderForm).not.toHaveBeenCalled();
    expect(addProductToCart).toHaveBeenCalledWith(
      expect.objectContaining({ orderFormId: 'cached-id' }),
    );
  });

  it('disables the FSButton while bootstrap is in flight', async () => {
    let resolveBoot;
    bootstrapFastStoreOrderForm.mockReturnValue(
      new Promise((resolve) => {
        resolveBoot = resolve;
      }),
    );
    renderCounter({ uuid: 'sku1#seller1' });

    act(() => {
      fireEvent.click(screen.getByTestId('fs-button'));
    });

    expect(screen.getByTestId('fs-button')).toBeDisabled();

    await act(async () => {
      resolveBoot('boot-123');
    });

    expect(screen.getByTestId('fs-button')).not.toBeDisabled();
  });
});
