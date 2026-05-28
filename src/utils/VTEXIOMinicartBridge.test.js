import {
  updateVTEXIOMinicart,
  getReliableOrderFormId,
  getStableOrderFormId,
  getOrderFormIdFromApollo,
  getOrderFormIdFromContext,
  getOrderFormIdFromStorage,
  findNativeOrderFormContext,
} from './VTEXIOMinicartBridge';

const VALID_ID_A = 'a1b2c3d4e5f607080900112233445566';
const VALID_ID_B = '0123456789abcdef0123456789abcdef';
const VALID_ID_C = 'fedcba9876543210fedcba9876543210';

const ORDER_FORM_REFRESH_URL =
  '/api/checkout/pub/orderForm?allowedOutdatedData=false';

// Fiber key prefix used by the module; the suffix can be anything.
const FIBER_KEY = '__reactFiber$jest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildContext(overrides = {}) {
  return {
    setOrderForm: jest.fn(),
    orderForm: { items: [] },
    ...overrides,
  };
}

function buildFreshOrderForm(items = []) {
  return { items, totalizers: [] };
}

/** Builds a fiber node with context reachable via memoizedProps.value */
function memoizedPropsValueFiber(context, returnFiber = null) {
  return {
    memoizedProps: { value: context },
    memoizedState: null,
    dependencies: null,
    return: returnFiber,
  };
}

/** Builds a fiber node with context reachable via memoizedState linked list */
function memoizedStateFiber(context, returnFiber = null) {
  return {
    memoizedProps: null,
    memoizedState: {
      memoizedState: context,
      next: null,
    },
    dependencies: null,
    return: returnFiber,
  };
}

/** Builds a fiber node with context reachable via dependencies.firstContext */
function dependenciesFiber(context, returnFiber = null) {
  return {
    memoizedProps: null,
    memoizedState: null,
    dependencies: {
      firstContext: {
        memoizedValue: context,
        next: null,
      },
    },
    return: returnFiber,
  };
}

/** Mounts a div with the given class name and attaches a fiber to it. */
function mountElementWithFiber(fiber, className = 'vtex-minicart-2-x-wrap') {
  const el = document.createElement('div');
  el.className = className;
  el[FIBER_KEY] = fiber;
  document.body.appendChild(el);
  return el;
}

/**
 * Builds a fiber whose memoizedProps.children[0]._owner.stateNode.apolloClient
 * shape mimics the path getOrderFormIdFromApollo walks.
 */
function fiberWithApolloOrderFormId(orderFormId) {
  return {
    memoizedProps: {
      children: [
        {
          _owner: {
            stateNode: {
              apolloClient: {
                cache: {
                  data: {
                    data: {
                      'OrderForm:current': { orderFormId },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
    memoizedState: null,
    dependencies: null,
    return: null,
  };
}

function mockFetchOk(orderForm) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(orderForm),
  });
}

function mockFetchError(status = 500) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
  });
}

function mockFetchNetworkFailure() {
  globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = '';
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete globalThis.fetch;
});

// ---------------------------------------------------------------------------
// Module setup — window.updateMinicart
// ---------------------------------------------------------------------------

describe('setupMinicartBridge', () => {
  it('exposes updateVTEXIOMinicart as window.updateMinicart on module load', () => {
    expect(window.updateMinicart).toBe(updateVTEXIOMinicart);
  });
});

// ---------------------------------------------------------------------------
// updateVTEXIOMinicart — context lookup failures
// ---------------------------------------------------------------------------

describe('updateVTEXIOMinicart — no store root element', () => {
  it('returns null when no minicart/render-container/render-store-div element exists', async () => {
    const result = await updateVTEXIOMinicart();
    expect(result).toBeNull();
  });

  it('logs a warning when context cannot be found', async () => {
    await updateVTEXIOMinicart();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Minicart]'),
    );
  });
});

describe('updateVTEXIOMinicart — no React fiber key on root element', () => {
  it('returns null when the root element has no __reactFiber key', async () => {
    const el = document.createElement('div');
    el.className = 'vtex-minicart-2-x-wrap';
    document.body.appendChild(el);
    // No fiber key attached — element has no __reactFiber* property

    const result = await updateVTEXIOMinicart();
    expect(result).toBeNull();
  });
});

describe('updateVTEXIOMinicart — fiber tree without OrderFormContext', () => {
  it('returns null when no fiber node contains a valid OrderFormContext', async () => {
    const emptyFiber = {
      memoizedProps: null,
      memoizedState: null,
      dependencies: null,
      return: null,
    };
    mountElementWithFiber(emptyFiber);

    const result = await updateVTEXIOMinicart();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateVTEXIOMinicart — happy path
// ---------------------------------------------------------------------------

describe('updateVTEXIOMinicart — successful update', () => {
  it('calls fetch with the correct URL and credentials', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    mockFetchOk(buildFreshOrderForm());

    await updateVTEXIOMinicart();

    expect(globalThis.fetch).toHaveBeenCalledWith(ORDER_FORM_REFRESH_URL, {
      credentials: 'include',
    });
  });

  it('calls context.setOrderForm with the merged order form', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    const freshOrderForm = buildFreshOrderForm([
      { id: 'item-1', imageUrl: 'https://cdn.example.com/a.jpg' },
    ]);
    mockFetchOk(freshOrderForm);

    await updateVTEXIOMinicart();

    expect(context.setOrderForm).toHaveBeenCalledTimes(1);
    expect(context.setOrderForm).toHaveBeenCalledWith(
      expect.objectContaining({ items: expect.any(Array) }),
    );
  });

  it('returns the merged order form', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    const freshOrderForm = buildFreshOrderForm([
      { id: 'item-1', imageUrl: 'https://cdn.example.com/a.jpg' },
    ]);
    mockFetchOk(freshOrderForm);

    const result = await updateVTEXIOMinicart();

    expect(result).not.toBeNull();
    expect(result.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateVTEXIOMinicart — fetch failures
// ---------------------------------------------------------------------------

describe('updateVTEXIOMinicart — fetch errors', () => {
  it('returns null when fetch responds with a non-ok status', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    mockFetchError(503);

    const result = await updateVTEXIOMinicart();
    expect(result).toBeNull();
  });

  it('logs an error when fetch responds with a non-ok status', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    mockFetchError(503);

    await updateVTEXIOMinicart();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[Minicart]'),
      expect.any(Error),
    );
  });

  it('returns null when fetch throws a network error', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    mockFetchNetworkFailure();

    const result = await updateVTEXIOMinicart();
    expect(result).toBeNull();
  });

  it('logs an error when fetch throws a network error', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    mockFetchNetworkFailure();

    await updateVTEXIOMinicart();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[Minicart]'),
      expect.any(Error),
    );
  });

  it('does not call setOrderForm when fetch fails', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    mockFetchError(500);

    await updateVTEXIOMinicart();
    expect(context.setOrderForm).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getStoreRootElement — DOM selector fallbacks
// ---------------------------------------------------------------------------

describe('getStoreRootElement — selector fallbacks', () => {
  it('finds root via [class*="vtex-minicart-2"] (first selector)', async () => {
    const context = buildContext();
    const el = document.createElement('div');
    el.className = 'vtex-minicart-2-x-container';
    el[FIBER_KEY] = memoizedPropsValueFiber(context);
    document.body.appendChild(el);
    mockFetchOk(buildFreshOrderForm());

    const result = await updateVTEXIOMinicart();
    expect(result).not.toBeNull();
  });

  it('falls back to .render-container when no vtex-minicart-2 element exists', async () => {
    const context = buildContext();
    const el = document.createElement('div');
    el.className = 'render-container';
    el[FIBER_KEY] = memoizedPropsValueFiber(context);
    document.body.appendChild(el);
    mockFetchOk(buildFreshOrderForm());

    const result = await updateVTEXIOMinicart();
    expect(result).not.toBeNull();
  });

  it('falls back to #render-store-div when no other element exists', async () => {
    const context = buildContext();
    const el = document.createElement('div');
    el.id = 'render-store-div';
    el[FIBER_KEY] = memoizedPropsValueFiber(context);
    document.body.appendChild(el);
    mockFetchOk(buildFreshOrderForm());

    const result = await updateVTEXIOMinicart();
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractOrderFormContextFromFiber — 3 discovery paths
// ---------------------------------------------------------------------------

describe('extractOrderFormContextFromFiber — context via memoizedProps.value', () => {
  it('resolves context when setOrderForm is on memoizedProps.value', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    mockFetchOk(buildFreshOrderForm());

    await updateVTEXIOMinicart();
    expect(context.setOrderForm).toHaveBeenCalledTimes(1);
  });

  it('ignores memoizedProps.value that lacks setOrderForm', async () => {
    const badValue = { notAContext: true };
    const fiber = {
      memoizedProps: { value: badValue },
      memoizedState: null,
      dependencies: null,
      return: null,
    };
    mountElementWithFiber(fiber);

    const result = await updateVTEXIOMinicart();
    expect(result).toBeNull();
  });
});

describe('extractOrderFormContextFromFiber — context via memoizedState', () => {
  it('resolves context from the first hook in the memoizedState chain', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedStateFiber(context));
    mockFetchOk(buildFreshOrderForm());

    await updateVTEXIOMinicart();
    expect(context.setOrderForm).toHaveBeenCalledTimes(1);
  });

  it('resolves context from a later node in the memoizedState chain', async () => {
    const context = buildContext();
    const fiber = {
      memoizedProps: null,
      memoizedState: {
        memoizedState: { notAContext: true },
        next: {
          memoizedState: context,
          next: null,
        },
      },
      dependencies: null,
      return: null,
    };
    mountElementWithFiber(fiber);
    mockFetchOk(buildFreshOrderForm());

    await updateVTEXIOMinicart();
    expect(context.setOrderForm).toHaveBeenCalledTimes(1);
  });
});

describe('extractOrderFormContextFromFiber — context via dependencies.firstContext', () => {
  it('resolves context from dependencies.firstContext.memoizedValue', async () => {
    const context = buildContext();
    mountElementWithFiber(dependenciesFiber(context));
    mockFetchOk(buildFreshOrderForm());

    await updateVTEXIOMinicart();
    expect(context.setOrderForm).toHaveBeenCalledTimes(1);
  });

  it('resolves context from a later node in the firstContext chain', async () => {
    const context = buildContext();
    const fiber = {
      memoizedProps: null,
      memoizedState: null,
      dependencies: {
        firstContext: {
          memoizedValue: { notAContext: true },
          next: {
            memoizedValue: context,
            next: null,
          },
        },
      },
      return: null,
    };
    mountElementWithFiber(fiber);
    mockFetchOk(buildFreshOrderForm());

    await updateVTEXIOMinicart();
    expect(context.setOrderForm).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// findNativeOrderFormContext — fiber tree traversal
// ---------------------------------------------------------------------------

describe('findNativeOrderFormContext — fiber tree traversal', () => {
  it('finds context in an ancestor fiber (via fiber.return)', async () => {
    const context = buildContext();
    const ancestorFiber = memoizedPropsValueFiber(context);
    const childFiber = {
      memoizedProps: null,
      memoizedState: null,
      dependencies: null,
      return: ancestorFiber,
    };
    mountElementWithFiber(childFiber);
    mockFetchOk(buildFreshOrderForm());

    await updateVTEXIOMinicart();
    expect(context.setOrderForm).toHaveBeenCalledTimes(1);
  });

  it('returns null when context is beyond MAX_FIBER_WALK_DEPTH (200) ancestors', async () => {
    const context = buildContext();
    let fiber = memoizedPropsValueFiber(context);
    // Add 201 empty ancestor nodes so the context is out of range
    for (let i = 0; i <= 200; i += 1) {
      fiber = {
        memoizedProps: null,
        memoizedState: null,
        dependencies: null,
        return: fiber,
      };
    }
    mountElementWithFiber(fiber);

    const result = await updateVTEXIOMinicart();
    expect(result).toBeNull();
  });

  it('stops walking when fiber.return is null', async () => {
    const emptyFiber = {
      memoizedProps: null,
      memoizedState: null,
      dependencies: null,
      return: null,
    };
    mountElementWithFiber(emptyFiber);

    const result = await updateVTEXIOMinicart();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mergePreservingImages
// ---------------------------------------------------------------------------

describe('mergePreservingImages', () => {
  it('preserves imageUrls from the previous order form when item exists', async () => {
    const prevImageUrls = {
      at1x: 'https://cdn.example.com/prev_1x.jpg',
      at2x: 'https://cdn.example.com/prev_2x.jpg',
      at3x: 'https://cdn.example.com/prev_3x.jpg',
      __typename: 'ImageUrls',
    };
    const context = buildContext({
      orderForm: {
        items: [
          { id: 'item-1', imageUrls: prevImageUrls, imageUrl: 'prev.jpg' },
        ],
      },
    });
    mountElementWithFiber(memoizedPropsValueFiber(context));

    const freshOrderForm = buildFreshOrderForm([
      { id: 'item-1', imageUrl: 'fresh.jpg' },
    ]);
    mockFetchOk(freshOrderForm);

    const result = await updateVTEXIOMinicart();

    expect(result.items[0].imageUrls).toEqual(prevImageUrls);
    expect(result.items[0].imageUrl).toBe('prev.jpg');
  });

  it('builds a mock imageUrls object for items not in the previous order form', async () => {
    const context = buildContext({ orderForm: { items: [] } });
    mountElementWithFiber(memoizedPropsValueFiber(context));

    const freshOrderForm = buildFreshOrderForm([
      { id: 'new-item', imageUrl: 'https://cdn.example.com/new.jpg' },
    ]);
    mockFetchOk(freshOrderForm);

    const result = await updateVTEXIOMinicart();

    expect(result.items[0].imageUrls).toEqual({
      at1x: 'https://cdn.example.com/new.jpg',
      at2x: 'https://cdn.example.com/new.jpg',
      at3x: 'https://cdn.example.com/new.jpg',
      __typename: 'ImageUrls',
    });
    expect(result.items[0].imageUrl).toBe('https://cdn.example.com/new.jpg');
  });

  it('preserves all non-image fields from the fresh order form', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));

    const freshOrderForm = {
      items: [],
      totalizers: [{ id: 'Items', value: 5000 }],
      value: 5000,
      loggedIn: true,
    };
    mockFetchOk(freshOrderForm);

    const result = await updateVTEXIOMinicart();

    expect(result.totalizers).toEqual([{ id: 'Items', value: 5000 }]);
    expect(result.value).toBe(5000);
    expect(result.loggedIn).toBe(true);
  });

  it('handles previousOrderForm with no items (null/undefined guard)', async () => {
    const context = buildContext({ orderForm: null });
    mountElementWithFiber(memoizedPropsValueFiber(context));

    const freshOrderForm = buildFreshOrderForm([
      { id: 'item-1', imageUrl: 'https://cdn.example.com/a.jpg' },
    ]);
    mockFetchOk(freshOrderForm);

    const result = await updateVTEXIOMinicart();

    expect(result.items[0].imageUrls).toEqual(
      expect.objectContaining({ __typename: 'ImageUrls' }),
    );
  });

  it('handles an empty items array in the fresh order form', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    mockFetchOk(buildFreshOrderForm([]));

    const result = await updateVTEXIOMinicart();
    expect(result.items).toHaveLength(0);
  });

  it('mixes preserved and new items correctly in the same order form', async () => {
    const prevImageUrls = {
      at1x: 'prev.jpg',
      at2x: 'prev.jpg',
      at3x: 'prev.jpg',
      __typename: 'ImageUrls',
    };
    const context = buildContext({
      orderForm: {
        items: [
          { id: 'existing', imageUrls: prevImageUrls, imageUrl: 'prev.jpg' },
        ],
      },
    });
    mountElementWithFiber(memoizedPropsValueFiber(context));

    const freshOrderForm = buildFreshOrderForm([
      { id: 'existing', imageUrl: 'fresh-existing.jpg' },
      { id: 'brand-new', imageUrl: 'fresh-new.jpg' },
    ]);
    mockFetchOk(freshOrderForm);

    const result = await updateVTEXIOMinicart();

    const [existingItem, newItem] = result.items;
    // Existing item: images come from previous state
    expect(existingItem.imageUrls).toEqual(prevImageUrls);
    expect(existingItem.imageUrl).toBe('prev.jpg');
    // New item: mock imageUrls built from fresh imageUrl
    expect(newItem.imageUrls.at1x).toBe('fresh-new.jpg');
    expect(newItem.imageUrl).toBe('fresh-new.jpg');
  });
});

// ---------------------------------------------------------------------------
// updateVTEXIOMinicart — accepts an optional fresh orderForm (skip fetch)
// ---------------------------------------------------------------------------

describe('updateVTEXIOMinicart — caller-supplied orderForm', () => {
  it('skips fetch when a fresh orderForm is passed as argument', async () => {
    const context = buildContext();
    mountElementWithFiber(memoizedPropsValueFiber(context));
    globalThis.fetch = jest.fn();

    const caller = buildFreshOrderForm([{ id: 'x', imageUrl: 'a.jpg' }]);
    const result = await updateVTEXIOMinicart(caller);

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(context.setOrderForm).toHaveBeenCalledTimes(1);
    expect(result.items[0].id).toBe('x');
  });
});

// ---------------------------------------------------------------------------
// getOrderFormIdFromApollo
// ---------------------------------------------------------------------------

describe('getOrderFormIdFromApollo', () => {
  it('reads a valid hex orderFormId from the Apollo cache', () => {
    mountElementWithFiber(fiberWithApolloOrderFormId(VALID_ID_A));
    expect(getOrderFormIdFromApollo()).toBe(VALID_ID_A);
  });

  it('rejects an Apollo orderFormId that fails the hex regex', () => {
    mountElementWithFiber(fiberWithApolloOrderFormId('not-a-hex-id'));
    expect(getOrderFormIdFromApollo()).toBeNull();
  });

  it('returns null when the Apollo client is missing', () => {
    mountElementWithFiber(memoizedPropsValueFiber({ setOrderForm: jest.fn() }));
    expect(getOrderFormIdFromApollo()).toBeNull();
  });

  it('returns null when no OrderForm:* key is present in the cache', () => {
    mountElementWithFiber({
      memoizedProps: {
        children: [
          {
            _owner: {
              stateNode: {
                apolloClient: { cache: { data: { data: { Foo: { id: 1 } } } } },
              },
            },
          },
        ],
      },
      memoizedState: null,
      dependencies: null,
      return: null,
    });
    expect(getOrderFormIdFromApollo()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getOrderFormIdFromContext
// ---------------------------------------------------------------------------

describe('getOrderFormIdFromContext', () => {
  it('reads a valid hex orderFormId from orderForm.orderFormId', () => {
    const context = buildContext({
      orderForm: { items: [], orderFormId: VALID_ID_B },
    });
    mountElementWithFiber(memoizedPropsValueFiber(context));
    expect(getOrderFormIdFromContext()).toBe(VALID_ID_B);
  });

  it('falls back to orderForm.id when orderFormId is missing', () => {
    const context = buildContext({
      orderForm: { items: [], id: VALID_ID_B },
    });
    mountElementWithFiber(memoizedPropsValueFiber(context));
    expect(getOrderFormIdFromContext()).toBe(VALID_ID_B);
  });

  it('rejects context id that fails the hex regex', () => {
    const context = buildContext({
      orderForm: { items: [], orderFormId: 'short-id' },
    });
    mountElementWithFiber(memoizedPropsValueFiber(context));
    expect(getOrderFormIdFromContext()).toBeNull();
  });

  it('returns null when no context is found in the fiber tree', () => {
    mountElementWithFiber({
      memoizedProps: null,
      memoizedState: null,
      dependencies: null,
      return: null,
    });
    expect(getOrderFormIdFromContext()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getOrderFormIdFromStorage
// ---------------------------------------------------------------------------

describe('getOrderFormIdFromStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads a valid hex orderFormId from localStorage', () => {
    localStorage.setItem('orderform', JSON.stringify({ id: VALID_ID_A }));
    expect(getOrderFormIdFromStorage()).toBe(VALID_ID_A);
  });

  it('reads from the orderFormId field when present', () => {
    localStorage.setItem(
      'orderform',
      JSON.stringify({ orderFormId: VALID_ID_B }),
    );
    expect(getOrderFormIdFromStorage()).toBe(VALID_ID_B);
  });

  it('rejects an invalid (non-hex) value', () => {
    localStorage.setItem('orderform', JSON.stringify({ id: 'vtex-local-456' }));
    expect(getOrderFormIdFromStorage()).toBeNull();
  });

  it('returns null when localStorage JSON is malformed', () => {
    localStorage.setItem('orderform', 'not-valid-json{{{');
    expect(getOrderFormIdFromStorage()).toBeNull();
  });

  it('returns null when there is no orderform entry', () => {
    expect(getOrderFormIdFromStorage()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getReliableOrderFormId
// ---------------------------------------------------------------------------

describe('getReliableOrderFormId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prefers Apollo over Context and Storage', () => {
    mountElementWithFiber(fiberWithApolloOrderFormId(VALID_ID_A));
    localStorage.setItem('orderform', JSON.stringify({ id: VALID_ID_C }));
    expect(getReliableOrderFormId()).toBe(VALID_ID_A);
  });

  it('falls back to Context when Apollo is unavailable', () => {
    const context = buildContext({
      orderForm: { items: [], orderFormId: VALID_ID_B },
    });
    mountElementWithFiber(memoizedPropsValueFiber(context));
    localStorage.setItem('orderform', JSON.stringify({ id: VALID_ID_C }));
    expect(getReliableOrderFormId()).toBe(VALID_ID_B);
  });

  it('falls back to Storage when neither Apollo nor Context have an id', () => {
    localStorage.setItem('orderform', JSON.stringify({ id: VALID_ID_C }));
    expect(getReliableOrderFormId()).toBe(VALID_ID_C);
  });

  it('returns null when every source is empty or invalid', () => {
    expect(getReliableOrderFormId()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getStableOrderFormId
// ---------------------------------------------------------------------------

describe('getStableOrderFormId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('resolves once the same id has been stable for the configured window', async () => {
    mountElementWithFiber(fiberWithApolloOrderFormId(VALID_ID_A));
    const result = await getStableOrderFormId({
      timeoutMs: 1000,
      stabilityWindowMs: 100,
      pollIntervalMs: 20,
    });
    expect(result).toBe(VALID_ID_A);
  });

  it('falls back to localStorage when neither Apollo nor Context have an id and the timeout expires', async () => {
    localStorage.setItem('orderform', JSON.stringify({ id: VALID_ID_C }));
    const result = await getStableOrderFormId({
      timeoutMs: 150,
      stabilityWindowMs: 50,
      pollIntervalMs: 20,
    });
    expect(result).toBe(VALID_ID_C);
  });

  it('rejects when no source ever yields an id', async () => {
    await expect(
      getStableOrderFormId({
        timeoutMs: 150,
        stabilityWindowMs: 50,
        pollIntervalMs: 20,
      }),
    ).rejects.toThrow('stable orderFormId');
  });
});

// ---------------------------------------------------------------------------
// setupMinicartBridge — additional window globals
// ---------------------------------------------------------------------------

describe('setupMinicartBridge — exposes orderForm helpers on window', () => {
  it('exposes findNativeOrderFormContext on window', () => {
    expect(window.findNativeOrderFormContext).toBe(findNativeOrderFormContext);
  });

  it('exposes getReliableOrderFormId on window', () => {
    expect(window.getReliableOrderFormId).toBe(getReliableOrderFormId);
  });

  it('exposes getStableOrderFormId on window', () => {
    expect(window.getStableOrderFormId).toBe(getStableOrderFormId);
  });

  it('exposes getOrderFormIdFromApollo on window', () => {
    expect(window.getOrderFormIdFromApollo).toBe(getOrderFormIdFromApollo);
  });
});
