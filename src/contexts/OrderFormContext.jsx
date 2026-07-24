import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ChatContext from '@/contexts/ChatContext';
import {
  updateVTEXIOMinicart,
  getReliableOrderFormId,
} from '@/utils/VTEXIOMinicartBridge';
import { bootstrapOrderFormId } from '@/utils/faststoreBootstrap';
import { getVtexAccount, isFastStoreHost } from '@/utils/vtex';
import { UTM_SOURCES } from '@/utils/sendVtexUtm';
import { createThrottledCustomFieldSetter } from '@/utils/throttleCustomField';

const OrderFormContext = createContext(null);

export const PENDING_CART_DEBOUNCE_MS = 5000;

function resolvePendingOrigin(currentPage, pageHistory = []) {
  if (currentPage?.view === 'product-catalog') {
    return 'catalog';
  }
  if (
    currentPage?.view === 'product-details' &&
    pageHistory.some((page) => page.view === 'product-catalog')
  ) {
    return 'catalog';
  }
  return 'conversation';
}

export function OrderFormProvider({ children }) {
  const [isLoadingOrderForm, setIsLoadingOrderForm] = useState(false);
  const [orderFormId, setOrderFormId] = useState(null);
  const [pendingCartItems, setPendingCartItems] = useState({});
  const fetchStartedRef = useRef(false);
  const bootstrapPromiseRef = useRef(null);
  const debounceTimersRef = useRef({});
  const pendingCartItemsRef = useRef(pendingCartItems);
  const orderFormIdRef = useRef(orderFormId);
  const prevPageRef = useRef(undefined);
  const { t } = useTranslation();

  const chat = useContext(ChatContext);
  const currentPage = chat?.currentPage ?? null;
  const pageHistory = chat?.pageHistory ?? [];

  pendingCartItemsRef.current = pendingCartItems;
  orderFormIdRef.current = orderFormId;

  const setOrderFormCustomFieldThrottled = useMemo(
    () =>
      createThrottledCustomFieldSetter(
        chat?.setCustomField ?? (() => {}),
        10_000,
      ),
    [chat?.setCustomField],
  );

  const requestOrderForm = useCallback(() => {
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;

    const localOrderFormId = getLocalOrderFormId();

    if (localOrderFormId) {
      setOrderFormId(localOrderFormId);
      return;
    }

    setIsLoadingOrderForm(true);

    fetch('/api/checkout/pub/orderForm')
      .then((res) => {
        if (!res.ok) throw new Error('Order form fetch failed');
        return res.json();
      })
      .then((data) => {
        if (data?.orderFormId != null) {
          setOrderFormId(data.orderFormId);
        }
      })
      .catch(() => {
        // On failure: do not save, do not retry
      })
      .finally(() => {
        setIsLoadingOrderForm(false);
      });
  }, []);

  const bootstrapFastStoreOrderForm = useCallback(
    ({ skuId, sellerId } = {}) => {
      if (orderFormId) return Promise.resolve(orderFormId);
      if (bootstrapPromiseRef.current) return bootstrapPromiseRef.current;

      const promise = bootstrapOrderFormId({ skuId, sellerId })
        .then((id) => {
          setOrderFormId(id);
          bootstrapPromiseRef.current = null;
          return id;
        })
        .catch((error) => {
          bootstrapPromiseRef.current = null;
          throw error;
        });

      bootstrapPromiseRef.current = promise;
      return promise;
    },
    [orderFormId],
  );

  const trySyncHostCart = useCallback(async () => {
    let syncedWithFaststore = false;
    try {
      const cart = window.faststore_sdk_stores?.get?.('fs::cart');
      if (cart?.set && cart?.read) {
        cart.set(cart.read());
        syncedWithFaststore = true;
      }
    } catch {
      // FastStore SDK unavailable or read/set failed — try VTEX IO
    }

    if (syncedWithFaststore) return;

    try {
      await updateVTEXIOMinicart();
    } catch {
      // VTEX IO minicart bridge unavailable or failed — ignore
    }
  }, []);

  const clearDebounceTimer = useCallback((key) => {
    const timer = debounceTimersRef.current[key];
    if (timer) {
      clearTimeout(timer);
      delete debounceTimersRef.current[key];
    }
  }, []);

  const clearAllDebounceTimers = useCallback(() => {
    Object.keys(debounceTimersRef.current).forEach((key) => {
      clearTimeout(debounceTimersRef.current[key]);
    });
    debounceTimersRef.current = {};
  }, []);

  const removePendingCartItem = useCallback(
    (key) => {
      clearDebounceTimer(key);
      setPendingCartItems((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [clearDebounceTimer],
  );

  const clearPendingCartItems = useCallback(() => {
    clearAllDebounceTimers();
    setPendingCartItems({});
  }, [clearAllDebounceTimers]);

  const sendProductsToCart = useCallback(
    async (keys) => {
      const addProductToCart = chat?.addProductToCart;
      if (!addProductToCart) return;

      const items = pendingCartItemsRef.current;
      const keysToSend = keys ?? Object.keys(items);
      const toProcess = keysToSend
        .map((key) => ({ key, item: items[key] }))
        .filter(({ item }) => item);

      if (!toProcess.length) return;

      toProcess.forEach(({ key }) => clearDebounceTimer(key));

      // Reset UI immediately — clear pending store as if quantities were zeroed
      setPendingCartItems((prev) => {
        const next = { ...prev };
        toProcess.forEach(({ key }) => {
          delete next[key];
        });
        return next;
      });

      const positives = toProcess.filter(({ item }) => item.quantity > 0);
      if (!positives.length) return;

      const isFastStore = isFastStoreHost();
      const addedItems = [];

      for (const { item } of positives) {
        try {
          let effectiveOrderFormId = orderFormIdRef.current;

          if (!effectiveOrderFormId && isFastStore) {
            effectiveOrderFormId = await bootstrapFastStoreOrderForm({
              skuId: item.skuId,
              sellerId: item.sellerId,
            });
          }

          if (!effectiveOrderFormId) {
            continue;
          }

          setOrderFormCustomFieldThrottled('orderform', effectiveOrderFormId);

          await addProductToCart({
            VTEXAccountName: getVtexAccount(),
            orderFormId: effectiveOrderFormId,
            seller: item.sellerId,
            id: item.skuId,
            quantity: item.quantity,
          });

          void chat?.sendUtm?.(UTM_SOURCES.CART);

          addedItems.push(item);
        } catch (error) {
          console.error('Failed to add pending product to cart', error);
        }
      }

      if (!addedItems.length) return;

      const totalQuantity = addedItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      if (totalQuantity === 1 && addedItems.length === 1) {
        chat?.addConversationStatus?.(
          t('cart.product_added_to_cart', {
            productName: addedItems[0].productName ?? '',
          }),
          'success',
        );
      } else if (totalQuantity > 0) {
        chat?.addConversationStatus?.(
          t('messages_list.items_added_to_cart', { count: totalQuantity }),
          'success',
        );
      }

      void trySyncHostCart();
    },
    [
      chat,
      clearDebounceTimer,
      bootstrapFastStoreOrderForm,
      setOrderFormCustomFieldThrottled,
      trySyncHostCart,
      t,
    ],
  );

  const scheduleConversationDebounce = useCallback(
    (key) => {
      clearDebounceTimer(key);
      debounceTimersRef.current[key] = setTimeout(() => {
        delete debounceTimersRef.current[key];
        void sendProductsToCart([key]);
      }, PENDING_CART_DEBOUNCE_MS);
    },
    [clearDebounceTimer, sendProductsToCart],
  );

  const setPendingCartItem = useCallback(
    ({ key, skuId, sellerId, quantity = 1, productName }) => {
      if (!key || !skuId || !sellerId) return;

      const origin =
        pendingCartItemsRef.current[key]?.origin ??
        resolvePendingOrigin(currentPage, pageHistory);
      const nextQuantity = Math.max(0, Number(quantity) || 0);

      setPendingCartItems((prev) => ({
        ...prev,
        [key]: {
          skuId,
          sellerId,
          quantity: nextQuantity,
          productName,
          origin,
        },
      }));

      if (origin === 'conversation') {
        scheduleConversationDebounce(key);
      }
    },
    [currentPage, pageHistory, scheduleConversationDebounce],
  );

  const updatePendingCartQuantity = useCallback(
    (key, quantity) => {
      const nextQuantity = Math.max(0, Number(quantity) || 0);
      const existing = pendingCartItemsRef.current[key];
      if (!existing) return;

      setPendingCartItems((prev) => {
        if (!prev[key]) return prev;
        return {
          ...prev,
          [key]: { ...prev[key], quantity: nextQuantity },
        };
      });

      if (existing.origin === 'conversation') {
        scheduleConversationDebounce(key);
      }
    },
    [scheduleConversationDebounce],
  );

  // Flush catalog-origin pendings when returning to the conversation
  useEffect(() => {
    const prev = prevPageRef.current;
    prevPageRef.current = currentPage;

    if (prev != null && currentPage == null) {
      const catalogKeys = Object.entries(pendingCartItemsRef.current)
        .filter(([, item]) => item.origin === 'catalog')
        .map(([key]) => key);
      if (catalogKeys.length) {
        void sendProductsToCart(catalogKeys);
      }
    }
  }, [currentPage, sendProductsToCart]);

  useEffect(() => {
    return () => {
      clearAllDebounceTimers();
    };
  }, [clearAllDebounceTimers]);

  const value = {
    orderFormId,
    isLoadingOrderForm,
    requestOrderForm,
    trySyncHostCart,
    bootstrapFastStoreOrderForm,
    pendingCartItems,
    setPendingCartItem,
    updatePendingCartQuantity,
    removePendingCartItem,
    clearPendingCartItems,
    sendProductsToCart,
  };

  return (
    <OrderFormContext.Provider value={value}>
      {children}
    </OrderFormContext.Provider>
  );
}

OrderFormProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useOrderFormId() {
  const context = useContext(OrderFormContext);
  return context?.orderFormId ?? null;
}

export function useIsLoadingOrderForm() {
  const context = useContext(OrderFormContext);
  return context?.isLoadingOrderForm ?? false;
}

export function useOrderForm() {
  const context = useContext(OrderFormContext);
  return {
    orderFormId: context?.orderFormId ?? null,
    isLoadingOrderForm: context?.isLoadingOrderForm ?? false,
    requestOrderForm: context?.requestOrderForm ?? (() => {}),
    trySyncHostCart: context?.trySyncHostCart ?? (() => {}),
    bootstrapFastStoreOrderForm:
      context?.bootstrapFastStoreOrderForm ??
      (() => Promise.reject(new Error('OrderFormProvider missing'))),
    pendingCartItems: context?.pendingCartItems ?? {},
    setPendingCartItem: context?.setPendingCartItem ?? (() => {}),
    updatePendingCartQuantity: context?.updatePendingCartQuantity ?? (() => {}),
    removePendingCartItem: context?.removePendingCartItem ?? (() => {}),
    clearPendingCartItems: context?.clearPendingCartItems ?? (() => {}),
    sendProductsToCart:
      context?.sendProductsToCart ?? (() => Promise.resolve()),
  };
}

function getLocalOrderFormId() {
  const fastStoreOrderFormId = window.faststore_sdk_stores
    ?.get('fs::cart')
    .read().id;

  if (fastStoreOrderFormId) {
    return fastStoreOrderFormId;
  }

  try {
    const vtexIOOrderFormId = getReliableOrderFormId();
    if (vtexIOOrderFormId) return vtexIOOrderFormId;
  } catch {
    // bridge unavailable or threw — fall through
  }

  return null;
}
