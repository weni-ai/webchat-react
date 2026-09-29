import {
  alpha2FromAlpha3,
  callingCodeForAlpha2,
  formatNationalNumber,
  getStoreCountryAlpha3,
  internationalDigits,
  isValidInternationalNumber,
  loadStoreCountryAlpha3,
  readInitialPhoneCountry,
} from './phoneCountry';

describe('getStoreCountryAlpha3', () => {
  beforeEach(() => {
    delete window.__RUNTIME__;
    delete window.faststore_sdk_stores;
  });

  it('reads the VTEX culture country', () => {
    window.__RUNTIME__ = { culture: { country: 'bra' } };
    expect(getStoreCountryAlpha3()).toBe('BRA');
  });

  it('reads country from the FastStore session', () => {
    window.faststore_sdk_stores = {
      get: () => ({
        read: () => ({ country: 'BRA' }),
      }),
    };
    expect(getStoreCountryAlpha3()).toBe('BRA');
  });

  it('prefers the FastStore session over the VTEX IO segment token', () => {
    window.faststore_sdk_stores = {
      get: () => ({
        read: () => ({ country: 'USA' }),
      }),
    };
    window.__RUNTIME__ = {
      segmentToken: btoa(JSON.stringify({ countryCode: 'ARG' })),
    };
    expect(getStoreCountryAlpha3()).toBe('USA');
  });

  it('reads countryCode from the segment token when culture is absent', () => {
    window.__RUNTIME__ = {
      segmentToken: btoa(JSON.stringify({ countryCode: 'ARG' })),
    };
    expect(getStoreCountryAlpha3()).toBe('ARG');
  });

  it('prefers culture over the segment token', () => {
    window.__RUNTIME__ = {
      culture: { country: 'USA' },
      segmentToken: btoa(JSON.stringify({ countryCode: 'ARG' })),
    };
    expect(getStoreCountryAlpha3()).toBe('USA');
  });

  it('ignores a non-alpha-3 culture value and uses the segment', () => {
    window.__RUNTIME__ = {
      culture: { country: 'BR' },
      segmentToken: btoa(JSON.stringify({ countryCode: 'MEX' })),
    };
    expect(getStoreCountryAlpha3()).toBe('MEX');
  });

  it('returns null for a missing or malformed segment', () => {
    expect(getStoreCountryAlpha3()).toBeNull();
    window.__RUNTIME__ = { segmentToken: 'not-base64' };
    expect(getStoreCountryAlpha3()).toBeNull();
  });
});

describe('calling codes', () => {
  it('maps alpha-3 countries to calling codes', () => {
    expect(callingCodeForAlpha2(alpha2FromAlpha3('BRA'))).toBe('55');
    expect(callingCodeForAlpha2(alpha2FromAlpha3('ARG'))).toBe('54');
    expect(callingCodeForAlpha2(alpha2FromAlpha3('USA'))).toBe('1');
  });

  it('returns null for an unknown code', () => {
    expect(alpha2FromAlpha3('ZZZ')).toBeNull();
    expect(callingCodeForAlpha2(null)).toBeNull();
    expect(callingCodeForAlpha2('not-a-country')).toBeNull();
  });
});

describe('national number formatting and validation', () => {
  it('formats a Brazilian national number', () => {
    expect(formatNationalNumber('51996542347', 'BR')).toBe('(51) 99654-2347');
  });

  it('rejects an impossible number and accepts a valid one', () => {
    expect(isValidInternationalNumber('+55', '(11) 99999-9999')).toBe(true);
    expect(isValidInternationalNumber('+55', '123')).toBe(false);
    expect(isValidInternationalNumber('', '11999999999')).toBe(false);
  });

  it('joins DDI and national digits', () => {
    expect(internationalDigits('+55', '(11) 99999-9999')).toBe('5511999999999');
  });
});

describe('loadStoreCountryAlpha3', () => {
  beforeEach(() => {
    delete window.__RUNTIME__;
    delete window.faststore_sdk_stores;
    globalThis.fetch = jest.fn();
  });

  it('reads countryCode from /api/segments when the page has no session', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ countryCode: 'MEX' }),
    });

    await expect(loadStoreCountryAlpha3()).resolves.toBe('MEX');
  });

  it('does not call /api/segments when the country is already on the page', async () => {
    window.__RUNTIME__ = { culture: { country: 'BRA' } };

    await expect(loadStoreCountryAlpha3()).resolves.toBe('BRA');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('readInitialPhoneCountry', () => {
  beforeEach(() => {
    delete window.__RUNTIME__;
    delete window.faststore_sdk_stores;
  });

  it('prefills DDI from the store country', () => {
    window.__RUNTIME__ = { culture: { country: 'ARG' } };
    expect(readInitialPhoneCountry()).toEqual({ alpha2: 'AR', ddi: '+54' });
  });

  it('leaves DDI empty when the country cannot be resolved', () => {
    expect(readInitialPhoneCountry()).toEqual({ alpha2: null, ddi: '' });
  });
});
