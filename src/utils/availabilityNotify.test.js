import {
  AVAILABILITY_NOTIFY_SUBSCRIBE_PATH,
  buildAvailabilityNotifyBody,
  digitsOnlyPhone,
  getNotifyLocale,
  getSalesChannel,
  subscribeAvailabilityNotify,
} from './availabilityNotify';

jest.mock('@/utils/vtex', () => ({
  getSelectedSkuId: jest.fn(),
}));

import { getSelectedSkuId } from '@/utils/vtex';

describe('digitsOnlyPhone', () => {
  it('strips non-digits', () => {
    expect(digitsOnlyPhone('+55 11 99999-9999')).toBe('5511999999999');
  });

  it('returns empty string for missing values', () => {
    expect(digitsOnlyPhone(undefined)).toBe('');
    expect(digitsOnlyPhone(null)).toBe('');
  });
});

describe('getSalesChannel', () => {
  beforeEach(() => {
    delete window.__RUNTIME__;
    delete window.faststore_sdk_stores;
  });

  it('returns FastStore session channel', () => {
    window.faststore_sdk_stores = {
      get: () => ({
        read: () => ({ channel: '2' }),
      }),
    };

    expect(getSalesChannel()).toBe('2');
  });

  it('returns channel from __RUNTIME__.segmentToken', () => {
    window.__RUNTIME__ = {
      segmentToken: btoa(JSON.stringify({ channel: '3' })),
    };

    expect(getSalesChannel()).toBe('3');
  });

  it('falls back to 1', () => {
    expect(getSalesChannel()).toBe('1');
  });
});

describe('getNotifyLocale', () => {
  const originalLang = document.documentElement.lang;

  beforeEach(() => {
    delete window.__RUNTIME__;
    document.documentElement.lang = '';
  });

  afterEach(() => {
    document.documentElement.lang = originalLang;
  });

  it('prefers VTEX culture locale', () => {
    window.__RUNTIME__ = { culture: { locale: 'es-AR' } };
    expect(getNotifyLocale('pt')).toBe('es-AR');
  });

  it('uses document lang when it has a region', () => {
    document.documentElement.lang = 'en-GB';
    expect(getNotifyLocale('pt')).toBe('en-GB');
  });

  it('maps i18n language codes', () => {
    expect(getNotifyLocale('pt')).toBe('pt-BR');
    expect(getNotifyLocale('en')).toBe('en-US');
    expect(getNotifyLocale('es')).toBe('es-ES');
    expect(getNotifyLocale('ro')).toBe('ro-RO');
  });

  it('keeps regional language codes', () => {
    expect(getNotifyLocale('pt-BR')).toBe('pt-BR');
  });
});

describe('buildAvailabilityNotifyBody', () => {
  beforeEach(() => {
    delete window.__RUNTIME__;
    delete window.faststore_sdk_stores;
    document.documentElement.lang = '';
    getSelectedSkuId.mockReturnValue(null);
  });

  it('builds the subscribe payload', () => {
    window.__RUNTIME__ = { culture: { locale: 'pt-BR' } };

    expect(
      buildAvailabilityNotifyBody({
        name: ' John ',
        phone: '+55 99999-99999',
        skuId: '27',
        seller: '1',
      }),
    ).toEqual({
      sku_id: '27',
      phone: '559999999999',
      name: 'John',
      seller: '1',
      sales_channel: '1',
      locale: 'pt-BR',
    });
  });

  it('falls back to getSelectedSkuId and seller 1', () => {
    getSelectedSkuId.mockReturnValue('99');

    expect(
      buildAvailabilityNotifyBody({
        name: 'Ana',
        phone: '11999999999',
      }),
    ).toMatchObject({
      sku_id: '99',
      seller: '1',
    });
  });
});

describe('subscribeAvailabilityNotify', () => {
  beforeEach(() => {
    delete window.__RUNTIME__;
    delete window.faststore_sdk_stores;
    document.documentElement.lang = 'pt-BR';
    getSelectedSkuId.mockReturnValue(null);
    globalThis.fetch = jest.fn();
  });

  it('POSTs JSON to the subscribe route', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true });

    await subscribeAvailabilityNotify({
      name: 'John',
      phone: '5599999999999',
      skuId: '27',
      seller: '1',
      language: 'pt',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      AVAILABILITY_NOTIFY_SUBSCRIBE_PATH,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_id: '27',
          phone: '5599999999999',
          name: 'John',
          seller: '1',
          sales_channel: '1',
          locale: 'pt-BR',
        }),
      },
    );
  });

  it('swallows network errors', async () => {
    globalThis.fetch.mockRejectedValue(new Error('offline'));

    await expect(
      subscribeAvailabilityNotify({ name: 'John', phone: '1', skuId: '27' }),
    ).resolves.toBeUndefined();
  });
});
