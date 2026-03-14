import {
  isVtexPdpPage,
  extractSlugFromUrl,
  getVtexAccount,
  fetchProductData,
  selectProduct,
  filterInternalProperties,
  extractProductData,
  getSelectedSku,
  buildSkuContextString,
} from './vtex';

function mockPathname(value) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, pathname: value },
    writable: true,
  });
}

function mockSearch(value) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: value },
    writable: true,
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
  delete window.__RUNTIME__;
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

  it('falls back to hostname when __RUNTIME__ is absent', () => {
    expect(getVtexAccount()).toBe('mystore');
  });

  it('falls back to hostname when __RUNTIME__.account is undefined', () => {
    window.__RUNTIME__ = {};
    expect(getVtexAccount()).toBe('mystore');
  });
});

describe('fetchProductData', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('returns parsed JSON on success', async () => {
    const data = { products: [{ id: 1 }] };
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

    const result = await fetchProductData('ipad-10th-gen');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/io/_v/api/intelligent-search/product_search/ipad-10th-gen',
    );
    expect(result).toEqual(data);
  });

  it('returns null on non-ok response', async () => {
    global.fetch.mockResolvedValue({ ok: false });
    expect(await fetchProductData('missing')).toBeNull();
  });

  it('returns null on network error', async () => {
    global.fetch.mockRejectedValue(new Error('Network failure'));
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

  it('falls back to first product when slug has no match', () => {
    expect(selectProduct(products, 'nonexistent')).toBe(products[0]);
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

describe('getSelectedSku', () => {
  const items = [
    { itemId: '100', name: 'Blue Shirt' },
    { itemId: '200', name: 'Red Shirt' },
  ];

  it('returns SKU matching skuId URL param', () => {
    mockSearch('?skuId=200');
    expect(getSelectedSku({ items })).toBe(items[1]);
  });

  it('returns SKU matching __RUNTIME__ slug', () => {
    window.__RUNTIME__ = { route: { params: { slug: 'red shirt' } } };
    expect(getSelectedSku({ items })).toBe(items[1]);
  });

  it('prefers skuId over runtime slug', () => {
    mockSearch('?skuId=100');
    window.__RUNTIME__ = { route: { params: { slug: 'red shirt' } } };
    expect(getSelectedSku({ items })).toBe(items[0]);
  });

  it('falls back to first item when no params match', () => {
    expect(getSelectedSku({ items })).toBe(items[0]);
  });

  it('returns null for empty items array', () => {
    expect(getSelectedSku({ items: [] })).toBeNull();
  });

  it('returns null when product is null', () => {
    expect(getSelectedSku(null)).toBeNull();
  });

  it('returns null when items is undefined', () => {
    expect(getSelectedSku({})).toBeNull();
  });
});

describe('buildSkuContextString', () => {
  const product = { productName: 'iPad', brand: 'Apple' };

  const sku = {
    nameComplete: 'iPad 64GB Silver',
    name: 'iPad Silver',
    images: [{ imageUrl: 'https://img.vtex.com/ipad.jpg' }],
    sellers: [
      {
        commertialOffer: {
          Price: 3499,
          ListPrice: 3999,
          AvailableQuantity: 5,
        },
      },
    ],
  };

  it('builds a formatted context string', () => {
    const result = buildSkuContextString(product, sku);
    expect(result).toContain('Product: iPad');
    expect(result).toContain('Brand: Apple');
    expect(result).toContain('Selected variant: iPad 64GB Silver');
    expect(result).toContain('Price: 3499');
    expect(result).toContain('List price: 3999');
    expect(result).toContain('Availability: In stock');
    expect(result).toContain('Image: https://img.vtex.com/ipad.jpg');
  });

  it('shows out of stock when quantity is 0', () => {
    const outOfStockSku = {
      ...sku,
      sellers: [{ commertialOffer: { ...sku.sellers[0].commertialOffer, AvailableQuantity: 0 } }],
    };
    expect(buildSkuContextString(product, outOfStockSku)).toContain('Availability: Out of stock');
  });

  it('handles missing seller data with N/A', () => {
    const result = buildSkuContextString(product, { name: 'Basic' });
    expect(result).toContain('Price: N/A');
    expect(result).toContain('List price: N/A');
    expect(result).toContain('Availability: Out of stock');
    expect(result).toContain('Image: N/A');
  });

  it('falls back to sku.name when nameComplete is missing', () => {
    const skuNoComplete = { ...sku, nameComplete: undefined };
    expect(buildSkuContextString(product, skuNoComplete)).toContain('Selected variant: iPad Silver');
  });

  it('includes variations when present', () => {
    const skuWithVariations = {
      ...sku,
      variations: [
        { name: 'Color', values: ['Silver', 'Space Gray'] },
        { name: 'Storage', values: ['64GB'] },
      ],
    };
    const result = buildSkuContextString(product, skuWithVariations);
    expect(result).toContain('Variations: Color: Silver, Space Gray | Storage: 64GB');
  });

  it('omits variations line when not present', () => {
    const result = buildSkuContextString(product, sku);
    expect(result).not.toContain('Variations:');
  });

  it('handles null product and sku gracefully', () => {
    const result = buildSkuContextString(null, null);
    expect(result).toContain('Product: N/A');
    expect(result).toContain('Brand: N/A');
    expect(result).toContain('Selected variant: N/A');
  });
});
