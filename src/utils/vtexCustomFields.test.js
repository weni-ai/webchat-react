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
  getValidOrderFormId,
  watchCustomField,
  startVtexCustomFieldsSync,
} from './vtexCustomFields';

const VALID_ORDER_FORM_ID = 'a1b2c3d4e5f6789012345678abcdef01';

beforeEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  delete window.__RUNTIME__;
  delete window.faststore_sdk_stores;
  global.fetch = jest.fn();
  getReliableOrderFormId.mockReturnValue(null);
  getVtexAccount.mockReturnValue(undefined);
});

describe('getSegment', () => {
  it('returns stringified response from /api/segments when ok', async () => {
    const segment = { channel: '1', priceTables: ['default'] };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(segment),
    });

    const result = await getSegment();

    expect(global.fetch).toHaveBeenCalledWith('/api/segments');
    expect(result).toBe(JSON.stringify(segment));
  });

  it('falls back to FastStore session store when /api/segments fails', async () => {
    global.fetch.mockRejectedValue(new Error('network error'));
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
    global.fetch.mockResolvedValue({ ok: false });
    const decoded = '{"regionId":"BR"}';
    window.__RUNTIME__ = {
      segmentToken: btoa(decoded),
    };

    const result = await getSegment();

    expect(result).toBe(decoded);
  });

  it('returns null when no source provides segment data', async () => {
    global.fetch.mockResolvedValue({ ok: false });

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
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns id from getReliableOrderFormId when FastStore cart is absent', async () => {
    getReliableOrderFormId.mockReturnValue(VALID_ORDER_FORM_ID);

    const result = await getValidOrderFormId();

    expect(result).toBe(VALID_ORDER_FORM_ID);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches /api/checkout/pub/orderForm when local sources are absent', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ orderFormId: VALID_ORDER_FORM_ID }),
    });

    const result = await getValidOrderFormId();

    expect(global.fetch).toHaveBeenCalledWith('/api/checkout/pub/orderForm');
    expect(result).toBe(VALID_ORDER_FORM_ID);
  });

  it('returns null when resolved id is not a valid 32-hex string', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ orderFormId: 'invalid-id' }),
    });

    const result = await getValidOrderFormId();

    expect(result).toBeNull();
  });
});

describe('watchCustomField', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
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

describe('startVtexCustomFieldsSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends each field independently as soon as it becomes available', async () => {
    getVtexAccount.mockReturnValue('mystore');
    const setCustomField = jest.fn();

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ channel: '1' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ orderFormId: VALID_ORDER_FORM_ID }),
      });

    startVtexCustomFieldsSync(setCustomField);

    await Promise.resolve();

    expect(setCustomField).toHaveBeenCalledWith('vtex_account', 'mystore');
    expect(setCustomField).toHaveBeenCalledWith(
      'segment',
      JSON.stringify({ channel: '1' }),
    );
    expect(setCustomField).toHaveBeenCalledWith(
      'orderform',
      VALID_ORDER_FORM_ID,
    );
  });

  it('sends vtex_account immediately while other fields arrive later', async () => {
    getVtexAccount
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce('late-account');

    const setCustomField = jest.fn();
    let segmentCalls = 0;

    global.fetch.mockImplementation((url) => {
      if (url === '/api/segments') {
        segmentCalls += 1;
        if (segmentCalls < 3) {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ channel: 'delayed' }),
        });
      }

      return Promise.resolve({
        json: () => Promise.resolve({ orderFormId: VALID_ORDER_FORM_ID }),
      });
    });

    startVtexCustomFieldsSync(setCustomField, { intervalMs: 1000 });

    await Promise.resolve();
    expect(setCustomField).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);
    expect(setCustomField).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);
    expect(setCustomField).toHaveBeenCalledWith('vtex_account', 'late-account');
    expect(setCustomField).not.toHaveBeenCalledWith(
      'segment',
      expect.anything(),
    );

    await jest.advanceTimersByTimeAsync(1000);
    expect(setCustomField).toHaveBeenCalledWith(
      'segment',
      JSON.stringify({ channel: 'delayed' }),
    );
    expect(setCustomField).toHaveBeenCalledWith(
      'orderform',
      VALID_ORDER_FORM_ID,
    );
  });

  it('does not send vtex_account when getVtexAccount never returns a value', async () => {
    getVtexAccount.mockReturnValue(undefined);
    const setCustomField = jest.fn();

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ channel: '1' }),
    });
    getReliableOrderFormId.mockReturnValue(VALID_ORDER_FORM_ID);

    const stop = startVtexCustomFieldsSync(setCustomField);

    await Promise.resolve();

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

    stop();
  });

  it('stop clears pending timeouts', async () => {
    getVtexAccount.mockReturnValue(undefined);
    const setCustomField = jest.fn();
    global.fetch.mockResolvedValue({ ok: false });

    const stop = startVtexCustomFieldsSync(setCustomField);
    await Promise.resolve();
    stop();

    await jest.advanceTimersByTimeAsync(5000);

    expect(setCustomField).not.toHaveBeenCalled();
  });
});
