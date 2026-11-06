import {
  getSalesChannel,
  getStoreLocaleCandidates,
} from './availabilityNotify';

describe('getSalesChannel', () => {
  beforeEach(() => {
    delete window.__RUNTIME__;
    delete window.faststore_sdk_stores;
  });

  it('returns the FastStore session channel', () => {
    window.faststore_sdk_stores = {
      get: () => ({
        read: () => ({ channel: '2' }),
      }),
    };

    expect(getSalesChannel()).toBe('2');
  });

  it('returns the channel from __RUNTIME__.segmentToken', () => {
    window.__RUNTIME__ = {
      segmentToken: btoa(JSON.stringify({ channel: '3' })),
    };

    expect(getSalesChannel()).toBe('3');
  });

  it('returns null when the channel is missing or the token is malformed', () => {
    expect(getSalesChannel()).toBeNull();

    window.__RUNTIME__ = { segmentToken: 'not-base64' };
    expect(getSalesChannel()).toBeNull();
  });
});

describe('getStoreLocaleCandidates', () => {
  const originalLang = document.documentElement.lang;

  beforeEach(() => {
    delete window.__RUNTIME__;
    document.documentElement.lang = '';
  });

  afterEach(() => {
    document.documentElement.lang = originalLang;
  });

  it('returns the runtime locale and then the document language, dropping blanks', () => {
    window.__RUNTIME__ = { culture: { locale: 'es-AR' } };
    document.documentElement.lang = 'en-GB';
    expect(getStoreLocaleCandidates()).toEqual(['es-AR', 'en-GB']);

    window.__RUNTIME__ = { culture: { locale: '  ' } };
    document.documentElement.lang = '';
    expect(getStoreLocaleCandidates()).toEqual([]);
  });
});
