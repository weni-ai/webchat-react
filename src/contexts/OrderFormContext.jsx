import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';

import ChatContext from '@/contexts/ChatContext';

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

function quantityOf(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

export function OrderFormProvider({ children }) {
  const [isLoadingOrderForm, setIsLoadingOrderForm] = useState(false);
  const [orderFormId, setOrderFormId] = useState(null);
  const [pendingCartItems, setPendingCartItems] = useState({});
  const fetchStartedRef = useRef(false);
  const pendingCartItemsRef = useRef(pendingCartItems);
  const inflightRef = useRef(new Set());
  const prevPageRef = useRef(undefined);

  const chat = useContext(ChatContext);
  const currentPage = chat?.currentPage ?? null;
  const pageHistory = chat?.pageHistory ?? [];
  const service = chat?.service;

  pendingCartItemsRef.current = pendingCartItems;

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

  const rememberItem = useCallback((key, item) => {
    setPendingCartItems((prev) => ({ ...prev, [key]: item }));
  }, []);

  const setPendingCartItem = useCallback(
    ({ key, skuId, sellerId, quantity = 1, productName, image }) => {
      if (!key || !skuId || !sellerId) return;
      if (inflightRef.current.has(key)) return;

      const existing = pendingCartItemsRef.current[key];
      const origin =
        existing?.origin ?? resolvePendingOrigin(currentPage, pageHistory);
      const nextQuantity = quantityOf(quantity);
      const committedQuantity = existing?.committedQuantity ?? 0;

      rememberItem(key, {
        skuId,
        sellerId,
        quantity: nextQuantity,
        productName,
        ...(image ? { image } : {}),
        origin,
        committedQuantity,
      });

      service?.setPendingCartItem?.(key, nextQuantity, origin, skuId, sellerId);
    },
    [currentPage, pageHistory, rememberItem, service],
  );

  const updatePendingCartQuantity = useCallback(
    (key, quantity) => {
      if (inflightRef.current.has(key)) return;
      const existing = pendingCartItemsRef.current[key];
      if (!existing) return;
      const nextQuantity = quantityOf(quantity);
      rememberItem(key, { ...existing, quantity: nextQuantity });
      service?.setPendingCartItem?.(
        key,
        nextQuantity,
        existing.origin,
        existing.skuId,
        existing.sellerId,
      );
    },
    [rememberItem, service],
  );

  const flushPendingCart = useCallback(
    (keys) => {
      const selected = keys ?? Object.keys(pendingCartItemsRef.current);
      selected.forEach((key) => inflightRef.current.add(key));
      return service?.flushPendingCart?.(selected) ?? Promise.resolve();
    },
    [service],
  );

  const removePendingCartItem = useCallback((key) => {
    inflightRef.current.delete(key);
    setPendingCartItems((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearPendingCartItems = useCallback(() => {
    inflightRef.current.clear();
    setPendingCartItems({});
  }, []);

  useEffect(() => {
    const prev = prevPageRef.current;
    prevPageRef.current = currentPage;

    if (prev != null && currentPage == null) {
      const catalogKeys = Object.entries(pendingCartItemsRef.current)
        .filter(([, item]) => item.origin === 'catalog')
        .map(([key]) => key);
      if (catalogKeys.length) {
        void flushPendingCart(catalogKeys);
      }
    }
  }, [currentPage, flushPendingCart]);

  useEffect(() => {
    if (!service?.on) return undefined;

    const onUpdated = ({ key, quantity } = {}) => {
      inflightRef.current.delete(key);
      setPendingCartItems((prev) => {
        const item = prev[key];
        if (!item) return prev;
        return {
          ...prev,
          [key]: {
            ...item,
            quantity: quantityOf(quantity),
            committedQuantity: quantityOf(quantity),
          },
        };
      });
    };

    const onFailed = ({ key } = {}) => {
      inflightRef.current.delete(key);
      setPendingCartItems((prev) => {
        const item = prev[key];
        if (!item) return prev;
        const restored = item.committedQuantity ?? 0;
        if (!restored) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: { ...item, quantity: restored } };
      });
    };

    service.on('cart:updated', onUpdated);
    service.on('cart:failed', onFailed);
    return () => {
      service.off?.('cart:updated', onUpdated);
      service.off?.('cart:failed', onFailed);
    };
  }, [service]);

  const value = {
    orderFormId,
    isLoadingOrderForm,
    requestOrderForm,
    pendingCartItems,
    setPendingCartItem,
    updatePendingCartQuantity,
    removePendingCartItem,
    clearPendingCartItems,
    flushPendingCart,
    sendProductsToCart: flushPendingCart,
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
    pendingCartItems: context?.pendingCartItems ?? {},
    setPendingCartItem: context?.setPendingCartItem ?? (() => {}),
    updatePendingCartQuantity: context?.updatePendingCartQuantity ?? (() => {}),
    removePendingCartItem: context?.removePendingCartItem ?? (() => {}),
    clearPendingCartItems: context?.clearPendingCartItems ?? (() => {}),
    flushPendingCart: context?.flushPendingCart ?? (() => Promise.resolve()),
    sendProductsToCart:
      context?.sendProductsToCart ?? (() => Promise.resolve()),
  };
}

function getLocalOrderFormId() {
  try {
    return window.faststore_sdk_stores?.get?.('fs::cart')?.read?.()?.id ?? null;
  } catch {
    return null;
  }
}
