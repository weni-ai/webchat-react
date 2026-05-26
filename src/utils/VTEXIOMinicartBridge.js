/**
 * VTEX IO storefront bridge:
 * - Resolves the current `orderFormId` from multiple sources (Apollo cache,
 *   React Context, localStorage), preferring the most authoritative one and
 *   validating the value against the canonical 32-hex format.
 * - Refreshes the host checkout `orderForm` Context via React Fiber lookup,
 *   preserving previously-rendered item images to avoid minicart flicker.
 */

const ORDER_FORM_REFRESH_URL =
  '/api/checkout/pub/orderForm?allowedOutdatedData=false';
const MAX_FIBER_SEARCH_DEPTH = 150;
const REACT_FIBER_KEY_PREFIXES = ['__reactFiber', '__reactInternalInstance'];
const ROOT_SELECTORS = [
  '.render-provider',
  '.render-container',
  '#render-store-div',
];
const GENERIC_ROOT_TAG_SELECTOR =
  'div, span, section, aside, header, nav, main';
const ORDER_FORM_ID_REGEX = /^[a-f0-9]{32}$/;

// ─── Fiber helpers ────────────────────────────────────────────────────────

function getReactFiberKey(hostNode) {
  const keys = Object.keys(hostNode);
  for (const prefix of REACT_FIBER_KEY_PREFIXES) {
    const found = keys.find((k) => k.startsWith(prefix));
    if (found) return found;
  }
  return null;
}

function findRootWithFiber() {
  for (const selector of ROOT_SELECTORS) {
    const el = document.querySelector(selector);
    if (el && getReactFiberKey(el)) return el;
  }
  for (const el of document.querySelectorAll(GENERIC_ROOT_TAG_SELECTOR)) {
    if (getReactFiberKey(el)) return el;
  }
  return null;
}

function getRootFiber() {
  const root = findRootWithFiber();
  if (!root) return null;
  const key = getReactFiberKey(root);
  return root[key] ?? null;
}

// ─── OrderForm context discovery ──────────────────────────────────────────

function isOrderFormContext(obj) {
  return (
    obj != null &&
    typeof obj === 'object' &&
    typeof obj.setOrderForm === 'function'
  );
}

function extractOrderFormContextFromFiber(fiber) {
  if (!fiber) return null;
  try {
    if (isOrderFormContext(fiber.memoizedProps?.value)) {
      return fiber.memoizedProps.value;
    }
    let hook = fiber.memoizedState;
    while (hook) {
      if (isOrderFormContext(hook.memoizedState)) return hook.memoizedState;
      hook = hook.next;
    }
    let ctx = fiber.dependencies?.firstContext;
    while (ctx) {
      if (isOrderFormContext(ctx.memoizedValue)) return ctx.memoizedValue;
      ctx = ctx.next;
    }
  } catch {
    /* fiber inspection threw — skip this node */
  }
  return null;
}

function searchFiberDescendants(fiber, depth = 0) {
  if (!fiber || depth > MAX_FIBER_SEARCH_DEPTH) return null;
  const here = extractOrderFormContextFromFiber(fiber);
  if (here) return here;
  return (
    searchFiberDescendants(fiber.child, depth + 1) ||
    searchFiberDescendants(fiber.sibling, depth)
  );
}

function searchFiberAncestors(fiber) {
  let current = fiber;
  for (let depth = 0; depth < MAX_FIBER_SEARCH_DEPTH && current; depth += 1) {
    const here = extractOrderFormContextFromFiber(current);
    if (here) return here;
    current = current.return;
  }
  return null;
}

export function findNativeOrderFormContext() {
  const fiber = getRootFiber();
  if (!fiber) {
    console.warn('[Minicart] Root fiber not found');
    return null;
  }
  return searchFiberDescendants(fiber) || searchFiberAncestors(fiber);
}

// ─── OrderFormId resolution sources ───────────────────────────────────────

function isValidOrderFormId(value) {
  return typeof value === 'string' && ORDER_FORM_ID_REGEX.test(value);
}

export function getOrderFormIdFromApollo() {
  try {
    const fiber = getRootFiber();
    const apolloClient =
      fiber?.memoizedProps?.children?.[0]?._owner?.stateNode?.apolloClient;
    if (!apolloClient) return null;

    const cacheData = apolloClient.cache?.data?.data;
    if (!cacheData) return null;

    const orderFormKey = Object.keys(cacheData).find((k) =>
      k.startsWith('OrderForm:'),
    );
    if (!orderFormKey) return null;

    const id =
      cacheData[orderFormKey]?.orderFormId ?? cacheData[orderFormKey]?.id;
    return isValidOrderFormId(id) ? id : null;
  } catch {
    return null;
  }
}

export function getOrderFormIdFromContext() {
  try {
    const context = findNativeOrderFormContext();
    const id = context?.orderForm?.orderFormId ?? context?.orderForm?.id;
    return isValidOrderFormId(id) ? id : null;
  } catch {
    return null;
  }
}

export function getOrderFormIdFromStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem('orderform') || '{}');
    const id = stored.orderFormId ?? stored.id;
    return isValidOrderFormId(id) ? id : null;
  } catch {
    return null;
  }
}

export function getReliableOrderFormId() {
  return (
    getOrderFormIdFromApollo() ||
    getOrderFormIdFromContext() ||
    getOrderFormIdFromStorage() ||
    null
  );
}

export async function getStableOrderFormId({
  timeoutMs = 8000,
  stabilityWindowMs = 600,
  pollIntervalMs = 100,
} = {}) {
  const start = Date.now();
  let lastId = null;
  let lastChangeAt = Date.now();

  while (Date.now() - start < timeoutMs) {
    const currentId = getOrderFormIdFromApollo() || getOrderFormIdFromContext();

    if (currentId && currentId !== lastId) {
      lastId = currentId;
      lastChangeAt = Date.now();
    }

    if (lastId && Date.now() - lastChangeAt >= stabilityWindowMs) {
      return lastId;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  if (lastId) return lastId;

  const fallback = getOrderFormIdFromStorage();
  if (fallback) return fallback;

  throw new Error('[Minicart] Could not resolve a stable orderFormId');
}

// ─── Minicart refresh ─────────────────────────────────────────────────────

async function fetchLatestOrderForm() {
  const response = await fetch(ORDER_FORM_REFRESH_URL, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function mergePreservingImages(previousOrderForm, freshOrderForm) {
  const prevItemsMap = Object.fromEntries(
    (previousOrderForm?.items ?? []).map((item) => [item.id, item]),
  );
  return {
    ...freshOrderForm,
    items: freshOrderForm.items.map((item) => {
      const prevItem = prevItemsMap[item.id];
      const mockImageUrls = {
        at1x: item.imageUrl,
        at2x: item.imageUrl,
        at3x: item.imageUrl,
        __typename: 'ImageUrls',
      };
      return {
        ...item,
        imageUrls: prevItem?.imageUrls ?? mockImageUrls,
        imageUrl: prevItem?.imageUrl ?? item.imageUrl,
      };
    }),
  };
}

export async function updateVTEXIOMinicart(freshOrderForm) {
  try {
    const context = findNativeOrderFormContext();
    if (!context?.setOrderForm) {
      console.warn('[Minicart] OrderFormContext not found in fiber tree');
      return null;
    }

    const resolvedOrderForm = freshOrderForm ?? (await fetchLatestOrderForm());
    const mergedOrderForm = mergePreservingImages(
      context.orderForm,
      resolvedOrderForm,
    );

    context.setOrderForm(mergedOrderForm);
    return mergedOrderForm;
  } catch (err) {
    console.error('[Minicart] Failed to update:', err);
    return null;
  }
}

function setupMinicartBridge() {
  if (typeof window === 'undefined') return;
  window.updateMinicart = updateVTEXIOMinicart;
  window.findNativeOrderFormContext = findNativeOrderFormContext;
  window.getReliableOrderFormId = getReliableOrderFormId;
  window.getStableOrderFormId = getStableOrderFormId;
  window.getOrderFormIdFromApollo = getOrderFormIdFromApollo;
}

setupMinicartBridge();
