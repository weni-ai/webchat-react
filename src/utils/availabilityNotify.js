import { getSelectedSkuId } from '@/utils/vtex';

export const AVAILABILITY_NOTIFY_SUBSCRIBE_PATH =
  '/_v/availability-notify/subscribe';

const LOCALE_BY_LANGUAGE = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  ro: 'ro-RO',
};

function isRegionalLocale(value) {
  return typeof value === 'string' && value.includes('-');
}

export function digitsOnlyPhone(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

export function getSalesChannel() {
  try {
    const fastStoreSegment = window.faststore_sdk_stores
      ?.get('fs::session')
      ?.read?.();
    if (fastStoreSegment?.channel != null && fastStoreSegment.channel !== '') {
      return String(fastStoreSegment.channel);
    }
  } catch {
    /* ignore */
  }

  try {
    const token = window.__RUNTIME__?.segmentToken;
    if (token) {
      const parsed = JSON.parse(atob(token));
      if (parsed?.channel != null && parsed.channel !== '') {
        return String(parsed.channel);
      }
    }
  } catch {
    /* ignore */
  }

  return '1';
}

export function getNotifyLocale(language) {
  const runtimeLocale = window.__RUNTIME__?.culture?.locale;
  if (isRegionalLocale(runtimeLocale)) return runtimeLocale;

  const htmlLang = document.documentElement?.lang;
  if (isRegionalLocale(htmlLang)) return htmlLang;

  if (!language) return 'pt-BR';
  if (isRegionalLocale(language)) return language;

  return LOCALE_BY_LANGUAGE[language] || language;
}

export function buildAvailabilityNotifyBody({
  name,
  phone,
  skuId,
  seller,
  language,
} = {}) {
  const resolvedSkuId = skuId || getSelectedSkuId() || '';

  return {
    sku_id: resolvedSkuId === '' ? '' : String(resolvedSkuId),
    phone: digitsOnlyPhone(phone),
    name: String(name ?? '').trim(),
    seller: seller ? String(seller) : '1',
    sales_channel: getSalesChannel(),
    locale: getNotifyLocale(language),
  };
}

export async function subscribeAvailabilityNotify(payload) {
  try {
    await fetch(AVAILABILITY_NOTIFY_SUBSCRIBE_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAvailabilityNotifyBody(payload)),
    });
  } catch {
    /* ignore network errors */
  }
}
