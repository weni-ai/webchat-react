import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
} from 'react';

const OrderFormContext = createContext(null);

export function OrderFormProvider({ children }) {
  const [isLoadingOrderForm, setIsLoadingOrderForm] = useState(false);
  const [orderFormId, setOrderFormId] = useState(null);
  const fetchStartedRef = useRef(false);

  const requestOrderForm = useCallback(() => {
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;
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

  const addOrderFormItem = useCallback(
    (skuId, sellerId, quantity = 1) => {
      if (!orderFormId) {
        return Promise.reject(new Error('No orderFormId'));
      }
      return fetch(
        `/api/checkout/pub/orderForm/${orderFormId}/items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            orderItems: [
              {
                id: skuId,
                quantity,
                seller: sellerId,
              },
            ],
          }),
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error('Add item failed');
          return res.json();
        });
    },
    [orderFormId]
  );

  const value = {
    orderFormId,
    isLoadingOrderForm,
    requestOrderForm,
    addOrderFormItem,
  };

  return (
    <OrderFormContext.Provider value={value}>
      {children}
    </OrderFormContext.Provider>
  );
}

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
    addOrderFormItem:
      context?.addOrderFormItem ??
      (() => Promise.reject(new Error('Outside OrderFormProvider'))),
  };
}
