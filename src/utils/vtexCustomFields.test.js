jest.mock('@/utils/VTEXIOMinicartBridge', () => ({
  getReliableOrderFormId: jest.fn(),
}));

jest.mock('@/utils/vtex', () => ({
  getVtexAccount: jest.fn(),
}));

import { getReliableOrderFormId } from '@/utils/VTEXIOMinicartBridge';
import { getVtexAccount } from '@/utils/vtex';
import {
  getSegment,
  getSessionToken,
  getValidOrderFormId,
  watchChangingCustomField,
  watchCustomField,
  startVtexCustomFieldsSync,
} from './vtexCustomFields';

const VALID_ORDER_FORM_ID = 'a1b2c3d4e5f6789012345678abcdef01';

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  jest.clearAllMocks();
  getReliableOrderFormId.mockReset();
  getReliableOrderFormId.mockReturnValue(null);
  getVtexAccount.mockReset();
  getVtexAccount.mockReturnValue(undefined);
  jest.useRealTimers();
  delete window.__RUNTIME__;
  delete window.faststore_sdk_stores;
  globalThis.fetch = jest.fn();
});

describe('getSegment', () => {
  it('returns stringified response from /api/segments when ok', async () => {
    const segment = { channel: '1', priceTables: ['default'] };
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(segment),
    });

    const result = await getSegment();

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/segments');
    expect(result).toBe(JSON.stringify(segment));
  });

  it('falls back to FastStore session store when /api/segments fails', async () => {
    globalThis.fetch.mockRejectedValue(new Error('network error'));
    const fastStoreSegment = { channel: 'fs-channel' };
    window.faststore_sdk_stores = {
      get: jest.fn(() => ({
        read: () => fastStoreSegment,
      })),
    };

    const result = await getSegment();

    expect(result).toBe(JSON.stringify(fastStoreSegment));
  });

  it('falls back to __RUNTIME__.segmentToken when earlier sources fail', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false });
    const decoded = '{"regionId":"BR"}';
    window.__RUNTIME__ = {
      segmentToken: btoa(decoded),
    };

    const result = await getSegment();

    expect(result).toBe(decoded);
  });

  it('returns null when no source provides segment data', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false });

    const result = await getSegment();

    expect(result).toBeNull();
  });
});

describe('getValidOrderFormId', () => {
  it('returns FastStore cart id when available and valid', async () => {
    window.faststore_sdk_stores = {
      get: jest.fn(() => ({
        read: () => ({ id: VALID_ORDER_FORM_ID }),
      })),
    };

    const result = await getValidOrderFormId();

    expect(result).toBe(VALID_ORDER_FORM_ID);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns id from getReliableOrderFormId when FastStore cart is absent', async () => {
    getReliableOrderFormId.mockReturnValue(VALID_ORDER_FORM_ID);

    const result = await getValidOrderFormId();

    expect(result).toBe(VALID_ORDER_FORM_ID);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fetches /api/checkout/pub/orderForm when local sources are absent', async () => {
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({ orderFormId: VALID_ORDER_FORM_ID }),
    });

    const result = await getValidOrderFormId();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/checkout/pub/orderForm',
    );
    expect(result).toBe(VALID_ORDER_FORM_ID);
  });

  it('returns null when resolved id is not a valid 32-hex string', async () => {
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({ orderFormId: 'invalid-id' }),
    });

    const result = await getValidOrderFormId();

    expect(result).toBeNull();
  });
});

describe('getSessionToken', () => {
  it('POSTs to /api/sessions and returns sessionToken', async () => {
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({ sessionToken: 'token-abc' }),
    });

    const result = await getSessionToken();

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(result).toBe('token-abc');
  });

  it('returns null when response has no sessionToken', async () => {
    globalThis.fetch.mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const result = await getSessionToken();

    expect(result).toBeNull();
  });
});

describe('watchCustomField', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('sends the field as soon as the resolver returns a value', async () => {
    const setCustomField = jest.fn();
    const resolve = jest.fn().mockResolvedValue('segment-value');

    watchCustomField({
      resolve,
      field: 'segment',
      setCustomField,
      intervalMs: 1000,
    });

    await Promise.resolve();

    expect(setCustomField).toHaveBeenCalledWith('segment', 'segment-value');
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('keeps polling until the resolver returns a value', async () => {
    const setCustomField = jest.fn();
    const resolve = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('orderform-id');

    watchCustomField({
      resolve,
      field: 'orderform',
      setCustomField,
      intervalMs: 1000,
    });

    await Promise.resolve();
    expect(setCustomField).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);
    expect(setCustomField).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);
    expect(setCustomField).toHaveBeenCalledWith('orderform', 'orderform-id');
    expect(resolve).toHaveBeenCalledTimes(3);
  });

  it('stops polling after the first successful send', async () => {
    const setCustomField = jest.fn();
    const resolve = jest.fn().mockResolvedValue('account');

    watchCustomField({
      resolve,
      field: 'vtex_account',
      setCustomField,
      intervalMs: 1000,
    });

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(5000);

    expect(setCustomField).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('respects isCancelled and does not schedule further polls', async () => {
    const setCustomField = jest.fn();
    const resolve = jest.fn().mockResolvedValue(null);
    let cancelled = false;

    watchCustomField({
      resolve,
      field: 'segment',
      setCustomField,
      intervalMs: 1000,
      isCancelled: () => cancelled,
    });

    await Promise.resolve();
    cancelled = true;
    await jest.advanceTimersByTimeAsync(3000);

    expect(setCustomField).not.toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});

describe('watchChangingCustomField', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('sends the field when the resolver returns a value', async () => {
    const setCustomField = jest.fn();
    const resolve = jest.fn().mockResolvedValue('token-1');

    watchChangingCustomField({
      resolve,
      field: 'session',
      setCustomField,
      intervalMs: 20_000,
    });

    await flushMicrotasks();

    expect(setCustomField).toHaveBeenCalledWith('session', 'token-1');
  });

  it('keeps polling and only sends again when the value changes', async () => {
    const setCustomField = jest.fn();
    const resolve = jest
      .fn()
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2');

    watchChangingCustomField({
      resolve,
      field: 'session',
      setCustomField,
      intervalMs: 20_000,
    });

    await flushMicrotasks();
    expect(setCustomField).toHaveBeenCalledTimes(1);
    expect(setCustomField).toHaveBeenCalledWith('session', 'token-1');

    await jest.advanceTimersByTimeAsync(20_000);
    expect(setCustomField).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(20_000);
    expect(setCustomField).toHaveBeenCalledTimes(2);
    expect(setCustomField).toHaveBeenLastCalledWith('session', 'token-2');
    expect(resolve).toHaveBeenCalledTimes(3);
  });

  it('respects isCancelled and does not schedule further polls', async () => {
    const setCustomField = jest.fn();
    const resolve = jest.fn().mockResolvedValue('token-1');
    let cancelled = false;

    watchChangingCustomField({
      resolve,
      field: 'session',
      setCustomField,
      intervalMs: 20_000,
      isCancelled: () => cancelled,
    });

    await flushMicrotasks();
    cancelled = true;
    await jest.advanceTimersByTimeAsync(60_000);

    expect(setCustomField).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});

function mockFetchByUrl({ segment, sessionToken, orderFormId } = {}) {
  globalThis.fetch.mockImplementation((url) => {
    if (url === '/api/segments') {
      if (segment == null) {
        return Promise.resolve({ ok: false });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(segment),
      });
    }

    if (url === '/api/sessions') {
      return Promise.resolve({
        json: () => Promise.resolve({ sessionToken: sessionToken ?? null }),
      });
    }

    if (url === '/api/checkout/pub/orderForm') {
      return Promise.resolve({
        json: () => Promise.resolve({ orderFormId }),
      });
    }

    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

describe('startVtexCustomFieldsSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('sends each field independently as soon as it becomes available', async () => {
    getVtexAccount.mockReturnValue('mystore');
    getReliableOrderFormId.mockReturnValue(VALID_ORDER_FORM_ID);
    const setCustomField = jest.fn();

    mockFetchByUrl({
      segment: { channel: '1' },
      sessionToken: 'session-token-1',
    });

    const stop = startVtexCustomFieldsSync(setCustomField);

    await flushMicrotasks();

    expect(setCustomField).toHaveBeenCalledWith('vtex_account', 'mystore');
    expect(setCustomField).toHaveBeenCalledWith(
      'segment',
      JSON.stringify({ channel: '1' }),
    );
    expect(setCustomField).toHaveBeenCalledWith(
      'orderform',
      VALID_ORDER_FORM_ID,
    );
    expect(setCustomField).toHaveBeenCalledWith('session', 'session-token-1');

    stop();
  });

  it('does not block one field while others are still unavailable', async () => {
    getVtexAccount.mockReturnValue(undefined);
    getReliableOrderFormId.mockReturnValue(VALID_ORDER_FORM_ID);
    const setCustomField = jest.fn();

    mockFetchByUrl();

    const stop = startVtexCustomFieldsSync(setCustomField);

    await flushMicrotasks();

    expect(setCustomField).toHaveBeenCalledWith(
      'orderform',
      VALID_ORDER_FORM_ID,
    );
    expect(setCustomField).not.toHaveBeenCalledWith(
      'segment',
      expect.anything(),
    );
    expect(setCustomField).not.toHaveBeenCalledWith(
      'vtex_account',
      expect.anything(),
    );
    expect(setCustomField).not.toHaveBeenCalledWith(
      'session',
      expect.anything(),
    );

    stop();
  });

  it('does not send vtex_account when getVtexAccount never returns a value', async () => {
    getVtexAccount.mockReturnValue(undefined);
    const setCustomField = jest.fn();

    mockFetchByUrl({
      segment: { channel: '1' },
      sessionToken: 'session-token-1',
    });
    getReliableOrderFormId.mockReturnValue(VALID_ORDER_FORM_ID);

    const stop = startVtexCustomFieldsSync(setCustomField);

    await flushMicrotasks();

    expect(setCustomField).not.toHaveBeenCalledWith(
      'vtex_account',
      expect.anything(),
    );
    expect(setCustomField).toHaveBeenCalledWith(
      'segment',
      JSON.stringify({ channel: '1' }),
    );
    expect(setCustomField).toHaveBeenCalledWith(
      'orderform',
      VALID_ORDER_FORM_ID,
    );
    expect(setCustomField).toHaveBeenCalledWith('session', 'session-token-1');

    stop();
  });

  it('re-sends session when the token changes on later polls', async () => {
    getVtexAccount.mockReturnValue(undefined);
    getReliableOrderFormId.mockReturnValue(null);
    const setCustomField = jest.fn();

    globalThis.fetch.mockImplementation((url) => {
      if (url === '/api/segments') {
        return Promise.resolve({ ok: false });
      }

      if (url === '/api/sessions') {
        const callCount = globalThis.fetch.mock.calls.filter(
          ([requestedUrl]) => requestedUrl === '/api/sessions',
        ).length;
        const sessionToken =
          callCount <= 1 ? 'session-token-1' : 'session-token-2';

        return Promise.resolve({
          json: () => Promise.resolve({ sessionToken }),
        });
      }

      if (url === '/api/checkout/pub/orderForm') {
        return Promise.resolve({
          json: () => Promise.resolve({ orderFormId: null }),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    const stop = startVtexCustomFieldsSync(setCustomField);

    await flushMicrotasks();
    expect(setCustomField).toHaveBeenCalledWith('session', 'session-token-1');

    await jest.advanceTimersByTimeAsync(20_000);
    expect(setCustomField).toHaveBeenCalledWith('session', 'session-token-2');

    stop();
  });

  it('stop clears pending timeouts', async () => {
    getVtexAccount.mockReturnValue(undefined);
    const setCustomField = jest.fn();
    mockFetchByUrl();

    const stop = startVtexCustomFieldsSync(setCustomField);
    await flushMicrotasks();
    stop();

    await jest.advanceTimersByTimeAsync(25_000);

    expect(setCustomField).not.toHaveBeenCalled();
  });
});
