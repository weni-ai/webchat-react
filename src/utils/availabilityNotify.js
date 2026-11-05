function readChannel(value) {
  if (value == null || value === '') return null;
  return String(value);
}

export function getSalesChannel() {
  try {
    const fastStoreSegment = window.faststore_sdk_stores
      ?.get('fs::session')
      ?.read?.();
    const fastStoreChannel = readChannel(fastStoreSegment?.channel);
    if (fastStoreChannel) return fastStoreChannel;
  } catch {
    /* ignore */
  }

  try {
    const token = window.__RUNTIME__?.segmentToken;
    if (token) {
      const parsed = JSON.parse(atob(token));
      const channel = readChannel(parsed?.channel);
      if (channel) return channel;
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function getStoreLocaleCandidates() {
  const candidates = [];
  const runtimeLocale = window.__RUNTIME__?.culture?.locale;
  if (typeof runtimeLocale === 'string' && runtimeLocale.trim() !== '') {
    candidates.push(runtimeLocale);
  }
  const htmlLang = document.documentElement?.lang;
  if (typeof htmlLang === 'string' && htmlLang.trim() !== '') {
    candidates.push(htmlLang);
  }
  return candidates;
}
