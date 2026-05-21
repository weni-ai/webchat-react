export function minimalSeed(sku, sellerId = '1') {
  const skuStr = String(sku);
  const sellerStr = String(sellerId);
  return {
    id: `${skuStr}::${sellerStr}::`,
    quantity: 1,
    price: 0,
    listPrice: 0,
    seller: { identifier: sellerStr },
    itemOffered: {
      sku: skuStr,
      name: '',
      gtin: '',
      image: [],
      brand: { name: '' },
      isVariantOf: {
        productGroupID: skuStr,
        name: '',
        mainVariation: { name: '' },
      },
      additionalProperty: [],
    },
  };
}

export function bootstrapOrderFormId({ skuId, sellerId, timeoutMs = 10_000 }) {
  return new Promise((resolve, reject) => {
    const cart = window.faststore_sdk_stores?.get?.('fs::cart');
    if (
      !cart ||
      typeof cart.read !== 'function' ||
      typeof cart.set !== 'function' ||
      typeof cart.subscribe !== 'function'
    ) {
      reject(new Error('faststore sdk unavailable'));
      return;
    }

    const current = cart.read();
    if (current?.id) {
      resolve(current.id);
      return;
    }

    const itemsBefore = current?.items || [];

    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error('orderFormId timeout'));
    }, timeoutMs);

    const unsubscribe = cart.subscribe((value) => {
      if (!value?.id) return;
      clearTimeout(timer);
      unsubscribe();
      try {
        cart.set({ ...cart.read(), items: itemsBefore });
      } catch {
        // cleanup failure should not block resolution
      }
      resolve(value.id);
    });

    try {
      cart.set({
        ...current,
        items: [
          ...itemsBefore,
          { ...minimalSeed(skuId, sellerId), quantity: 1 },
        ],
      });
    } catch (error) {
      clearTimeout(timer);
      unsubscribe();
      reject(error);
    }
  });
}
