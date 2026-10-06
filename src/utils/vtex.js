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

export function isCheckoutPage() {
  return window.location.pathname.includes('/checkout/');
}

export function extractSlugFromUrl() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const pIndex = segments.indexOf('p');
  if (pIndex < 1) return null;
  return segments[pIndex - 1];
}

export function extractProductPathFromUrl() {
  return window.location.pathname;
}

const FAST_STORE_ACCOUNT_TIMEOUT_MS = 60_000;
const FAST_STORE_ACCOUNT_INTERVAL_MS = 5000;
const FAST_STORE_STARTER_ACCOUNT = 'storeframework';
const FAST_STORE_STORE_ID_PATTERN = /api:\{storeId:"([a-z0-9-]+)"/g;
const VTEX_ASSETS_ACCOUNT_PATTERN =
  /^https?:\/\/([a-z0-9-]+)\.vtexassets\.com\/?$/i;

let cachedFastStoreAccount;
let webpackRequire;
let fastStoreProbeInstalled = false;
const seenFastStoreModuleIds = new Set();
const foundFastStoreAccountIds = new Set();

function ensureWebpackRequire() {
  if (webpackRequire) return webpackRequire;

  const chunks = window.webpackChunk_N_E;
  if (!chunks || typeof chunks.push !== 'function' || fastStoreProbeInstalled) {
    return webpackRequire;
  }

  fastStoreProbeInstalled = true;
  try {
    chunks.push([
      ['weni-vtex-account'],
      {},
      (require) => {
        webpackRequire = require;
      },
    ]);
  } catch {
    fastStoreProbeInstalled = false;
  }

  return webpackRequire;
}

function readAccountFromAssetLinks() {
  try {
    const accounts = new Set();
    const links = document.querySelectorAll(
      'link[rel="preconnect"], link[rel="dns-prefetch"]',
    );

    for (const link of links) {
      try {
        const href = link.getAttribute('href') || '';
        const match = String(href).match(VTEX_ASSETS_ACCOUNT_PATTERN);
        if (match) accounts.add(match[1].toLowerCase());
      } catch {
        continue;
      }
    }

    if (accounts.size !== 1) return undefined;
    return [...accounts][0];
  } catch {
    return undefined;
  }
}

function collectStoreIds(source) {
  FAST_STORE_STORE_ID_PATTERN.lastIndex = 0;
  let match = FAST_STORE_STORE_ID_PATTERN.exec(source);
  while (match) {
    foundFastStoreAccountIds.add(match[1]);
    match = FAST_STORE_STORE_ID_PATTERN.exec(source);
  }
}

function readFastStoreAccount() {
  try {
    if (cachedFastStoreAccount) return cachedFastStoreAccount;

    const req = ensureWebpackRequire();
    if (req?.m) {
      for (const id of Object.keys(req.m)) {
        if (seenFastStoreModuleIds.has(id)) continue;

        let source;
        try {
          source = Function.prototype.toString.call(req.m[id]);
        } catch {
          continue;
        }

        seenFastStoreModuleIds.add(id);
        collectStoreIds(source);
      }
    }

    const candidates = [...foundFastStoreAccountIds].filter(
      (account) => account !== FAST_STORE_STARTER_ACCOUNT,
    );
    if (candidates.length !== 1) return undefined;

    cachedFastStoreAccount = candidates[0];
    return cachedFastStoreAccount;
  } catch {
    return undefined;
  }
}

export function resetVtexAccountLookup() {
  cachedFastStoreAccount = undefined;
  webpackRequire = undefined;
  fastStoreProbeInstalled = false;
  seenFastStoreModuleIds.clear();
  foundFastStoreAccountIds.clear();
}

function readAccountSource(read) {
  try {
    return read() || undefined;
  } catch {
    return undefined;
  }
}

export function getVtexAccount() {
  return (
    readAccountSource(() => window.__RUNTIME__?.account) ||
    readAccountSource(() => window.VTEX_METADATA?.account) ||
    readAccountSource(readAccountFromAssetLinks) ||
    readAccountSource(readFastStoreAccount)
  );
}

export function watchVtexAccount({
  onAccount,
  timeoutMs = FAST_STORE_ACCOUNT_TIMEOUT_MS,
  intervalMs = FAST_STORE_ACCOUNT_INTERVAL_MS,
} = {}) {
  const startedAt = Date.now();

  const publish = (account) => {
    if (!account) return;
    try {
      onAccount(account);
    } catch {
      // Ignore a failing account listener.
    }
  };

  const schedule = () => {
    const remainingMs = timeoutMs - (Date.now() - startedAt);
    if (remainingMs <= 0) return;
    try {
      timer = setTimeout(tick, Math.min(intervalMs, remainingMs));
    } catch {
      // Leave the lookup unresolved when timers are unavailable.
    }
  };

  const tick = () => {
    try {
      const account = getVtexAccount();
      if (account) {
        publish(account);
        return;
      }
    } catch {
      // Keep waiting until the deadline.
    }
    schedule();
  };

  let timer;
  const account = getVtexAccount();
  if (account) {
    publish(account);
    return () => {};
  }

  schedule();
  return () => clearTimeout(timer);
}

export function isFastStoreHost() {
  return typeof window.faststore_sdk_stores?.get === 'function';
}

export function isValidProductData(data) {
  return Boolean(data?.productName && (data.description || data.brand));
}

const PRODUCT_TYPES = new Set(['Product', 'ProductGroup']);

function isProductType(type) {
  if (typeof type === 'string') return PRODUCT_TYPES.has(type);
  if (Array.isArray(type)) return type.some((t) => PRODUCT_TYPES.has(t));
  return false;
}

function nonEmptyString(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed !== '' ? trimmed : null;
}

function getLdJsonProductCandidates(data) {
  const candidates = [];
  if (isProductType(data?.['@type'])) candidates.push(data);
  if (Array.isArray(data?.['@graph'])) {
    for (const entry of data['@graph']) {
      if (isProductType(entry?.['@type'])) candidates.push(entry);
    }
  }
  if (data?.mainEntity && isProductType(data.mainEntity['@type'])) {
    candidates.push(data.mainEntity);
  }
  return candidates;
}

export function findProductInLdJson() {
  try {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );

    for (const script of scripts) {
      try {
        const [product] = getLdJsonProductCandidates(
          JSON.parse(script.textContent),
        );
        if (product) return product;
      } catch {
        /* malformed JSON — skip this tag */
      }
    }
  } catch {
    /* querySelectorAll failure — unlikely but safe */
  }
  return null;
}

function extractLdJsonAttributes(product) {
  const props = product?.additionalProperty;
  if (!Array.isArray(props)) return {};
  return props.reduce((acc, prop) => {
    if (prop?.name && !INTERNAL_PROPERTIES.has(prop.name)) {
      acc[prop.name] = String(prop.value ?? '');
    }
    return acc;
  }, {});
}

export function extractFromLdJson(slug) {
  try {
    const product = findProductInLdJson();
    if (!product) return null;

    const brandRaw = product.brand;
    const brand =
      typeof brandRaw === 'string' ? brandRaw : brandRaw?.name || '';

    const productData = {
      productName: product.name || '',
      description: product.description || '',
      brand,
      linkText: slug,
      attributes: extractLdJsonAttributes(product),
    };

    if (!isValidProductData(productData)) return null;

    return { productData, rawProduct: product };
  } catch {
    return null;
  }
}

export function extractSpecsFromNextData(specificationGroups) {
  if (!Array.isArray(specificationGroups)) return {};
  const attrs = {};
  for (const group of specificationGroups) {
    const specs = group?.specifications;
    if (!Array.isArray(specs)) continue;
    for (const spec of specs) {
      if (spec?.name && !INTERNAL_PROPERTIES.has(spec.name)) {
        attrs[spec.name] = Array.isArray(spec.values)
          ? spec.values.join(', ')
          : '';
      }
    }
  }
  return attrs;
}

export function extractFromNextData(slug) {
  try {
    const nextData = window.__NEXT_DATA__;
    if (!nextData || nextData.page !== '/[slug]/p') return null;

    const product = nextData.props?.pageProps?.data?.product;
    if (!product) return null;

    const brandRaw = product.brand;
    const brand =
      typeof brandRaw === 'string' ? brandRaw : brandRaw?.name || '';

    const productData = {
      productName: product.isVariantOf?.name || product.name || '',
      description: product.description || '',
      brand,
      linkText: slug,
      attributes: extractSpecsFromNextData(
        product.customData?.specificationGroups,
      ),
    };

    if (!isValidProductData(productData)) return null;

    return { productData, rawProduct: product };
  } catch {
    return null;
  }
}

function isInStock(availability) {
  return typeof availability === 'string' && availability.includes('InStock');
}

function normalizeLdJsonForContext(raw) {
  const items = [];
  const variants = raw.hasVariant || [];
  const offers = raw.offers?.offers || [];

  if (variants.length > 0) {
    for (const variant of variants) {
      const variantOffer = variant.offers?.offers?.[0];
      items.push({
        itemId: variant.sku || null,
        nameComplete: variant.name || '',
        name: variant.name || '',
        sellers: variantOffer
          ? [
              {
                commertialOffer: {
                  Price: variantOffer.price ?? 0,
                  AvailableQuantity: isInStock(variantOffer.availability)
                    ? 1
                    : 0,
                },
              },
            ]
          : [],
        variations: [],
      });
    }
  } else if (offers.length > 0) {
    items.push({
      itemId: raw.sku || null,
      nameComplete: raw.name || '',
      name: raw.name || '',
      sellers: [
        {
          commertialOffer: {
            Price: offers[0].price ?? 0,
            AvailableQuantity: isInStock(offers[0].availability) ? 1 : 0,
          },
        },
      ],
      variations: [],
    });
  }

  return {
    productName: raw.name || '',
    brand: typeof raw.brand === 'string' ? raw.brand : raw.brand?.name || '',
    productId: raw.productID || raw.sku || '',
    description: raw.description || '',
    properties: (raw.additionalProperty || []).map((p) => ({
      name: p.name,
      values: [String(p.value ?? '')],
    })),
    items,
  };
}

function normalizeNextDataForContext(raw) {
  const items = [];
  const allVariants = raw.isVariantOf?.skuVariants?.allVariantProducts || [];
  const currentOffer = raw.offers?.offers?.[0];

  const rootHasSku = Boolean(raw.sku);

  for (const variant of allVariants) {
    const variantSkuId = variant.sku || (rootHasSku ? variant.productID : null);
    const isCurrent = variantSkuId
      ? String(variantSkuId) === String(raw.sku || raw.id)
      : String(variant.productID) === String(raw.id);
    items.push({
      itemId: variantSkuId,
      nameComplete: variant.name || '',
      name: variant.name || '',
      sellers:
        isCurrent && currentOffer
          ? [
              {
                commertialOffer: {
                  Price: currentOffer.price ?? 0,
                  AvailableQuantity: currentOffer.quantity,
                },
              },
            ]
          : [],
      variations: [],
    });
  }

  if (items.length === 0 && currentOffer) {
    items.push({
      itemId: raw.sku || null,
      nameComplete: raw.name || '',
      name: raw.name || '',
      sellers: [
        {
          commertialOffer: {
            Price: currentOffer.price ?? 0,
            AvailableQuantity: currentOffer.quantity,
          },
        },
      ],
      variations: [],
    });
  }

  const specGroups = raw.customData?.specificationGroups || [];
  const properties = [];
  for (const group of specGroups) {
    for (const spec of group?.specifications || []) {
      if (spec?.name) {
        properties.push({ name: spec.name, values: spec.values || [] });
      }
    }
  }

  return {
    productName: raw.isVariantOf?.name || raw.name || '',
    brand: typeof raw.brand === 'string' ? raw.brand : raw.brand?.name || '',
    productId: raw.isVariantOf?.productGroupID || raw.id || '',
    description: raw.description || '',
    properties,
    items,
  };
}

const CONTEXT_NORMALIZERS = {
  'ld+json': normalizeLdJsonForContext,
  'next-data': normalizeNextDataForContext,
  'intelligent-search': (raw) => raw,
  catalog: (raw) => raw,
};

export function normalizeForContext(rawProduct, source) {
  const normalizer = CONTEXT_NORMALIZERS[source];
  return normalizer ? normalizer(rawProduct) : rawProduct;
}

export function getSelectedSkuIdFromLdJson() {
  try {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );

    for (const script of scripts) {
      try {
        const candidates = getLdJsonProductCandidates(
          JSON.parse(script.textContent),
        );
        for (const candidate of candidates) {
          const sku = nonEmptyString(candidate?.sku);
          if (sku) return sku;
        }
      } catch {
        /* malformed JSON — skip this tag */
      }
    }
  } catch {
    /* querySelectorAll failure — unlikely but safe */
  }
  return null;
}

export function getSelectedSkuIdFromNextData() {
  try {
    const nextData = window.__NEXT_DATA__;
    if (!nextData || nextData.page !== '/[slug]/p') return null;
    return nonEmptyString(nextData.props?.pageProps?.data?.product?.sku);
  } catch {
    return null;
  }
}

export function getSkuIdFromRawProduct(rawProduct, source) {
  if (!rawProduct) return null;
  if (source === 'intelligent-search' || source === 'catalog') {
    return nonEmptyString(rawProduct.items?.[0]?.itemId);
  }
  if (source === 'next-data' || source === 'ld+json') {
    return nonEmptyString(rawProduct.sku);
  }
  return null;
}

export function getSelectedSkuIdFromVtexState() {
  try {
    const state = window.__STATE__;
    if (!state || typeof state !== 'object') return null;

    const rootQuery = state.ROOT_QUERY;
    if (!rootQuery || typeof rootQuery !== 'object') return null;

    const productKey = Object.keys(rootQuery).find((key) =>
      key.startsWith('product('),
    );
    if (!productKey) return null;

    const productRef = rootQuery[productKey]?.id;
    if (!productRef) return null;

    const itemRef = state[productRef]?.items?.[0]?.id;
    if (!itemRef) return null;

    return nonEmptyString(state[itemRef]?.itemId);
  } catch {
    return null;
  }
}

export function getProductIdFromDom() {
  try {
    return nonEmptyString(
      document.querySelector('[data-sku]')?.getAttribute('data-sku'),
    );
  } catch {
    return null;
  }
}

export function getSelectedSkuIdFromDom() {
  try {
    return nonEmptyString(
      document
        .querySelector('meta[property="product:sku"]')
        ?.getAttribute('content'),
    );
  } catch {
    return null;
  }
}

export function getSelectedSkuIdFromUrl() {
  try {
    return nonEmptyString(
      new URLSearchParams(window.location.search).get('skuId'),
    );
  } catch {
    return null;
  }
}

export function getSelectedSkuId() {
  return (
    getSelectedSkuIdFromUrl() ||
    getSelectedSkuIdFromLdJson() ||
    getSelectedSkuIdFromNextData() ||
    getSelectedSkuIdFromVtexState() ||
    getSelectedSkuIdFromDom() ||
    null
  );
}

function attachProductPath(productData) {
  return {
    ...productData,
    productPath: extractProductPathFromUrl(),
  };
}

export async function resolveProductData(slug, account) {
  const nextResult = extractFromNextData(slug);
  if (nextResult) {
    return {
      productData: attachProductPath({ ...nextResult.productData, account }),
      rawProduct: nextResult.rawProduct,
      source: 'next-data',
    };
  }

  try {
    const response = await fetchProductData(slug);
    if (response?.products) {
      const product = selectProduct(response.products, slug);
      if (product) {
        const productData = attachProductPath(
          extractProductData(product, account),
        );
        return {
          productData,
          rawProduct: product,
          source: 'intelligent-search',
        };
      }
    }
  } catch {
    /* network or parse error — fall through to ld+json */
  }

  const ldResult = extractFromLdJson(slug);
  if (ldResult) {
    return {
      productData: attachProductPath({ ...ldResult.productData, account }),
      rawProduct: ldResult.rawProduct,
      source: 'ld+json',
    };
  }

  const catalogProduct = await fetchCatalogProduct(slug);
  if (catalogProduct) {
    return {
      productData: attachProductPath(
        extractProductData(catalogProduct, account),
      ),
      rawProduct: catalogProduct,
      source: 'catalog',
    };
  }

  return null;
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

export async function fetchCatalogProduct(slug) {
  try {
    const url = `/api/catalog_system/pub/products/search/${slug}/p`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const products = await response.json();
    if (!Array.isArray(products)) return null;
    return selectProduct(products, slug);
  } catch {
    return null;
  }
}

export function selectProduct(products, slug) {
  if (!products?.length) return null;
  return (
    products.find((p) => p.linkText === slug) ||
    products.find((p) => slug.startsWith(p.linkText + '-')) ||
    null
  );
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

function formatStockStatus(availableQuantity) {
  if (availableQuantity == null) {
    return 'Could not determine stock';
  }
  return availableQuantity > 0 ? 'Available' : 'Unavailable';
}

/**
 * Strip leading zeros from numeric IDs (e.g. "000326125867" → "326125867").
 * Non-numeric IDs are left unchanged so alphanumeric SKUs stay intact.
 */
export function stripLeadingZeros(id) {
  if (id == null || id === '') return id;
  const str = String(id);
  if (!/^\d+$/.test(str)) return str;
  const stripped = str.replace(/^0+/, '');
  return stripped === '' ? '0' : stripped;
}

function skuIdsMatch(a, b) {
  if (a == null || b == null) return false;
  if (String(a) === String(b)) return true;
  return stripLeadingZeros(a) === stripLeadingZeros(b);
}

function formatSkuLine(item) {
  const offer = item.sellers?.[0]?.commertialOffer;
  const price = offer?.Price ?? 'N/A';
  const stockStatus = formatStockStatus(offer?.AvailableQuantity);
  const name = item.nameComplete || item.name || 'N/A';
  const skuId = item.itemId != null ? stripLeadingZeros(item.itemId) : 'N/A';

  const variationParts = (item.variations || []).map(
    (v) => `${v.name}: ${v.values?.join(', ') || 'N/A'}`,
  );
  const variationsStr =
    variationParts.length > 0 ? ` (${variationParts.join(', ')})` : '';

  return `- SKU ${skuId}: ${name}${variationsStr} | Price: ${price} | ${stockStatus}`;
}

function findSelectedSkuItem(product, selectedSkuId) {
  if (!product || selectedSkuId == null || selectedSkuId === '') return null;
  const items = product.items || [];
  return (
    items.find(
      (item) => item.itemId && skuIdsMatch(item.itemId, selectedSkuId),
    ) || null
  );
}

/**
 * Whether the selected SKU is available for sale.
 * Returns true when AvailableQuantity > 0, false when === 0,
 * and true (treat as available) when quantity is unknown/unmatched
 * to avoid false-positive "notify me" prompts.
 */
export function isSelectedSkuAvailable(product, selectedSkuId) {
  const matched = findSelectedSkuItem(product, selectedSkuId);
  if (!matched) return true;

  const availableQuantity =
    matched.sellers?.[0]?.commertialOffer?.AvailableQuantity;
  if (availableQuantity == null) return true;

  return availableQuantity > 0;
}

export function getSellerIdForSku(product, selectedSkuId) {
  const matched = findSelectedSkuItem(product, selectedSkuId);
  const sellers = matched?.sellers;
  if (!Array.isArray(sellers) || sellers.length === 0) return '1';

  const preferred =
    sellers.find((seller) => seller.sellerDefault) || sellers[0];
  const sellerId = preferred?.sellerId;
  if (sellerId == null || sellerId === '') return '1';

  return String(sellerId);
}

export function buildProductContextString(product, selectedSkuId) {
  if (!product) return null;

  const description = product.description || '';
  const attributes = filterInternalProperties(product.properties || []);
  const productIdFromDom = getProductIdFromDom();
  const rawProductId =
    (product.productId != null && product.productId !== ''
      ? product.productId
      : null) || productIdFromDom;
  const productId =
    rawProductId != null ? stripLeadingZeros(rawProductId) : 'N/A';
  const skuId =
    selectedSkuId != null && selectedSkuId !== ''
      ? stripLeadingZeros(selectedSkuId)
      : 'N/A';

  const lines = [
    `Product: ${product.productName || 'N/A'}`,
    `Brand: ${product.brand || 'N/A'}`,
    `Product ID: ${productId}`,
    `SKU ID: ${skuId}`,
  ];

  if (description) {
    lines.push(`Description: ${description}`);
  }

  const attributeEntries = Object.entries(attributes);
  if (attributeEntries.length > 0) {
    const parts = attributeEntries.map(([key, val]) => `${key}: ${val}`);
    lines.push(`Attributes: ${parts.join(' | ')}`);
  }

  const matched = findSelectedSkuItem(product, selectedSkuId);
  if (matched) {
    lines.push('\nSelected SKU:');
    lines.push(formatSkuLine(matched));
  }

  return lines.join('\n');
}
