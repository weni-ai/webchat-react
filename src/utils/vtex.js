const INTERNAL_PROPERTIES = new Set([
  'sellerId',
  'commercialConditionId',
  'cluster_highlights',
  'allSpecifications',
  'allSpecificationsGroups',
]);

export function isVtexPdpPage() {
  return /\/[^/]+\/p\/?$/.test(window.location.pathname);
}

export function extractSlugFromUrl() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const pIndex = segments.indexOf('p');
  if (pIndex < 1) return null;
  return segments[pIndex - 1];
}

export function getVtexAccount() {
  return window.__RUNTIME__?.account
    || window.location.hostname.split('.')[0];
}

export async function fetchProductData(slug) {
  try {
    const url = `/api/io/_v/api/intelligent-search/product_search/${slug}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function selectProduct(products, slug) {
  if (!products?.length) return null;
  return products.find((p) => p.linkText === slug) || products[0];
}

export function filterInternalProperties(properties) {
  return properties.reduce((acc, { name, values }) => {
    if (!INTERNAL_PROPERTIES.has(name)) {
      acc[name] = values.join(', ');
    }
    return acc;
  }, {});
}

export function extractProductData(product, account) {
  return {
    account,
    linkText: product.linkText,
    productName: product.productName,
    description: product.description,
    brand: product.brand,
    attributes: filterInternalProperties(product.properties || []),
  };
}

export function getSelectedSku(product) {
  const items = product?.items;
  if (!items?.length) return null;

  const skuId = new URLSearchParams(window.location.search).get('skuId');
  if (skuId) {
    const match = items.find((item) => item.itemId === skuId);
    if (match) return match;
  }

  const runtimeSlug = window.__RUNTIME__?.route?.params?.slug;
  if (runtimeSlug) {
    const match = items.find(
      (item) => item.name?.toLowerCase() === runtimeSlug.toLowerCase(),
    );
    if (match) return match;
  }

  return items[0];
}

export function buildSkuContextString(product, sku) {
  const offer = sku?.sellers?.[0]?.commertialOffer;
  const price = offer?.Price ?? 'N/A';
  const listPrice = offer?.ListPrice ?? 'N/A';
  const available = offer?.AvailableQuantity > 0 ? 'In stock' : 'Out of stock';
  const image = sku?.images?.[0]?.imageUrl || 'N/A';
  const variant = sku?.nameComplete || sku?.name || 'N/A';

  const lines = [
    `Product: ${product?.productName || 'N/A'}`,
    `Brand: ${product?.brand || 'N/A'}`,
    `Selected variant: ${variant}`,
    `Price: ${price}`,
    `List price: ${listPrice}`,
    `Availability: ${available}`,
    `Image: ${image}`,
  ];

  const variations = sku?.variations;
  if (variations?.length) {
    const parts = variations.map(
      (v) => `${v.name}: ${v.values?.join(', ') || 'N/A'}`,
    );
    lines.push(`Variations: ${parts.join(' | ')}`);
  }

  return lines.join('\n');
}
