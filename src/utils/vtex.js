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

function formatSkuLine(item) {
  const offer = item.sellers?.[0]?.commertialOffer;
  const price = offer?.Price ?? 'N/A';
  const available = offer?.AvailableQuantity > 0 ? 'Available' : 'Unavailable';
  const name = item.nameComplete || item.name || 'N/A';
  const skuId = item.itemId || 'N/A';

  const variationParts = (item.variations || []).map(
    (v) => `${v.name}: ${v.values?.join(', ') || 'N/A'}`,
  );
  const variationsStr = variationParts.length > 0
    ? ` (${variationParts.join(', ')})`
    : '';

  return `- SKU ${skuId}: ${name}${variationsStr} | Price: ${price} | ${available}`;
}

export function buildProductContextString(product) {
  if (!product) return null;

  const description = product.description || '';
  const attributes = filterInternalProperties(product.properties || []);

  const lines = [
    `Product: ${product.productName || 'N/A'}`,
    `Brand: ${product.brand || 'N/A'}`,
    `Product ID: ${product.productId || 'N/A'}`,
  ];

  if (description) {
    const trimmed = description.length > 300
      ? description.slice(0, 300) + '...'
      : description;
    lines.push(`Description: ${trimmed}`);
  }

  const attributeEntries = Object.entries(attributes);
  if (attributeEntries.length > 0) {
    const parts = attributeEntries.map(([key, val]) => `${key}: ${val}`);
    lines.push(`Attributes: ${parts.join(' | ')}`);
  }

  const items = product.items || [];
  if (items.length > 0) {
    lines.push(`\nAvailable SKUs (${items.length}):`);
    items.forEach((item) => {
      lines.push(formatSkuLine(item));
    });
  }

  return lines.join('\n');
}
