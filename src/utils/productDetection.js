function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function text(el) {
  return el?.textContent?.replace(/\s+/g, ' ').trim() || null;
}

function pickFirst(...values) {
  for (const v of values) {
    if (v && (typeof v !== 'string' || v.trim())) return v;
  }
  return null;
}

function getJsonLdProducts() {
  const scripts = [
    ...document.querySelectorAll('script[type="application/ld+json"]'),
  ];
  const products = [];

  for (const script of scripts) {
    const raw = script.textContent?.trim();
    if (!raw) continue;

    const parsed = safeJsonParse(raw);
    if (!parsed) continue;

    const items = Array.isArray(parsed) ? parsed : [parsed];

    for (const item of items) {
      if (!item) continue;

      if (item['@type'] === 'Product') {
        products.push(item);
      }

      if (Array.isArray(item['@graph'])) {
        for (const node of item['@graph']) {
          if (node?.['@type'] === 'Product') {
            products.push(node);
          }
        }
      }
    }
  }

  return products;
}

function getMetaContent(selector) {
  const el = document.querySelector(selector);
  return el?.getAttribute('content')?.trim() || null;
}

function extractSpecsFromTables() {
  const specs = {};

  const tables = [...document.querySelectorAll('table')];
  for (const table of tables) {
    const rows = [...table.querySelectorAll('tr')];
    for (const row of rows) {
      const th = row.querySelector('th');
      const td = row.querySelector('td');
      const cells = row.querySelectorAll('td');

      if (th && td) {
        const key = text(th);
        const value = text(td);
        if (key && value) specs[key] = value;
      } else if (cells.length >= 2) {
        const key = text(cells[0]);
        const value = text(cells[1]);
        if (key && value) specs[key] = value;
      }
    }
  }

  return specs;
}

function extractSpecsFromDl() {
  const specs = {};
  const dls = [...document.querySelectorAll('dl')];

  for (const dl of dls) {
    const dts = [...dl.querySelectorAll('dt')];
    for (const dt of dts) {
      let dd = dt.nextElementSibling;
      while (dd && dd.tagName !== 'DD') dd = dd.nextElementSibling;

      const key = text(dt);
      const value = text(dd);
      if (key && value) specs[key] = value;
    }
  }

  return specs;
}

function extractSpecsFromGenericBlocks() {
  const specs = {};
  const candidates = [
    ...document.querySelectorAll(
      "[class*='spec'], [class*='attribute'], [class*='property'], [class*='sku']",
    ),
  ];

  for (const block of candidates) {
    const items = [...block.querySelectorAll('li, div')];

    for (const item of items) {
      const raw = text(item);
      if (!raw) continue;

      const separators = [':', '•', '-', '|'];
      for (const sep of separators) {
        const idx = raw.indexOf(sep);
        if (idx > 0 && idx < raw.length - 1) {
          const key = raw.slice(0, idx).trim();
          const value = raw.slice(idx + 1).trim();
          if (key.length <= 60 && value.length <= 200) {
            if (!specs[key]) specs[key] = value;
          }
          break;
        }
      }
    }
  }

  return specs;
}

function extractVisibleName() {
  const selectors = [
    'h1',
    '[data-testid*="product-name"]',
    '[class*="productName"]',
    '[class*="product-name"]',
    '[class*="vtex-store-components-3-x-productNameContainer"]',
    '[class*="vtex-store-components-3-x-productBrand"]',
  ];

  for (const selector of selectors) {
    const els = [...document.querySelectorAll(selector)];
    for (const el of els) {
      const value = text(el);
      if (value && value.length > 2) return value;
    }
  }

  return null;
}

function extractVisibleDescription() {
  const selectors = [
    '[class*="productDescription"]',
    '[class*="product-description"]',
    '[class*="description"]',
    '[data-testid*="description"]',
    'meta[name="description"]',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) continue;

    const value =
      el.tagName === 'META' ? el.getAttribute('content')?.trim() : text(el);

    if (value && value.length > 10) return value;
  }

  return null;
}

export function isVtexPdpPage() {
  return /\/[^/]+\/p\/?$/.test(window.location.pathname);
}

export function getProductDetails() {
  const jsonLdProducts = getJsonLdProducts();
  const primaryProduct = jsonLdProducts[0] || null;

  const jsonLdName = primaryProduct?.name || null;
  const jsonLdDescription = primaryProduct?.description || null;
  const jsonLdBrand =
    typeof primaryProduct?.brand === 'string'
      ? primaryProduct.brand
      : primaryProduct?.brand?.name || null;

  const metaTitle =
    getMetaContent('meta[property="og:title"]') || document.title || null;

  const metaDescription =
    getMetaContent('meta[property="og:description"]') ||
    getMetaContent('meta[name="description"]') ||
    null;

  const visibleName = extractVisibleName();
  const visibleDescription = extractVisibleDescription();

  const specs = Object.assign(
    {},
    extractSpecsFromTables(),
    extractSpecsFromDl(),
    extractSpecsFromGenericBlocks(),
  );

  return {
    slug: window.location.pathname
      .replace(/\/p\/?$/, '')
      .split('/')
      .filter(Boolean)
      .pop() || '',
    productName: pickFirst(jsonLdName, visibleName, metaTitle),
    description: pickFirst(
      jsonLdDescription,
      visibleDescription,
      metaDescription,
    ),
    brand: jsonLdBrand,
    attributes: specs,
  };
}

export async function fetchConversationStarters(endpoint, secret, productData) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-shared-secret': secret,
    },
    body: JSON.stringify({
      slug: productData.slug,
      productName: productData.productName,
      description: productData.description,
      attributes: productData.attributes,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch conversation starters: ${response.status}`,
    );
  }

  const data = await response.json();
  return data.questions || [];
}

export async function detectAndFetchStarters(config) {
  if (!config?.endpoint || !config?.secret) return null;
  if (!isVtexPdpPage()) return null;

  const productData = getProductDetails();
  if (!productData?.productName) return null;

  const questions = await fetchConversationStarters(
    config.endpoint,
    config.secret,
    productData,
  );

  return questions.slice(0, 3);
}
