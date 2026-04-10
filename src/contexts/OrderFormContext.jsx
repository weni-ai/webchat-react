import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
} from 'react';
import PropTypes from 'prop-types';

const OrderFormContext = createContext(null);

export function OrderFormProvider({ children }) {
  const [isLoadingOrderForm, setIsLoadingOrderForm] = useState(false);
  const [orderFormId, setOrderFormId] = useState(null);
  const fetchStartedRef = useRef(false);

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

  const value = {
    orderFormId,
    isLoadingOrderForm,
    requestOrderForm,
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
    requestOrderForm: context?.requestOrderForm ?? (() => { }),
  };
}

function getLocalOrderFormId() {
  const fastStoreOrderFormId = window.faststore_sdk_stores?.get('fs::cart').read().id;

  if (fastStoreOrderFormId) {
    return fastStoreOrderFormId;
  }

  try {
    const VTEXIOOrderFormId = localStorage.getItem('orderform') && JSON.parse(localStorage.getItem('orderform')).id;

    if (VTEXIOOrderFormId) {
      return VTEXIOOrderFormId;
    }
  } catch {
    // continue
  }

  return null;
}
