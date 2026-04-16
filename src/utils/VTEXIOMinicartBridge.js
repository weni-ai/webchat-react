/**
 * VTEX IO storefront: refreshes checkout orderForm in React minicart state
 * by locating OrderFormProvider via the React fiber tree.
 */

const ORDER_FORM_REFRESH_URL =
  '/api/checkout/pub/orderForm?allowedOutdatedData=false';

const MAX_FIBER_WALK_DEPTH = 200;
const COUNTER_HOOK_LOOKAHEAD = 3;
const REACT_FIBER_KEY_PREFIX = '__reactFiber';

function getMinicartRootElement() {
  return document.querySelector('[class*="minicart"]');
}

function getReactFiberKey(hostNode) {
  return Object.keys(hostNode).find((key) =>
    key.startsWith(REACT_FIBER_KEY_PREFIX),
  );
}

function getComponentDisplayName(fiber) {
  return fiber.type?.name || fiber.type?.displayName || '';
}

function looksLikeOrderFormProvider(typeName) {
  return typeName === 'OrderFormProvider' || typeName.includes('OrderForm');
}

function isOrderFormHookState(state) {
  return (
    state != null && typeof state === 'object' && Array.isArray(state.items)
  );
}

/** Walks the hook chain on one fiber; returns the index of the hook whose state has `items[]`. */
function findOrderFormHookIndexOnFiber(fiber) {
  let hook = fiber.memoizedState;
  let index = 0;

  while (hook) {
    if (isOrderFormHookState(hook.memoizedState)) {
      return index;
    }
    hook = hook.next;
    index += 1;
  }

  return null;
}

/**
 * Starting from the minicart DOM node’s React fiber, walks `return` until it finds
 * an OrderForm-related component whose hooks include orderForm-shaped state.
 */
function findOrderFormFiberAndHookIndex() {
  const root = getMinicartRootElement();
  if (!root) return null;

  const fiberKey = getReactFiberKey(root);
  if (!fiberKey) return null;

  let fiber = root[fiberKey];

  for (let depth = 0; depth < MAX_FIBER_WALK_DEPTH && fiber; depth += 1) {
    if (looksLikeOrderFormProvider(getComponentDisplayName(fiber))) {
      const orderFormHookIndex = findOrderFormHookIndexOnFiber(fiber);
      if (orderFormHookIndex != null) {
        return { fiber, orderFormHookIndex };
      }
    }
    fiber = fiber.return;
  }

  return null;
}

function getHookAtIndex(fiber, index) {
  let hook = fiber.memoizedState;
  for (let i = 0; i < index; i += 1) {
    if (!hook) return null;
    hook = hook.next;
  }
  return hook;
}

function dispatchOrderFormToHook(fiber, orderFormHookIndex, orderForm) {
  const hook = getHookAtIndex(fiber, orderFormHookIndex);
  if (hook?.queue?.dispatch) {
    hook.queue.dispatch(orderForm);
  }
}

/** The hook after orderForm is often item count; try a few adjacent hooks. */
function dispatchItemCountToNumericStateHooks(
  fiber,
  orderFormHookIndex,
  itemCount,
) {
  for (let offset = 1; offset <= COUNTER_HOOK_LOOKAHEAD; offset += 1) {
    const hook = getHookAtIndex(fiber, orderFormHookIndex + offset);
    if (hook?.queue?.dispatch && typeof hook.memoizedState === 'number') {
      hook.queue.dispatch(itemCount);
    }
  }
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

export async function updateVTEXIOMinicart() {
  try {
    const orderForm = await fetchLatestOrderForm();
    const target = findOrderFormFiberAndHookIndex();

    if (!target) {
      console.warn('[Minicart] OrderFormProvider not found');
      return null;
    }

    const { fiber, orderFormHookIndex } = target;

    dispatchOrderFormToHook(fiber, orderFormHookIndex, orderForm);
    dispatchItemCountToNumericStateHooks(
      fiber,
      orderFormHookIndex,
      orderForm.items.length,
    );

    console.log('[Minicart] Updated —', orderForm.items.length, 'item(s)');
    return orderForm;
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
