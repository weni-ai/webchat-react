import { getReliableOrderFormId } from '@/utils/VTEXIOMinicartBridge';
import { getVtexAccount } from '@/utils/vtex';

const ORDER_FORM_ID_REGEX = /^[a-f0-9]{32}$/;
const DEFAULT_POLL_INTERVAL_MS = 1000;
const SESSION_POLL_INTERVAL_MS = 20_000;

function isValidOrderFormId(value) {
  return typeof value === 'string' && ORDER_FORM_ID_REGEX.test(value);
}

export async function getSegment() {
  try {
    const response = await fetch('/api/segments');

    if (response.ok) {
      const apiSegment = await response.json();

      if (apiSegment) {
        return JSON.stringify(apiSegment);
      }
    }
  } catch {
    // continue to fallbacks
  }

  const fastStoreSegment = window.faststore_sdk_stores
    ?.get('fs::session')
    ?.read?.();

  if (fastStoreSegment) {
    return JSON.stringify(fastStoreSegment);
  }

  const vtexIoSegment = window.__RUNTIME__?.segmentToken;

  if (vtexIoSegment) {
    return atob(vtexIoSegment);
  }

  return null;
}

async function getOrderFormId() {
  const fastStoreOrderFormId = window.faststore_sdk_stores
    ?.get('fs::cart')
    ?.read?.()?.id;

  if (fastStoreOrderFormId) {
    return fastStoreOrderFormId;
  }

  try {
    const vtexIoOrderFormId = getReliableOrderFormId();
    if (vtexIoOrderFormId) return vtexIoOrderFormId;
  } catch {
    // bridge unavailable — fall through to fetch
  }

  try {
    const response = await fetch('/api/checkout/pub/orderForm');
    const data = await response.json();
    return data.orderFormId ?? null;
  } catch {
    return null;
  }
}

export async function getValidOrderFormId() {
  const orderFormId = await getOrderFormId();

  if (isValidOrderFormId(orderFormId)) {
    return orderFormId;
  }

  return null;
}

export async function getSessionToken() {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  return data.sessionToken || null;
}

export function watchCustomField({
  resolve,
  field,
  setCustomField,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  isCancelled = () => false,
  onTimeoutScheduled,
}) {
  async function poll() {
    if (isCancelled()) return;

    try {
      const value = await resolve();

      if (isCancelled()) return;

      if (value) {
        setCustomField(field, value);
        return;
      }
    } catch {
      // continue polling on resolver errors
    }

    if (isCancelled()) return;

    const timeoutId = setTimeout(poll, intervalMs);
    onTimeoutScheduled?.(timeoutId);
  }

  poll();
}

/**
 * Continuously polls and calls setCustomField whenever the resolved value changes.
 * Used for session tokens that can rotate while the chat is open.
 */
export function watchChangingCustomField({
  resolve,
  field,
  setCustomField,
  intervalMs = SESSION_POLL_INTERVAL_MS,
  isCancelled = () => false,
  onTimeoutScheduled,
}) {
  let lastValue = null;

  async function poll() {
    if (isCancelled()) return;

    try {
      const value = await resolve();

      if (isCancelled()) return;

      if (value && value !== lastValue) {
        lastValue = value;
        setCustomField(field, value);
      }
    } catch {
      // continue polling on resolver errors
    }

    if (isCancelled()) return;

    const timeoutId = setTimeout(poll, intervalMs);
    onTimeoutScheduled?.(timeoutId);
  }

  poll();
}

export function startVtexCustomFieldsSync(
  setCustomField,
  { isCancelled: externalIsCancelled = () => false } = {},
) {
  const timeouts = [];
  let stopped = false;
  const isCancelled = () => stopped || externalIsCancelled();
  const onTimeoutScheduled = (timeoutId) => timeouts.push(timeoutId);

  const watchers = [
    { resolve: () => getVtexAccount(), field: 'vtex_account' },
    { resolve: getSegment, field: 'segment' },
    { resolve: getValidOrderFormId, field: 'orderform' },
  ];

  for (const { resolve, field } of watchers) {
    watchCustomField({
      resolve,
      field,
      setCustomField,
      isCancelled,
      onTimeoutScheduled,
    });
  }

  watchChangingCustomField({
    resolve: getSessionToken,
    field: 'session',
    setCustomField,
    isCancelled,
    onTimeoutScheduled,
  });

  return function stop() {
    stopped = true;
    timeouts.forEach(clearTimeout);
    timeouts.length = 0;
  };
}
