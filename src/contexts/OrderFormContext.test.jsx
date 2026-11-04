import {
  render,
  screen,
  act,
  waitFor,
  renderHook,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/utils/throttleCustomField', () => ({
  createThrottledCustomFieldSetter: jest.fn(() => jest.fn()),
}));

jest.mock('@/contexts/ChatContext', () => {
  const React = jest.requireActual('react');
  const ChatContext = React.createContext(null);
  return {
    __esModule: true,
    default: ChatContext,
    useChatContext: () => {
      const ctx = React.useContext(ChatContext);
      if (!ctx) {
        throw new Error('useChatContext must be used within a ChatProvider');
      }
      return ctx;
    },
  };
});

import ChatContext from '@/contexts/ChatContext';
import {
  OrderFormProvider,
  useOrderFormId,
  useIsLoadingOrderForm,
  useOrderForm,
} from './OrderFormContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Consumer() {
  const { orderFormId, isLoadingOrderForm, requestOrderForm, trySyncHostCart } =
    useOrderForm();
  return (
    <div>
      <span data-testid="order-form-id">{orderFormId ?? 'null'}</span>
      <span data-testid="is-loading">{String(isLoadingOrderForm)}</span>
      <button
        data-testid="btn-request"
        onClick={requestOrderForm}
      >
        request
      </button>
      <button
        data-testid="btn-sync"
        onClick={trySyncHostCart}
      >
        sync
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <OrderFormProvider>
      <Consumer />
    </OrderFormProvider>,
  );
}

function withProvider(ui) {
  return render(<OrderFormProvider>{ui}</OrderFormProvider>);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  delete window.faststore_sdk_stores;
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete globalThis.fetch;
});

// ---------------------------------------------------------------------------
// OrderFormProvider — initial state
// ---------------------------------------------------------------------------

describe('OrderFormProvider — initial state', () => {
  it('provides orderFormId as null by default', () => {
    renderProvider();
    expect(screen.getByTestId('order-form-id')).toHaveTextContent('null');
  });

  it('provides isLoadingOrderForm as false by default', () => {
    renderProvider();
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });

  it('renders children', () => {
    withProvider(<span data-testid="child">hello</span>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// requestOrderForm — local ID via FastStore SDK
// ---------------------------------------------------------------------------

describe('requestOrderForm — local ID via FastStore SDK', () => {
  function setupFastStore(id) {
    window.faststore_sdk_stores = {
      get: () => ({ read: () => ({ id }) }),
    };
  }

  it('sets orderFormId from FastStore without fetching', async () => {
    setupFastStore('fs-cart-123');
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    expect(screen.getByTestId('order-form-id')).toHaveTextContent(
      'fs-cart-123',
    );
  });

  it('does not call fetch when FastStore has a local ID', async () => {
    setupFastStore('fs-cart-123');
    globalThis.fetch = jest.fn();
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('does not set isLoadingOrderForm when local ID is found', async () => {
    setupFastStore('fs-cart-123');
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });
});

describe('requestOrderForm — fetch branch', () => {
  it('calls fetch with /api/checkout/pub/orderForm', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ orderFormId: 'api-id' }),
    });
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/checkout/pub/orderForm',
    );
  });

  it('sets orderFormId from the API response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ orderFormId: 'api-cart-789' }),
    });
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('order-form-id')).toHaveTextContent(
        'api-cart-789',
      ),
    );
  });

  it('sets isLoadingOrderForm to true while the fetch is in flight', async () => {
    let resolveFetch;
    globalThis.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

    // Resolve and wait for cleanup
    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ orderFormId: 'x' }),
      });
    });
  });

  it('sets isLoadingOrderForm back to false after a successful fetch', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ orderFormId: 'done-id' }),
    });
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false'),
    );
  });

  it('does not update orderFormId when the response has no orderFormId', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('order-form-id')).toHaveTextContent('null');
  });

  it('sets isLoadingOrderForm to false after a non-ok response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false'),
    );
  });

  it('does not set orderFormId after a non-ok response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('order-form-id')).toHaveTextContent('null');
  });

  it('sets isLoadingOrderForm to false after a network error', async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error('Network failure'));
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false'),
    );
  });

  it('does not set orderFormId after a network error', async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error('Network failure'));
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('order-form-id')).toHaveTextContent('null');
  });
});

// ---------------------------------------------------------------------------
// requestOrderForm — idempotent guard (fetchStartedRef)
// ---------------------------------------------------------------------------

describe('requestOrderForm — idempotent guard', () => {
  it('calls fetch only once when requestOrderForm is invoked multiple times', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ orderFormId: 'once' }),
    });
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));
    await userEvent.click(screen.getByTestId('btn-request'));
    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('order-form-id')).toHaveTextContent('once'),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not start a new fetch when a local ID is already stored', async () => {
    window.faststore_sdk_stores = {
      get: () => ({ read: () => ({ id: 'local-id' }) }),
    };
    globalThis.fetch = jest.fn();
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));
    await userEvent.click(screen.getByTestId('btn-request'));

    expect(screen.getByTestId('order-form-id')).toHaveTextContent('local-id');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// trySyncHostCart — FastStore SDK path
// ---------------------------------------------------------------------------

describe('useOrderFormId', () => {
  it('returns null when used outside of OrderFormProvider', () => {
    const { result } = renderHook(() => useOrderFormId());
    expect(result.current).toBeNull();
  });

  it('returns the orderFormId from the provider', async () => {
    window.faststore_sdk_stores = {
      get: () => ({ read: () => ({ id: 'hook-test-id' }) }),
    };

    function HookConsumer() {
      const id = useOrderFormId();
      const { requestOrderForm } = useOrderForm();
      return (
        <>
          <span data-testid="id">{id ?? 'null'}</span>
          <button onClick={requestOrderForm}>req</button>
        </>
      );
    }

    render(
      <OrderFormProvider>
        <HookConsumer />
      </OrderFormProvider>,
    );

    await userEvent.click(screen.getByText('req'));

    expect(screen.getByTestId('id')).toHaveTextContent('hook-test-id');
  });
});

// ---------------------------------------------------------------------------
// useIsLoadingOrderForm
// ---------------------------------------------------------------------------

describe('useIsLoadingOrderForm', () => {
  it('returns false when used outside of OrderFormProvider', () => {
    const { result } = renderHook(() => useIsLoadingOrderForm());
    expect(result.current).toBe(false);
  });

  it('returns false initially when inside the provider', () => {
    const wrapper = ({ children }) => (
      <OrderFormProvider>{children}</OrderFormProvider>
    );
    const { result } = renderHook(() => useIsLoadingOrderForm(), { wrapper });
    expect(result.current).toBe(false);
  });

  it('returns true while a fetch is in flight', async () => {
    let resolveFetch;
    globalThis.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    function HookConsumer() {
      const loading = useIsLoadingOrderForm();
      const { requestOrderForm } = useOrderForm();
      return (
        <>
          <span data-testid="loading">{String(loading)}</span>
          <button onClick={requestOrderForm}>req</button>
        </>
      );
    }

    render(
      <OrderFormProvider>
        <HookConsumer />
      </OrderFormProvider>,
    );

    await userEvent.click(screen.getByText('req'));

    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ orderFormId: 'x' }),
      });
    });
  });
});

// ---------------------------------------------------------------------------
// useOrderForm
// ---------------------------------------------------------------------------

describe('useOrderForm', () => {
  it('returns null orderFormId outside the provider', () => {
    const { result } = renderHook(() => useOrderForm());
    expect(result.current.orderFormId).toBeNull();
  });

  it('returns false isLoadingOrderForm outside the provider', () => {
    const { result } = renderHook(() => useOrderForm());
    expect(result.current.isLoadingOrderForm).toBe(false);
  });

  it('returns a no-op requestOrderForm outside the provider', () => {
    const { result } = renderHook(() => useOrderForm());
    expect(() => result.current.requestOrderForm()).not.toThrow();
  });

  it('returns a no-op flush outside the provider', async () => {
    const { result } = renderHook(() => useOrderForm());
    await expect(result.current.flushPendingCart()).resolves.toBeUndefined();
  });

  it('returns live values from the provider', async () => {
    window.faststore_sdk_stores = {
      get: () => ({ read: () => ({ id: 'full-shape-id' }) }),
    };

    const wrapper = ({ children }) => (
      <OrderFormProvider>{children}</OrderFormProvider>
    );
    const { result } = renderHook(() => useOrderForm(), { wrapper });

    await act(async () => {
      result.current.requestOrderForm();
    });

    expect(result.current.orderFormId).toBe('full-shape-id');
    expect(result.current.isLoadingOrderForm).toBe(false);
    expect(typeof result.current.flushPendingCart).toBe('function');
    expect(typeof result.current.setPendingCartItem).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// bootstrapFastStoreOrderForm
// ---------------------------------------------------------------------------

describe('pending cart items', () => {
  function renderCart() {
    const service = {
      setPendingCartItem: jest.fn(),
      flushPendingCart: jest.fn(() => Promise.resolve()),
      on: jest.fn(),
      off: jest.fn(),
    };
    const wrapper = ({ children }) => (
      <ChatContext.Provider
        value={{ service, currentPage: null, pageHistory: [] }}
      >
        <OrderFormProvider>{children}</OrderFormProvider>
      </ChatContext.Provider>
    );
    return { service, ...renderHook(() => useOrderForm(), { wrapper }) };
  }

  it('forwards a quantity change to setPendingCartItem', () => {
    const { result, service } = renderCart();
    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 2,
      });
    });
    expect(service.setPendingCartItem).toHaveBeenCalledWith(
      'sku1#seller1',
      2,
      'conversation',
      'sku1',
      'seller1',
    );
    expect(result.current.pendingCartItems['sku1#seller1'].quantity).toBe(2);
  });

  it('restores the previous quantity when cart:failed arrives', () => {
    const { result, service } = renderCart();
    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 1,
      });
    });
    const onUpdated = service.on.mock.calls.find(
      (call) => call[0] === 'cart:updated',
    )[1];
    act(() => {
      onUpdated({ key: 'sku1#seller1', quantity: 1 });
    });
    act(() => {
      result.current.updatePendingCartQuantity('sku1#seller1', 4);
    });
    expect(result.current.pendingCartItems['sku1#seller1'].quantity).toBe(4);
    const onFailed = service.on.mock.calls.find(
      (call) => call[0] === 'cart:failed',
    )[1];
    act(() => {
      onFailed({ key: 'sku1#seller1', operation: 'flush' });
    });
    expect(result.current.pendingCartItems['sku1#seller1'].quantity).toBe(1);
  });

  it('flushes catalog items when the catalog page closes', () => {
    const service = {
      setPendingCartItem: jest.fn(),
      flushPendingCart: jest.fn(() => Promise.resolve()),
      on: jest.fn(),
      off: jest.fn(),
    };
    let page = { view: 'product-catalog' };
    function Harness() {
      const orderForm = useOrderForm();
      return (
        <button
          type="button"
          onClick={() =>
            orderForm.setPendingCartItem({
              key: 'sku1#seller1',
              skuId: 'sku1',
              sellerId: 'seller1',
              quantity: 1,
            })
          }
        >
          stage
        </button>
      );
    }
    const { rerender } = render(
      <ChatContext.Provider
        value={{ service, currentPage: page, pageHistory: [] }}
      >
        <OrderFormProvider>
          <Harness />
        </OrderFormProvider>
      </ChatContext.Provider>,
    );
    act(() => {
      screen.getByText('stage').click();
    });
    page = null;
    rerender(
      <ChatContext.Provider
        value={{ service, currentPage: null, pageHistory: [] }}
      >
        <OrderFormProvider>
          <Harness />
        </OrderFormProvider>
      </ChatContext.Provider>,
    );
    expect(service.flushPendingCart).toHaveBeenCalled();
  });
});

describe('useOrderForm — pending fallbacks outside provider', () => {
  it('exposes no-op pending helpers', async () => {
    const { result } = renderHook(() => useOrderForm());
    expect(result.current.pendingCartItems).toEqual({});
    expect(() => result.current.setPendingCartItem({})).not.toThrow();
    expect(() =>
      result.current.updatePendingCartQuantity('k', 1),
    ).not.toThrow();
    expect(() => result.current.removePendingCartItem('k')).not.toThrow();
    expect(() => result.current.clearPendingCartItems()).not.toThrow();
    await expect(result.current.sendProductsToCart()).resolves.toBeUndefined();
  });
});
