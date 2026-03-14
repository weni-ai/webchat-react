import {
  isVtexPdpPage,
  extractSlugFromUrl,
  getVtexAccount,
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
