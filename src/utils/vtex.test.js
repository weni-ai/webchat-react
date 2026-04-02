import {
  isVtexPdpPage,
  extractSlugFromUrl,
  getVtexAccount,
  isValidProductData,
  findProductInLdJson,
  extractFromLdJson,
  extractSpecsFromNextData,
  extractFromNextData,
  normalizeForContext,
  resolveProductData,
  fetchProductData,
  selectProduct,
  filterInternalProperties,
  extractProductData,
  buildProductContextString,
} from './vtex';

function mockPathname(value) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, pathname: value },
    writable: true,
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
  delete window.__RUNTIME__;
  delete window.VTEX_METADATA;
  delete window.__NEXT_DATA__;
  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((el) => el.remove());
  Object.defineProperty(window, 'location', {
    value: {
      pathname: '/',
      hostname: 'mystore.vtexcommercestable.com.br',
      search: '',
    },
    writable: true,
  });
});

describe('isVtexPdpPage', () => {
  it.each([
    ['/ipad-10th-gen/p', true],
    ['/product/p/', true],
    ['/some-store/cool-product/p', true],
  ])('returns true for PDP URL %s', (path, expected) => {
    mockPathname(path);
    expect(isVtexPdpPage()).toBe(expected);
  });

  it.each([
    ['/category/smartphones', false],
    ['/search?q=fone', false],
    ['/checkout', false],
    ['/', false],
    ['/p', false],
  ])('returns false for non-PDP URL %s', (path, expected) => {
    mockPathname(path);
    expect(isVtexPdpPage()).toBe(expected);
  });
});

describe('extractSlugFromUrl', () => {
  it('extracts slug from a valid PDP URL', () => {
    mockPathname('/ipad-10th-gen/p');
    expect(extractSlugFromUrl()).toBe('ipad-10th-gen');
  });

  it('extracts slug from a nested PDP URL', () => {
    mockPathname('/electronics/ipad-10th-gen/p');
    expect(extractSlugFromUrl()).toBe('ipad-10th-gen');
  });

  it('returns null when there is no /p segment', () => {
    mockPathname('/category/smartphones');
    expect(extractSlugFromUrl()).toBeNull();
  });

  it('returns null when /p is the first segment', () => {
    mockPathname('/p');
    expect(extractSlugFromUrl()).toBeNull();
  });

  it('returns null for empty pathname', () => {
    mockPathname('/');
    expect(extractSlugFromUrl()).toBeNull();
  });
});

describe('getVtexAccount', () => {
  it('returns account from __RUNTIME__ when available', () => {
    window.__RUNTIME__ = { account: 'mystore' };
    expect(getVtexAccount()).toBe('mystore');
  });

  it('returns account from VTEX_METADATA when __RUNTIME__ is absent', () => {
    window.VTEX_METADATA = { account: 'faststore-account' };
    expect(getVtexAccount()).toBe('faststore-account');
  });

  it('prefers __RUNTIME__ over VTEX_METADATA', () => {
    window.__RUNTIME__ = { account: 'runtime-account' };
    window.VTEX_METADATA = { account: 'metadata-account' };
    expect(getVtexAccount()).toBe('runtime-account');
  });

  it('returns VTEX_METADATA when __RUNTIME__.account is undefined', () => {
    window.__RUNTIME__ = {};
    window.VTEX_METADATA = { account: 'metadata-fallback' };
    expect(getVtexAccount()).toBe('metadata-fallback');
  });

  it('returns undefined when neither source is available', () => {
    expect(getVtexAccount()).toBeUndefined();
  });

  it('returns undefined when both sources have undefined account', () => {
    window.__RUNTIME__ = {};
    window.VTEX_METADATA = {};
    expect(getVtexAccount()).toBeUndefined();
  });
});

describe('isValidProductData', () => {
  it('returns true when productName and description are present', () => {
    expect(
      isValidProductData({ productName: 'Test', description: 'Desc' }),
    ).toBe(true);
  });

  it('returns true when productName and brand are present', () => {
    expect(isValidProductData({ productName: 'Test', brand: 'Brand' })).toBe(
      true,
    );
  });

  it('returns true when all three fields are present', () => {
    expect(
      isValidProductData({
        productName: 'Test',
        description: 'Desc',
        brand: 'Brand',
      }),
    ).toBe(true);
  });

  it('returns false when productName is missing', () => {
    expect(isValidProductData({ description: 'Desc', brand: 'Brand' })).toBe(
      false,
    );
  });

  it('returns false when productName is empty string', () => {
    expect(isValidProductData({ productName: '', description: 'Desc' })).toBe(
      false,
    );
  });

  it('returns false when only productName is present', () => {
    expect(isValidProductData({ productName: 'Test' })).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isValidProductData(null)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(isValidProductData(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isValidProductData({})).toBe(false);
  });
});

describe('fetchProductData', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns parsed JSON on success', async () => {
    const data = { products: [{ id: 1 }] };
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });

    const result = await fetchProductData('ipad-10th-gen');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/io/_v/api/intelligent-search/product_search/ipad-10th-gen',
    );
    expect(result).toEqual(data);
  });

  it('returns null on non-ok response', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false });
    expect(await fetchProductData('missing')).toBeNull();
  });

  it('returns null on network error', async () => {
    globalThis.fetch.mockRejectedValue(new Error('Network failure'));
    expect(await fetchProductData('broken')).toBeNull();
  });
});

describe('selectProduct', () => {
  const products = [
    { linkText: 'product-a', productName: 'Product A' },
    { linkText: 'product-b', productName: 'Product B' },
  ];

  it('returns exact match by slug', () => {
    expect(selectProduct(products, 'product-b')).toBe(products[1]);
  });

  it('returns prefix match when slug extends a linkText with a hyphen', () => {
    const items = [
      { linkText: 'surface-go-3', productName: 'Surface Go 3' },
      { linkText: 'other-product', productName: 'Other' },
    ];
    expect(selectProduct(items, 'surface-go-3-40')).toBe(items[0]);
  });

  it('prefers exact match over prefix match', () => {
    const items = [
      { linkText: 'surface-go-3', productName: 'Surface Go 3' },
      { linkText: 'surface-go-3-40', productName: 'Surface Go 3 40' },
    ];
    expect(selectProduct(items, 'surface-go-3-40')).toBe(items[1]);
  });

  it('does not match when linkText is a partial segment of slug', () => {
    const items = [{ linkText: 'surface-go-3', productName: 'Surface Go 3' }];
    expect(selectProduct(items, 'surface-go-30')).toBeNull();
  });

  it('returns null when no product matches the slug', () => {
    expect(selectProduct(products, 'nonexistent')).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(selectProduct([], 'slug')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(selectProduct(null, 'slug')).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(selectProduct(undefined, 'slug')).toBeNull();
  });
});

describe('filterInternalProperties', () => {
  it('filters out internal properties', () => {
    const properties = [
      { name: 'sellerId', values: ['1'] },
      { name: 'Color', values: ['Red', 'Blue'] },
      { name: 'commercialConditionId', values: ['2'] },
      { name: 'Size', values: ['M'] },
    ];

    expect(filterInternalProperties(properties)).toEqual({
      Color: 'Red, Blue',
      Size: 'M',
    });
  });

  it('filters all known internal properties', () => {
    const internals = [
      { name: 'sellerId', values: ['x'] },
      { name: 'commercialConditionId', values: ['x'] },
      { name: 'cluster_highlights', values: ['x'] },
      { name: 'allSpecifications', values: ['x'] },
      { name: 'allSpecificationsGroups', values: ['x'] },
    ];

    expect(filterInternalProperties(internals)).toEqual({});
  });

  it('keeps all properties when none are internal', () => {
    const properties = [
      { name: 'Material', values: ['Cotton'] },
      { name: 'Weight', values: ['200g'] },
    ];

    expect(filterInternalProperties(properties)).toEqual({
      Material: 'Cotton',
      Weight: '200g',
    });
  });

  it('handles empty array', () => {
    expect(filterInternalProperties([])).toEqual({});
  });
});

describe('extractProductData', () => {
  it('returns the expected shape', () => {
    const product = {
      linkText: 'ipad-10th-gen',
      productName: 'iPad 10th Gen',
      description: 'A great tablet',
      brand: 'Apple',
      properties: [
        { name: 'Color', values: ['Silver'] },
        { name: 'sellerId', values: ['1'] },
      ],
    };

    expect(extractProductData(product, 'mystore')).toEqual({
      account: 'mystore',
      linkText: 'ipad-10th-gen',
      productName: 'iPad 10th Gen',
      description: 'A great tablet',
      brand: 'Apple',
      attributes: { Color: 'Silver' },
    });
  });

  it('handles missing properties array', () => {
    const product = {
      linkText: 'minimal',
      productName: 'Minimal Product',
      description: null,
      brand: undefined,
    };

    const result = extractProductData(product, 'store');
    expect(result.attributes).toEqual({});
    expect(result.description).toBeNull();
    expect(result.brand).toBeUndefined();
  });
});

describe('buildProductContextString', () => {
  it('returns null for null product', () => {
    expect(buildProductContextString(null)).toBeNull();
  });

  it('builds context with basic product fields', () => {
    const product = {
      productName: 'iPad',
      brand: 'Apple',
      productId: '123',
      description: 'A great tablet',
      properties: [{ name: 'Color', values: ['Silver'] }],
      items: [],
    };
    const result = buildProductContextString(product);
    expect(result).toContain('Product: iPad');
    expect(result).toContain('Brand: Apple');
    expect(result).toContain('Product ID: 123');
    expect(result).toContain('Description: A great tablet');
    expect(result).toContain('Attributes: Color: Silver');
  });

  it('limits SKUs to 5 and shows total count', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      itemId: String(i + 1),
      name: `SKU ${i + 1}`,
      sellers: [{ commertialOffer: { Price: 100, AvailableQuantity: 1 } }],
    }));
    const product = {
      productName: 'Shirt',
      brand: 'Brand',
      productId: '1',
      properties: [],
      items,
    };
    const result = buildProductContextString(product);
    expect(result).toContain('showing 5 of 8');
    expect(result).toContain('SKU 1:');
    expect(result).toContain('SKU 5:');
    expect(result).not.toContain('SKU 6:');
    expect(result).not.toContain('SKU 8:');
  });

  it('shows all SKUs when count is within limit', () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      itemId: String(i + 1),
      name: `SKU ${i + 1}`,
      sellers: [{ commertialOffer: { Price: 50, AvailableQuantity: 2 } }],
    }));
    const product = {
      productName: 'Hat',
      brand: 'Brand',
      productId: '2',
      properties: [],
      items,
    };
    const result = buildProductContextString(product);
    expect(result).toContain('showing 3 of 3');
    expect(result).toContain('SKU 1:');
    expect(result).toContain('SKU 3:');
  });

  it('does not truncate description', () => {
    const longDesc = 'A'.repeat(500);
    const product = {
      productName: 'Test',
      brand: 'B',
      productId: '1',
      description: longDesc,
      properties: [],
      items: [],
    };
    const result = buildProductContextString(product);
    expect(result).toContain(`Description: ${longDesc}`);
  });

  it('includes all attributes without limit', () => {
    const properties = Array.from({ length: 15 }, (_, i) => ({
      name: `Attr${i + 1}`,
      values: [`val${i + 1}`],
    }));
    const product = {
      productName: 'Test',
      brand: 'B',
      productId: '1',
      properties,
      items: [],
    };
    const result = buildProductContextString(product);
    expect(result).toContain('Attr1: val1');
    expect(result).toContain('Attr15: val15');
  });

  it('handles missing optional fields with N/A', () => {
    const product = {
      properties: [],
      items: [],
    };
    const result = buildProductContextString(product);
    expect(result).toContain('Product: N/A');
    expect(result).toContain('Brand: N/A');
    expect(result).toContain('Product ID: N/A');
  });
});

function injectLdJson(data) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = typeof data === 'string' ? data : JSON.stringify(data);
  document.head.appendChild(script);
  return script;
}

describe('findProductInLdJson', () => {
  it('finds a flat Product type', () => {
    injectLdJson({ '@type': 'Product', name: 'iPad' });
    const result = findProductInLdJson();
    expect(result).toEqual(expect.objectContaining({ name: 'iPad' }));
  });

  it('finds a flat ProductGroup type', () => {
    injectLdJson({ '@type': 'ProductGroup', name: 'Surface' });
    expect(findProductInLdJson()['@type']).toBe('ProductGroup');
  });

  it('finds Product when @type is an array', () => {
    injectLdJson({ '@type': ['Thing', 'Product'], name: 'Phone' });
    expect(findProductInLdJson()).not.toBeNull();
  });

  it('finds Product inside @graph', () => {
    injectLdJson({
      '@graph': [
        { '@type': 'BreadcrumbList' },
        { '@type': 'Product', name: 'Tablet' },
      ],
    });
    expect(findProductInLdJson().name).toBe('Tablet');
  });

  it('finds Product inside mainEntity', () => {
    injectLdJson({
      '@type': 'WebPage',
      mainEntity: { '@type': 'Product', name: 'Watch' },
    });
    expect(findProductInLdJson().name).toBe('Watch');
  });

  it('picks Product when multiple ld+json tags exist', () => {
    injectLdJson({ '@type': 'BreadcrumbList', itemListElement: [] });
    injectLdJson({ '@type': 'Product', name: 'Laptop' });
    expect(findProductInLdJson().name).toBe('Laptop');
  });

  it('returns null for malformed JSON', () => {
    injectLdJson('not valid json {{{');
    expect(findProductInLdJson()).toBeNull();
  });

  it('returns null when no ld+json tags exist', () => {
    expect(findProductInLdJson()).toBeNull();
  });

  it('returns null when no tag has a Product type', () => {
    injectLdJson({ '@type': 'Organization', name: 'Acme' });
    expect(findProductInLdJson()).toBeNull();
  });
});

describe('extractFromLdJson', () => {
  it('extracts product data with all fields', () => {
    injectLdJson({
      '@type': 'Product',
      name: 'Surface Go 3',
      description: 'A tablet',
      brand: { name: 'Microsoft' },
      additionalProperty: [
        { name: 'Storage', value: '64GB', valueReference: 'SPECIFICATION' },
      ],
    });

    const result = extractFromLdJson('surface-go-3');
    expect(result).not.toBeNull();
    expect(result.productData).toEqual({
      productName: 'Surface Go 3',
      description: 'A tablet',
      brand: 'Microsoft',
      linkText: 'surface-go-3',
      attributes: { Storage: '64GB' },
    });
  });

  it('handles brand as a plain string', () => {
    injectLdJson({
      '@type': 'Product',
      name: 'iPhone',
      description: 'A phone',
      brand: 'Apple',
    });
    expect(extractFromLdJson('iphone').productData.brand).toBe('Apple');
  });

  it('returns null when name is missing', () => {
    injectLdJson({
      '@type': 'Product',
      description: 'No name',
      brand: 'Brand',
    });
    expect(extractFromLdJson('slug')).toBeNull();
  });

  it('returns null when only name is present (no brand/description)', () => {
    injectLdJson({ '@type': 'Product', name: 'OnlyName' });
    expect(extractFromLdJson('slug')).toBeNull();
  });

  it('filters internal properties from additionalProperty', () => {
    injectLdJson({
      '@type': 'Product',
      name: 'Test',
      brand: 'B',
      additionalProperty: [
        { name: 'sellerId', value: '1' },
        { name: 'Color', value: 'Red' },
      ],
    });
    const result = extractFromLdJson('test');
    expect(result.productData.attributes).toEqual({ Color: 'Red' });
  });

  it('returns rawProduct as the original ld+json object', () => {
    const obj = { '@type': 'Product', name: 'X', brand: 'Y' };
    injectLdJson(obj);
    const result = extractFromLdJson('x');
    expect(result.rawProduct['@type']).toBe('Product');
  });

  it('returns null when no ld+json tags exist', () => {
    expect(extractFromLdJson('slug')).toBeNull();
  });
});

describe('extractSpecsFromNextData', () => {
  it('extracts specs from a single group', () => {
    const groups = [
      {
        name: 'allSpecifications',
        specifications: [{ name: 'Storage', values: ['64GB', '128GB'] }],
      },
    ];
    expect(extractSpecsFromNextData(groups)).toEqual({
      Storage: '64GB, 128GB',
    });
  });

  it('filters internal properties', () => {
    const groups = [
      {
        name: 'allSpecifications',
        specifications: [
          { name: 'sellerId', values: ['1'] },
          { name: 'Color', values: ['Red'] },
        ],
      },
    ];
    expect(extractSpecsFromNextData(groups)).toEqual({ Color: 'Red' });
  });

  it('handles multiple groups', () => {
    const groups = [
      { specifications: [{ name: 'A', values: ['1'] }] },
      { specifications: [{ name: 'B', values: ['2'] }] },
    ];
    expect(extractSpecsFromNextData(groups)).toEqual({ A: '1', B: '2' });
  });

  it('returns empty object for null input', () => {
    expect(extractSpecsFromNextData(null)).toEqual({});
  });

  it('returns empty object for empty array', () => {
    expect(extractSpecsFromNextData([])).toEqual({});
  });

  it('skips groups with missing specifications', () => {
    const groups = [
      { name: 'empty' },
      { specifications: [{ name: 'X', values: ['Y'] }] },
    ];
    expect(extractSpecsFromNextData(groups)).toEqual({ X: 'Y' });
  });
});

describe('extractFromNextData', () => {
  const SURFACE_GO_NEXT_DATA = {
    props: {
      pageProps: {
        data: {
          product: {
            name: 'Surface Go 3 Pentium 8GB 64GB',
            description: 'Compact Windows tablet.',
            brand: { name: 'Microsoft' },
            isVariantOf: {
              name: 'Surface Go 3',
              productGroupID: '7',
              skuVariants: {
                allVariantProducts: [
                  { name: 'Surface Go 3 Pentium 8GB 64GB', productID: '37' },
                  { name: 'Surface Go 3 Pentium 8GB 128GB', productID: '38' },
                ],
              },
            },
            offers: {
              offers: [{ price: 399, quantity: 10000 }],
            },
            id: '37',
            sku: '37',
            customData: {
              specificationGroups: [
                {
                  name: 'allSpecifications',
                  specifications: [
                    { name: 'Storage', values: ['64GB', '128GB', '256GB'] },
                    { name: 'sellerId', values: ['1'] },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    page: '/[slug]/p',
    query: { slug: 'surface-go-3' },
  };

  it('extracts product data from valid __NEXT_DATA__', () => {
    window.__NEXT_DATA__ = SURFACE_GO_NEXT_DATA;
    const result = extractFromNextData('surface-go-3');
    expect(result).not.toBeNull();
    expect(result.productData).toEqual({
      productName: 'Surface Go 3',
      description: 'Compact Windows tablet.',
      brand: 'Microsoft',
      linkText: 'surface-go-3',
      attributes: { Storage: '64GB, 128GB, 256GB' },
    });
  });

  it('uses isVariantOf.name as productName', () => {
    window.__NEXT_DATA__ = SURFACE_GO_NEXT_DATA;
    expect(extractFromNextData('surface-go-3').productData.productName).toBe(
      'Surface Go 3',
    );
  });

  it('falls back to name when isVariantOf is absent', () => {
    window.__NEXT_DATA__ = {
      props: {
        pageProps: {
          data: {
            product: {
              name: 'Simple Product',
              description: 'Desc',
              brand: { name: 'Brand' },
              customData: { specificationGroups: [] },
            },
          },
        },
      },
      page: '/[slug]/p',
    };
    expect(extractFromNextData('slug').productData.productName).toBe(
      'Simple Product',
    );
  });

  it('returns null when page is not a PDP', () => {
    window.__NEXT_DATA__ = { ...SURFACE_GO_NEXT_DATA, page: '/[slug]' };
    expect(extractFromNextData('slug')).toBeNull();
  });

  it('returns null when __NEXT_DATA__ is absent', () => {
    expect(extractFromNextData('slug')).toBeNull();
  });

  it('returns null when data.product is missing', () => {
    window.__NEXT_DATA__ = {
      props: { pageProps: { data: {} } },
      page: '/[slug]/p',
    };
    expect(extractFromNextData('slug')).toBeNull();
  });

  it('returns null for incomplete data failing validation', () => {
    window.__NEXT_DATA__ = {
      props: {
        pageProps: {
          data: { product: { name: 'OnlyName', customData: {} } },
        },
      },
      page: '/[slug]/p',
    };
    expect(extractFromNextData('slug')).toBeNull();
  });

  it('filters sellerId from attributes', () => {
    window.__NEXT_DATA__ = SURFACE_GO_NEXT_DATA;
    const result = extractFromNextData('surface-go-3');
    expect(result.productData.attributes).not.toHaveProperty('sellerId');
  });
});

describe('normalizeForContext', () => {
  it('passes IS API product through unchanged', () => {
    const raw = { productName: 'Test', items: [] };
    expect(normalizeForContext(raw, 'intelligent-search')).toBe(raw);
  });

  it('normalizes ld+json product with offers', () => {
    const raw = {
      name: 'iPad',
      brand: { name: 'Apple' },
      description: 'Tablet',
      sku: '42',
      offers: {
        offers: [{ price: 499, availability: 'https://schema.org/InStock' }],
      },
      additionalProperty: [{ name: 'Color', value: 'Silver' }],
    };
    const result = normalizeForContext(raw, 'ld+json');
    expect(result.productName).toBe('iPad');
    expect(result.brand).toBe('Apple');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].sellers[0].commertialOffer.Price).toBe(499);
  });

  it('normalizes ld+json ProductGroup with variants', () => {
    const raw = {
      '@type': 'ProductGroup',
      name: 'Shirt',
      brand: 'Acme',
      description: 'A shirt',
      hasVariant: [
        {
          name: 'Shirt Red',
          sku: '1',
          offers: {
            offers: [{ price: 30, availability: 'https://schema.org/InStock' }],
          },
        },
        {
          name: 'Shirt Blue',
          sku: '2',
          offers: {
            offers: [
              { price: 30, availability: 'https://schema.org/OutOfStock' },
            ],
          },
        },
      ],
      additionalProperty: [],
    };
    const result = normalizeForContext(raw, 'ld+json');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Shirt Red');
    expect(result.items[1].sellers[0].commertialOffer.AvailableQuantity).toBe(
      0,
    );
  });

  it('handles ld+json with no offers', () => {
    const raw = { name: 'NoOffer', brand: 'B', description: 'D' };
    const result = normalizeForContext(raw, 'ld+json');
    expect(result.items).toHaveLength(0);
  });

  it('normalizes __NEXT_DATA__ product with variants', () => {
    const raw = {
      name: 'Surface Go 3 Pentium 8GB 64GB',
      brand: { name: 'Microsoft' },
      description: 'Tablet',
      id: '37',
      isVariantOf: {
        name: 'Surface Go 3',
        productGroupID: '7',
        skuVariants: {
          allVariantProducts: [
            { name: 'Surface Go 3 64GB', productID: '37' },
            { name: 'Surface Go 3 128GB', productID: '38' },
          ],
        },
      },
      offers: { offers: [{ price: 399, quantity: 10000 }] },
      customData: {
        specificationGroups: [
          { specifications: [{ name: 'Storage', values: ['64GB'] }] },
        ],
      },
    };
    const result = normalizeForContext(raw, 'next-data');
    expect(result.productName).toBe('Surface Go 3');
    expect(result.productId).toBe('7');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].sellers).toHaveLength(1);
    expect(result.items[1].sellers).toHaveLength(0);
  });

  it('handles __NEXT_DATA__ with no variants', () => {
    const raw = {
      name: 'Simple',
      brand: { name: 'B' },
      description: 'D',
      id: '1',
      offers: { offers: [{ price: 100, quantity: 5 }] },
      customData: { specificationGroups: [] },
    };
    const result = normalizeForContext(raw, 'next-data');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].itemId).toBe('1');
  });
});

describe('resolveProductData', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns ld+json result when available (no API call)', async () => {
    injectLdJson({
      '@type': 'Product',
      name: 'iPad',
      description: 'Tablet',
      brand: { name: 'Apple' },
    });

    const result = await resolveProductData('ipad', 'mystore');
    expect(result.source).toBe('ld+json');
    expect(result.productData.account).toBe('mystore');
    expect(result.productData.productName).toBe('iPad');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('falls to __NEXT_DATA__ when ld+json fails', async () => {
    window.__NEXT_DATA__ = {
      props: {
        pageProps: {
          data: {
            product: {
              name: 'Surface',
              description: 'Tablet',
              brand: { name: 'MS' },
              isVariantOf: { name: 'Surface' },
              customData: { specificationGroups: [] },
            },
          },
        },
      },
      page: '/[slug]/p',
    };

    const result = await resolveProductData('surface', 'store');
    expect(result.source).toBe('next-data');
    expect(result.productData.productName).toBe('Surface');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('falls to IS API when both page sources fail', async () => {
    mockPathname('/test-product/p');
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          products: [
            {
              linkText: 'test-product',
              productName: 'Test',
              description: 'Desc',
              brand: 'Brand',
              properties: [],
            },
          ],
        }),
    });

    const result = await resolveProductData('test-product', 'store');
    expect(result.source).toBe('intelligent-search');
    expect(result.productData.productName).toBe('Test');
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('returns null when all strategies fail', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false });
    const result = await resolveProductData('nothing', 'store');
    expect(result).toBeNull();
  });

  it('includes account in productData from all sources', async () => {
    injectLdJson({
      '@type': 'Product',
      name: 'P',
      brand: 'B',
    });
    const result = await resolveProductData('p', 'acme');
    expect(result.productData.account).toBe('acme');
  });

  it('returns null when IS API fetch throws', async () => {
    globalThis.fetch.mockRejectedValue(new Error('Network'));
    const result = await resolveProductData('slug', 'store');
    expect(result).toBeNull();
  });
});

describe('edge cases for branch coverage', () => {
  it('extractFromLdJson catches thrown errors', () => {
    const badScript = document.createElement('script');
    badScript.type = 'application/ld+json';
    badScript.textContent = JSON.stringify({
      '@type': 'Product',
      name: 'X',
      brand: 'B',
    });
    document.head.appendChild(badScript);

    const origParse = JSON.parse;
    const callCount = { value: 0 };
    JSON.parse = function (...args) {
      callCount.value++;
      if (callCount.value === 1) return origParse.apply(this, args);
      throw new Error('forced');
    };

    const origQuery = document.querySelectorAll;
    document.querySelectorAll = () => {
      throw new Error('forced DOM error');
    };

    expect(extractFromLdJson('x')).toBeNull();
    document.querySelectorAll = origQuery;
    JSON.parse = origParse;
    badScript.remove();
  });

  it('extractFromNextData catches thrown errors', () => {
    window.__NEXT_DATA__ = {
      page: '/[slug]/p',
      props: null,
    };
    Object.defineProperty(window.__NEXT_DATA__, 'props', {
      get() {
        throw new Error('forced');
      },
    });
    expect(extractFromNextData('slug')).toBeNull();
    delete window.__NEXT_DATA__;
  });

  it('formatSkuLine handles missing values in variations', () => {
    const product = {
      productName: 'Test',
      brand: 'B',
      productId: '1',
      description: 'D',
      properties: [],
      items: [
        {
          itemId: '1',
          name: 'SKU 1',
          sellers: [{ commertialOffer: { Price: 10, AvailableQuantity: 1 } }],
          variations: [{ name: 'Size', values: null }],
        },
      ],
    };
    const ctx = buildProductContextString(product);
    expect(ctx).toContain('Size: N/A');
  });

  it('normalizeForContext ld+json: variant without offers gets empty sellers', () => {
    const raw = {
      name: 'Shirt',
      brand: 'Acme',
      description: 'D',
      hasVariant: [{ name: 'Variant No Offer', productID: '10' }],
    };
    const result = normalizeForContext(raw, 'ld+json');
    expect(result.items[0].sellers).toEqual([]);
    expect(result.items[0].itemId).toBe('10');
  });

  it('normalizeForContext ld+json: uses productID fallback when sku missing', () => {
    const raw = {
      name: 'X',
      brand: 'B',
      description: 'D',
      productID: '99',
      offers: {
        offers: [{ price: 50, availability: 'https://schema.org/OutOfStock' }],
      },
    };
    const result = normalizeForContext(raw, 'ld+json');
    expect(result.items[0].itemId).toBe('99');
    expect(result.items[0].sellers[0].commertialOffer.AvailableQuantity).toBe(
      0,
    );
    expect(result.productId).toBe('99');
  });

  it('normalizeForContext next-data: no offers and no variants produces empty items', () => {
    const raw = {
      name: 'NoItems',
      brand: { name: 'B' },
      description: 'D',
      id: '5',
      customData: { specificationGroups: [] },
    };
    const result = normalizeForContext(raw, 'next-data');
    expect(result.items).toHaveLength(0);
  });

  it('normalizeForContext returns rawProduct for unknown source', () => {
    const raw = { foo: 'bar' };
    expect(normalizeForContext(raw, 'unknown')).toBe(raw);
  });

  it('findProductInLdJson skips tags with non-Product types before finding one', () => {
    injectLdJson({ '@type': 'Organization', name: 'Corp' });
    injectLdJson({ '@type': 'WebPage', name: 'Page' });
    injectLdJson({ '@type': 'Product', name: 'Found' });
    expect(findProductInLdJson().name).toBe('Found');
  });

  it('extractFromLdJson handles missing additionalProperty', () => {
    injectLdJson({
      '@type': 'Product',
      name: 'NoProps',
      brand: { name: 'B' },
    });
    const result = extractFromLdJson('no-props');
    expect(result.productData.attributes).toEqual({});
  });

  it('extractFromNextData handles brand as string', () => {
    window.__NEXT_DATA__ = {
      props: {
        pageProps: {
          data: {
            product: {
              name: 'P',
              description: 'D',
              brand: 'StringBrand',
              customData: { specificationGroups: [] },
            },
          },
        },
      },
      page: '/[slug]/p',
    };
    expect(extractFromNextData('slug').productData.brand).toBe('StringBrand');
  });
});
