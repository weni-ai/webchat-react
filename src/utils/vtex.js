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

export function extractProductPathFromUrl() {
  return window.location.pathname;
}

export function getVtexAccount() {
  return window.__RUNTIME__?.account || window.VTEX_METADATA?.account;
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

export function findProductInLdJson() {
  try {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );

    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);

        if (isProductType(data?.['@type'])) return data;

        if (Array.isArray(data?.['@graph'])) {
          const product = data['@graph'].find((entry) =>
            isProductType(entry?.['@type']),
          );
          if (product) return product;
        }

        if (data?.mainEntity && isProductType(data.mainEntity['@type'])) {
          return data.mainEntity;
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
};

export function normalizeForContext(rawProduct, source) {
  const normalizer = CONTEXT_NORMALIZERS[source];
  return normalizer ? normalizer(rawProduct) : rawProduct;
}

export function getSelectedSkuIdFromLdJson() {
  const product = findProductInLdJson();
  if (!product) return null;
  return product.sku || null;
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

    const itemId = state[itemRef]?.itemId;
    return itemId != null && itemId !== '' ? String(itemId) : null;
  } catch {
    return null;
  }
}

export function getProductIdFromDom() {
  try {
    const dataSku = document
      .querySelector('[data-sku]')
      ?.getAttribute('data-sku');
    if (dataSku?.trim()) return dataSku.trim();
  } catch {
    return null;
  }

  return null;
}

export function getSelectedSkuIdFromDom() {
  try {
    const metaSku = document
      .querySelector('meta[property="product:sku"]')
      ?.getAttribute('content');
    if (metaSku?.trim()) return metaSku.trim();
  } catch {
    return null;
  }

  return null;
}

export function getSelectedSkuIdFromUrl() {
  try {
    const skuId = new URLSearchParams(window.location.search).get('skuId');
    if (skuId?.trim()) return skuId.trim();
  } catch {
    return null;
  }

  return null;
}

export function getSelectedSkuId() {
  return (
    getSelectedSkuIdFromUrl() ||
    getSelectedSkuIdFromLdJson() ||
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

export function buildProductContextString(product, selectedSkuId) {
  if (!product) return null;

  const description = product.description || '';
  const attributes = filterInternalProperties(product.properties || []);
  const productIdFromDom = getProductIdFromDom();
  const rawProductId =
    productIdFromDom ||
    (product.productId != null && product.productId !== ''
      ? product.productId
      : null);
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

  if (selectedSkuId) {
    const items = product.items || [];
    const matched = items.find(
      (item) => item.itemId && skuIdsMatch(item.itemId, selectedSkuId),
    );
    if (matched) {
      lines.push('\nSelected SKU:');
      lines.push(formatSkuLine(matched));
    }
  }

  return lines.join('\n');
}
