import {
  render,
  screen,
  act,
  waitFor,
  renderHook,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import PropTypes from 'prop-types';

jest.mock('@/utils/VTEXIOMinicartBridge', () => ({
  updateVTEXIOMinicart: jest.fn(),
  getReliableOrderFormId: jest.fn(),
}));

jest.mock('@/utils/faststoreBootstrap', () => ({
  bootstrapOrderFormId: jest.fn(),
}));

jest.mock('@/utils/vtex', () => ({
  getVtexAccount: jest.fn(() => 'mystore'),
  isFastStoreHost: jest.fn(() => false),
}));

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

import {
  updateVTEXIOMinicart,
  getReliableOrderFormId,
} from '@/utils/VTEXIOMinicartBridge';
import { bootstrapOrderFormId } from '@/utils/faststoreBootstrap';
import { isFastStoreHost } from '@/utils/vtex';
import ChatContext from '@/contexts/ChatContext';
import {
  OrderFormProvider,
  useOrderFormId,
  useIsLoadingOrderForm,
  useOrderForm,
  PENDING_CART_DEBOUNCE_MS,
} from './OrderFormContext';
import { UTM_SOURCES } from '@/utils/sendVtexUtm';

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
  updateVTEXIOMinicart.mockReset();
  updateVTEXIOMinicart.mockResolvedValue(null);
  bootstrapOrderFormId.mockReset();
  getReliableOrderFormId.mockReset();
  getReliableOrderFormId.mockReturnValue(null);
  isFastStoreHost.mockReset();
  isFastStoreHost.mockReturnValue(false);
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

// ---------------------------------------------------------------------------
// requestOrderForm — local ID via VTEX IO bridge (getReliableOrderFormId)
// ---------------------------------------------------------------------------

describe('requestOrderForm — local ID via VTEX IO bridge', () => {
  it('sets orderFormId from the bridge without fetching', async () => {
    getReliableOrderFormId.mockReturnValue('vtex-local-456');
    globalThis.fetch = jest.fn();
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    expect(screen.getByTestId('order-form-id')).toHaveTextContent(
      'vtex-local-456',
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('continues to fetch when the bridge throws', async () => {
    getReliableOrderFormId.mockImplementation(() => {
      throw new Error('bridge unavailable');
    });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ orderFormId: 'fetched-id' }),
    });
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('order-form-id')).toHaveTextContent(
        'fetched-id',
      ),
    );
  });

  it('continues to fetch when the bridge returns null', async () => {
    getReliableOrderFormId.mockReturnValue(null);
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ orderFormId: 'fetched-id' }),
    });
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));

    await waitFor(() =>
      expect(screen.getByTestId('order-form-id')).toHaveTextContent(
        'fetched-id',
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// requestOrderForm — fetch branch
// ---------------------------------------------------------------------------

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
    getReliableOrderFormId.mockReturnValue('local-id');
    globalThis.fetch = jest.fn();
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-request'));
    await userEvent.click(screen.getByTestId('btn-request'));

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// trySyncHostCart — FastStore SDK path
// ---------------------------------------------------------------------------

describe('trySyncHostCart — FastStore SDK', () => {
  it('calls cart.set(cart.read()) when FastStore cart is available', async () => {
    const mockRead = jest.fn().mockReturnValue({ items: [] });
    const mockSet = jest.fn();
    window.faststore_sdk_stores = {
      get: jest.fn().mockReturnValue({ set: mockSet, read: mockRead }),
    };
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-sync'));

    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({ items: [] });
  });

  it('does not call updateVTEXIOMinicart when FastStore sync succeeds', async () => {
    window.faststore_sdk_stores = {
      get: jest.fn().mockReturnValue({
        set: jest.fn(),
        read: jest.fn().mockReturnValue({}),
      }),
    };
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-sync'));

    expect(updateVTEXIOMinicart).not.toHaveBeenCalled();
  });

  it('falls through to updateVTEXIOMinicart when FastStore set/read are not functions', async () => {
    window.faststore_sdk_stores = {
      get: jest.fn().mockReturnValue({ set: null, read: null }),
    };
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-sync'));

    expect(updateVTEXIOMinicart).toHaveBeenCalledTimes(1);
  });

  it('falls through to updateVTEXIOMinicart when faststore_sdk_stores is undefined', async () => {
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-sync'));

    expect(updateVTEXIOMinicart).toHaveBeenCalledTimes(1);
  });

  it('falls through to updateVTEXIOMinicart when FastStore cart.set throws', async () => {
    window.faststore_sdk_stores = {
      get: jest.fn().mockReturnValue({
        set: () => {
          throw new Error('write failed');
        },
        read: jest.fn().mockReturnValue({}),
      }),
    };
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-sync'));

    expect(updateVTEXIOMinicart).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// trySyncHostCart — VTEX IO minicart path
// ---------------------------------------------------------------------------

describe('trySyncHostCart — VTEX IO minicart', () => {
  it('calls updateVTEXIOMinicart when FastStore is not available', async () => {
    renderProvider();

    await userEvent.click(screen.getByTestId('btn-sync'));

    expect(updateVTEXIOMinicart).toHaveBeenCalledTimes(1);
  });

  it('does not throw when updateVTEXIOMinicart rejects', async () => {
    updateVTEXIOMinicart.mockRejectedValue(new Error('bridge failed'));
    renderProvider();

    await expect(
      userEvent.click(screen.getByTestId('btn-sync')),
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// useOrderFormId
// ---------------------------------------------------------------------------

describe('useOrderFormId', () => {
  it('returns null when used outside of OrderFormProvider', () => {
    const { result } = renderHook(() => useOrderFormId());
    expect(result.current).toBeNull();
  });

  it('returns the orderFormId from the provider', async () => {
    getReliableOrderFormId.mockReturnValue('hook-test-id');

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

  it('returns a no-op trySyncHostCart outside the provider', () => {
    const { result } = renderHook(() => useOrderForm());
    expect(() => result.current.trySyncHostCart()).not.toThrow();
  });

  it('returns a rejecting bootstrapFastStoreOrderForm outside the provider', async () => {
    const { result } = renderHook(() => useOrderForm());
    await expect(result.current.bootstrapFastStoreOrderForm()).rejects.toThrow(
      'OrderFormProvider missing',
    );
  });

  it('returns live values from the provider', async () => {
    getReliableOrderFormId.mockReturnValue('full-shape-id');

    const wrapper = ({ children }) => (
      <OrderFormProvider>{children}</OrderFormProvider>
    );
    const { result } = renderHook(() => useOrderForm(), { wrapper });

    await act(async () => {
      result.current.requestOrderForm();
    });

    expect(result.current.orderFormId).toBe('full-shape-id');
    expect(result.current.isLoadingOrderForm).toBe(false);
    expect(typeof result.current.requestOrderForm).toBe('function');
    expect(typeof result.current.trySyncHostCart).toBe('function');
    expect(typeof result.current.bootstrapFastStoreOrderForm).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// bootstrapFastStoreOrderForm
// ---------------------------------------------------------------------------

describe('bootstrapFastStoreOrderForm', () => {
  function renderWithProvider() {
    const wrapper = ({ children }) => (
      <OrderFormProvider>{children}</OrderFormProvider>
    );
    return renderHook(() => useOrderForm(), { wrapper });
  }

  it('resolves with the cached orderFormId without calling the SDK bootstrap', async () => {
    window.faststore_sdk_stores = {
      get: () => ({ read: () => ({ id: 'cached-from-sdk' }) }),
    };

    const { result } = renderWithProvider();

    await act(async () => {
      result.current.requestOrderForm();
    });
    expect(result.current.orderFormId).toBe('cached-from-sdk');

    let resolved;
    await act(async () => {
      resolved = await result.current.bootstrapFastStoreOrderForm({
        skuId: 'sku1',
        sellerId: 'seller1',
      });
    });

    expect(resolved).toBe('cached-from-sdk');
    expect(bootstrapOrderFormId).not.toHaveBeenCalled();
  });

  it('calls the SDK bootstrap and caches the resolved id in context state', async () => {
    bootstrapOrderFormId.mockResolvedValue('new-boot-id');
    const { result } = renderWithProvider();

    let resolved;
    await act(async () => {
      resolved = await result.current.bootstrapFastStoreOrderForm({
        skuId: 'sku1',
        sellerId: 'seller1',
      });
    });

    expect(bootstrapOrderFormId).toHaveBeenCalledWith({
      skuId: 'sku1',
      sellerId: 'seller1',
    });
    expect(resolved).toBe('new-boot-id');
    expect(result.current.orderFormId).toBe('new-boot-id');
  });

  it('does not mutate context state on bootstrap failure and propagates the error', async () => {
    bootstrapOrderFormId.mockRejectedValue(new Error('orderFormId timeout'));
    const { result } = renderWithProvider();

    await act(async () => {
      await expect(
        result.current.bootstrapFastStoreOrderForm({
          skuId: 'sku1',
          sellerId: 'seller1',
        }),
      ).rejects.toThrow('orderFormId timeout');
    });

    expect(result.current.orderFormId).toBeNull();
  });

  it('dedupes concurrent calls into a single SDK bootstrap', async () => {
    let resolveBoot;
    bootstrapOrderFormId.mockReturnValue(
      new Promise((resolve) => {
        resolveBoot = resolve;
      }),
    );

    const { result } = renderWithProvider();

    let firstResolved;
    let secondResolved;

    await act(async () => {
      const first = result.current.bootstrapFastStoreOrderForm({
        skuId: 'sku1',
        sellerId: 'seller1',
      });
      const second = result.current.bootstrapFastStoreOrderForm({
        skuId: 'sku2',
        sellerId: 'seller2',
      });
      resolveBoot('shared-id');
      [firstResolved, secondResolved] = await Promise.all([first, second]);
    });

    expect(bootstrapOrderFormId).toHaveBeenCalledTimes(1);
    expect(firstResolved).toBe('shared-id');
    expect(secondResolved).toBe('shared-id');
    expect(result.current.orderFormId).toBe('shared-id');
  });

  it('allows a fresh bootstrap after a previous failure clears the dedup ref', async () => {
    bootstrapOrderFormId.mockRejectedValueOnce(
      new Error('orderFormId timeout'),
    );
    const { result } = renderWithProvider();

    await act(async () => {
      await expect(
        result.current.bootstrapFastStoreOrderForm({
          skuId: 'sku1',
          sellerId: 'seller1',
        }),
      ).rejects.toThrow('orderFormId timeout');
    });

    bootstrapOrderFormId.mockResolvedValueOnce('retry-id');

    let resolved;
    await act(async () => {
      resolved = await result.current.bootstrapFastStoreOrderForm({
        skuId: 'sku1',
        sellerId: 'seller1',
      });
    });

    expect(bootstrapOrderFormId).toHaveBeenCalledTimes(2);
    expect(resolved).toBe('retry-id');
    expect(result.current.orderFormId).toBe('retry-id');
  });
});

// ---------------------------------------------------------------------------
// Pending cart items + sendProductsToCart
// ---------------------------------------------------------------------------

describe('pending cart items', () => {
  function buildChatValue(overrides = {}) {
    return {
      currentPage: null,
      pageHistory: [],
      addProductToCart: jest.fn(() => Promise.resolve()),
      addConversationStatus: jest.fn(),
      setCustomField: jest.fn(),
      sendUtm: jest.fn(),
      ...overrides,
    };
  }

  function renderWithChat(chatValue) {
    const wrapper = ({ children }) => (
      <ChatContext.Provider value={chatValue}>
        <OrderFormProvider>{children}</OrderFormProvider>
      </ChatContext.Provider>
    );
    return renderHook(() => useOrderForm(), { wrapper });
  }

  it('stores a pending item with conversation origin when on the default page', () => {
    const chat = buildChatValue();
    const { result } = renderWithChat(chat);

    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 1,
        productName: 'Shoe',
      });
    });

    expect(result.current.pendingCartItems['sku1#seller1']).toEqual({
      skuId: 'sku1',
      sellerId: 'seller1',
      quantity: 1,
      productName: 'Shoe',
      origin: 'conversation',
    });
  });

  it('stores a pending item with catalog origin on the catalog page', () => {
    const chat = buildChatValue({
      currentPage: { view: 'product-catalog' },
      pageHistory: [{ view: 'product-catalog' }],
    });
    const { result } = renderWithChat(chat);

    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 1,
        productName: 'Shoe',
      });
    });

    expect(result.current.pendingCartItems['sku1#seller1'].origin).toBe(
      'catalog',
    );
  });

  it('clamps quantity to >= 0 on update', () => {
    const chat = buildChatValue();
    const { result } = renderWithChat(chat);

    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 2,
        productName: 'Shoe',
      });
    });

    act(() => {
      result.current.updatePendingCartQuantity('sku1#seller1', -3);
    });

    expect(result.current.pendingCartItems['sku1#seller1'].quantity).toBe(0);
  });

  it('sends conversation-origin items after the debounce with quantity', async () => {
    jest.useFakeTimers();
    const addProductToCart = jest.fn(() => Promise.resolve());
    const addConversationStatus = jest.fn();
    const sendUtm = jest.fn();
    const chat = buildChatValue({
      addProductToCart,
      addConversationStatus,
      sendUtm,
    });

    getReliableOrderFormId.mockReturnValue('order-123');
    const { result } = renderWithChat(chat);

    act(() => {
      result.current.requestOrderForm();
    });

    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 3,
        productName: 'Shoe',
      });
    });

    expect(addProductToCart).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(PENDING_CART_DEBOUNCE_MS);
    });

    expect(addProductToCart).toHaveBeenCalledWith({
      VTEXAccountName: 'mystore',
      orderFormId: 'order-123',
      seller: 'seller1',
      id: 'sku1',
      quantity: 3,
    });
    expect(sendUtm).toHaveBeenCalledWith(UTM_SOURCES.CART);
    expect(addConversationStatus).toHaveBeenCalledWith(
      expect.stringMatching(/3.*added to cart|items were added/i),
      'success',
    );
    expect(result.current.pendingCartItems['sku1#seller1']).toBeUndefined();

    jest.useRealTimers();
  });

  it('discards quantity 0 without calling addProductToCart', async () => {
    jest.useFakeTimers();
    const addProductToCart = jest.fn(() => Promise.resolve());
    const chat = buildChatValue({ addProductToCart });
    getReliableOrderFormId.mockReturnValue('order-123');
    const { result } = renderWithChat(chat);

    act(() => {
      result.current.requestOrderForm();
    });

    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 1,
        productName: 'Shoe',
      });
    });

    act(() => {
      result.current.updatePendingCartQuantity('sku1#seller1', 0);
    });

    await act(async () => {
      jest.advanceTimersByTime(PENDING_CART_DEBOUNCE_MS);
    });

    expect(addProductToCart).not.toHaveBeenCalled();
    expect(result.current.pendingCartItems['sku1#seller1']).toBeUndefined();

    jest.useRealTimers();
  });

  it('does not debounce-send catalog-origin items', async () => {
    jest.useFakeTimers();
    const addProductToCart = jest.fn(() => Promise.resolve());
    const chat = buildChatValue({
      currentPage: { view: 'product-catalog' },
      pageHistory: [{ view: 'product-catalog' }],
      addProductToCart,
    });
    getReliableOrderFormId.mockReturnValue('order-123');
    const { result } = renderWithChat(chat);

    act(() => {
      result.current.requestOrderForm();
    });

    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 2,
        productName: 'Shoe',
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(PENDING_CART_DEBOUNCE_MS);
    });

    expect(addProductToCart).not.toHaveBeenCalled();
    expect(result.current.pendingCartItems['sku1#seller1']).toBeDefined();

    jest.useRealTimers();
  });

  it('flushes catalog-origin items when returning to conversation', async () => {
    const addProductToCart = jest.fn(() => Promise.resolve());
    getReliableOrderFormId.mockReturnValue('order-123');

    function FlushCatalogConsumer({ onGoConversation }) {
      const orderForm = useOrderForm();
      return (
        <>
          <button
            type="button"
            data-testid="request"
            onClick={() => orderForm.requestOrderForm()}
          >
            request
          </button>
          <button
            type="button"
            data-testid="stage"
            onClick={() =>
              orderForm.setPendingCartItem({
                key: 'sku1#seller1',
                skuId: 'sku1',
                sellerId: 'seller1',
                quantity: 2,
                productName: 'Shoe',
              })
            }
          >
            stage
          </button>
          <button
            type="button"
            data-testid="go-conversation"
            onClick={onGoConversation}
          >
            go conversation
          </button>
          <span data-testid="pending">
            {orderForm.pendingCartItems['sku1#seller1'] ? 'yes' : 'no'}
          </span>
        </>
      );
    }

    FlushCatalogConsumer.propTypes = {
      onGoConversation: PropTypes.func.isRequired,
    };

    function Root() {
      const [chatValue, setChatValue] = useState(
        buildChatValue({
          currentPage: { view: 'product-catalog' },
          pageHistory: [{ view: 'product-catalog' }],
          addProductToCart,
        }),
      );

      return (
        <ChatContext.Provider value={chatValue}>
          <OrderFormProvider>
            <FlushCatalogConsumer
              onGoConversation={() =>
                setChatValue((prev) => ({
                  ...prev,
                  currentPage: null,
                  pageHistory: [],
                }))
              }
            />
          </OrderFormProvider>
        </ChatContext.Provider>
      );
    }

    render(<Root />);

    await userEvent.click(screen.getByTestId('request'));
    await userEvent.click(screen.getByTestId('stage'));
    expect(screen.getByTestId('pending')).toHaveTextContent('yes');
    expect(addProductToCart).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('go-conversation'));

    await waitFor(() => {
      expect(addProductToCart).toHaveBeenCalledWith({
        VTEXAccountName: 'mystore',
        orderFormId: 'order-123',
        seller: 'seller1',
        id: 'sku1',
        quantity: 2,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('pending')).toHaveTextContent('no');
    });
  });

  it('clears the pending store as soon as sendProductsToCart is called even if add fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const addProductToCart = jest.fn(() =>
      Promise.reject(new Error('timeout')),
    );
    const chat = buildChatValue({ addProductToCart });
    getReliableOrderFormId.mockReturnValue('order-123');
    const { result } = renderWithChat(chat);

    act(() => {
      result.current.requestOrderForm();
    });

    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 2,
        productName: 'Shoe',
      });
    });

    expect(result.current.pendingCartItems['sku1#seller1']).toBeDefined();

    await act(async () => {
      await result.current.sendProductsToCart(['sku1#seller1']);
    });

    expect(result.current.pendingCartItems['sku1#seller1']).toBeUndefined();
    expect(addProductToCart).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('bootstraps FastStore orderFormId when sending without a cached id', async () => {
    jest.useFakeTimers();
    isFastStoreHost.mockReturnValue(true);
    bootstrapOrderFormId.mockResolvedValue('boot-123');
    const addProductToCart = jest.fn(() => Promise.resolve());
    const chat = buildChatValue({ addProductToCart });
    const { result } = renderWithChat(chat);

    act(() => {
      result.current.setPendingCartItem({
        key: 'sku1#seller1',
        skuId: 'sku1',
        sellerId: 'seller1',
        quantity: 1,
        productName: 'Shoe',
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(PENDING_CART_DEBOUNCE_MS);
    });

    expect(bootstrapOrderFormId).toHaveBeenCalledWith({
      skuId: 'sku1',
      sellerId: 'seller1',
    });
    expect(addProductToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        orderFormId: 'boot-123',
        quantity: 1,
      }),
    );

    jest.useRealTimers();
  });
});
