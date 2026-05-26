import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
} from 'react';
import PropTypes from 'prop-types';

import {
  updateVTEXIOMinicart,
  getReliableOrderFormId,
} from '@/utils/VTEXIOMinicartBridge';
import { bootstrapOrderFormId } from '@/utils/faststoreBootstrap';

const OrderFormContext = createContext(null);

export function OrderFormProvider({ children }) {
  const [isLoadingOrderForm, setIsLoadingOrderForm] = useState(false);
  const [orderFormId, setOrderFormId] = useState(null);
  const fetchStartedRef = useRef(false);
  const bootstrapPromiseRef = useRef(null);

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

  const value = {
    orderFormId,
    isLoadingOrderForm,
    requestOrderForm,
    trySyncHostCart,
    bootstrapFastStoreOrderForm,
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
