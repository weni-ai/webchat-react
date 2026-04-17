/**
 * VTEX IO storefront: refreshes checkout orderForm by fetching the latest state,
 * preserving existing UI images, and locating the native Context via React Fiber.
 */

const ORDER_FORM_REFRESH_URL =
  '/api/checkout/pub/orderForm?allowedOutdatedData=false';
const MAX_FIBER_WALK_DEPTH = 200;
const REACT_FIBER_KEY_PREFIX = '__reactFiber';

function getStoreRootElement() {
  return (
    document.querySelector('[class*="vtex-minicart-2"]') ||
    document.querySelector('.render-container') ||
    document.querySelector('#render-store-div')
  );
}

function getReactFiberKey(hostNode) {
  return Object.keys(hostNode).find((key) =>
    key.startsWith(REACT_FIBER_KEY_PREFIX),
  );
}

/**
 * Helper to check if an object is the OrderFormContext
 */
function isOrderFormContext(obj) {
  return (
    obj != null &&
    typeof obj === 'object' &&
    typeof obj.setOrderForm === 'function'
  );
}

/**
 * Inspects a single Fiber node to see if it holds the OrderFormContext
 */
function extractOrderFormContextFromFiber(fiber) {
  if (!fiber) return null;

  if (isOrderFormContext(fiber.memoizedProps?.value)) {
    return fiber.memoizedProps.value;
  }

  let hook = fiber.memoizedState;
  while (hook) {
    if (isOrderFormContext(hook.memoizedState)) {
      return hook.memoizedState;
    }
    hook = hook.next;
  }

  if (fiber.dependencies && fiber.dependencies.firstContext) {
    let contextNode = fiber.dependencies.firstContext;
    while (contextNode) {
      if (isOrderFormContext(contextNode.memoizedValue)) {
        return contextNode.memoizedValue;
      }
      contextNode = contextNode.next;
    }
  }

  return null;
}

/**
 * Walks up the React Fiber tree to find the full OrderForm context object.
 */
function findNativeOrderFormContext() {
  const root = getStoreRootElement();
  if (!root) return null;

  const fiberKey = getReactFiberKey(root);
  if (!fiberKey) return null;

  let fiber = root[fiberKey];

  for (let depth = 0; depth < MAX_FIBER_WALK_DEPTH && fiber; depth += 1) {
    const contextObj = extractOrderFormContextFromFiber(fiber);
    if (contextObj) {
      return contextObj;
    }
    fiber = fiber.return;
  }

  return null;
}

async function fetchLatestOrderForm() {
  const response = await fetch(ORDER_FORM_REFRESH_URL, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Preserves images from the frontend state
 */
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

export async function updateVTEXIOMinicart() {
  try {
    const context = findNativeOrderFormContext();

    if (!context || !context.setOrderForm) {
      console.warn(
        '[Minicart] Native OrderForm Context not found in Fiber tree.',
      );
      return null;
    }

    console.log('[Minicart] Fetching latest cart state from API...');
    const freshOrderForm = await fetchLatestOrderForm();

    console.log('[Minicart] Merging data to preserve catalog images...');

    const mergedOrderForm = mergePreservingImages(
      context.orderForm,
      freshOrderForm,
    );

    console.log(
      '[Minicart] Injecting updated orderForm via native setOrderForm...',
    );
    context.setOrderForm(mergedOrderForm);

    console.log(
      '[Minicart] Cart updated successfully —',
      mergedOrderForm.items.length,
      'item(s)',
    );
    return mergedOrderForm;
  } catch (err) {
    console.error('[Minicart] Failed to update:', err);
    return null;
  }
}

function setupMinicartBridge() {
  if (typeof window === 'undefined') return;
  window.updateMinicart = updateVTEXIOMinicart;
  console.log(
    '[MinicartBridge] Ready. Call window.updateMinicart() after cart changes.',
  );
}

setupMinicartBridge();
