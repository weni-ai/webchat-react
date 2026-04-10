# Feature Specification: PDP Product Data Extraction Strategy

**Feature Branch**: `004-pdp-product-data-strategy`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: Change PDP starters to use ld+json and `__NEXT_DATA__` before Intelligent Search API fallback, and update account name resolution to use `window.__RUNTIME__?.account || window.VTEX_METADATA?.account`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ld+json Product Data Extraction (Priority: P1)

A shopper navigates to a VTEX product detail page (PDP). The webchat widget attempts to extract product information from the page's structured data (`<script type="application/ld+json">`) before making any network requests. VTEX stores (both VTEX IO via the `structured-data` app and FastStore) render Schema.org `Product` or `ProductGroup` markup in the page head for SEO purposes. The widget parses these script tags, identifies the one containing product data (by checking for `@type` of `Product` or `ProductGroup`), and extracts `name`, `description`, `brand`, and other relevant fields. If valid product data is found, no further extraction methods are attempted.

**Why this priority**: This is the fastest and most reliable source of product data. It requires zero network requests, works synchronously, and is available on virtually all VTEX storefronts because structured data is a standard SEO practice. Making this the primary strategy significantly reduces latency and eliminates dependency on API availability.

**Independent Test**: Navigate to any VTEX PDP that has `<script type="application/ld+json">` with Schema.org Product data in the page source. With `conversationStarters.pdp: true`, starters should appear without any network request to the Intelligent Search API. Can be verified by checking the browser Network tab for the absence of `product_search` calls.

**Acceptance Scenarios**:

1. **Given** the user is on a VTEX PDP that contains a `<script type="application/ld+json">` tag with a Schema.org `Product` or `ProductGroup` object, **When** the PDP detection triggers, **Then** the widget parses the ld+json data and extracts product name, description, brand, and attributes without making any API calls.

2. **Given** the page contains multiple `<script type="application/ld+json">` tags (e.g., BreadcrumbList, Organization, Product), **When** the widget scans for product data, **Then** it identifies and uses only the tag whose `@type` is `Product` or `ProductGroup` (or an array containing one of these types).

3. **Given** the ld+json tag contains a `ProductGroup` with `hasVariant` entries, **When** extracting data, **Then** the widget extracts the group-level product name, description, and brand, and maps variant-level attributes (e.g., color, size) into the attributes object.

4. **Given** the ld+json data is successfully extracted, **When** building the product data payload for starters, **Then** the payload contains `account`, `linkText` (from URL slug), `productName`, `description`, `brand`, and `attributes` in the same structure expected by the backend.

5. **Given** the ld+json tag exists but contains malformed JSON or missing required fields (e.g., no `name`), **When** parsing fails or yields incomplete data, **Then** the widget falls through to the next extraction strategy (`__NEXT_DATA__`) without displaying any error.

---

### User Story 2 - `__NEXT_DATA__` Product Data Extraction (Priority: P1)

When ld+json extraction fails or yields no usable product data, the widget attempts to read product information from `window.__NEXT_DATA__`. VTEX FastStore is built on Next.js, and product pages rendered via `getStaticProps` or `getServerSideProps` expose their page props in this global object. The widget navigates the `__NEXT_DATA__.props.pageProps` structure to locate product data, extracting the same fields needed for the starters payload.

**Why this priority**: This is the second most efficient strategy — still requires no network requests and provides rich, pre-fetched product data. It covers the FastStore ecosystem where ld+json may not be present or may lack certain fields. Together with Story 1, these two strategies cover the majority of VTEX storefronts without any API dependency.

**Independent Test**: On a VTEX FastStore product page that has `window.__NEXT_DATA__` with product data in `pageProps`, remove or corrupt the ld+json tag. The widget should still extract product data from `__NEXT_DATA__` and display starters without calling the Intelligent Search API.

**Acceptance Scenarios**:

1. **Given** ld+json extraction returned no valid product data and `window.__NEXT_DATA__` exists with product information at `props.pageProps.data.product`, **When** the widget attempts the second extraction strategy, **Then** it reads the product data (using `isVariantOf.name` as `productName`, `brand.name` as `brand`, `description`, and `customData.specificationGroups` for attributes with internal property filtering) and builds the starters payload.

2. **Given** `window.__NEXT_DATA__` exists but does not contain recognizable product data (e.g., the page is not a PDP or the data structure is different), **When** the widget reads `__NEXT_DATA__`, **Then** it falls through to the Intelligent Search API fallback without error.

3. **Given** `window.__NEXT_DATA__` contains product data with nested variant/SKU information, **When** extracting, **Then** the widget maps the data to the standard product payload format (`productName`, `description`, `brand`, `attributes`, `linkText`).

4. **Given** `window.__NEXT_DATA__` is not present on the page (e.g., the store is VTEX IO, not FastStore), **When** the widget checks for `__NEXT_DATA__`, **Then** it immediately falls through to the Intelligent Search API without delay.

---

### User Story 3 - Intelligent Search API as Final Fallback (Priority: P1)

When both ld+json and `__NEXT_DATA__` extraction fail to produce valid product data, the widget falls back to the existing behavior: fetching product data from the VTEX Intelligent Search API endpoint (`/api/io/_v/api/intelligent-search/product_search/{slug}`). This ensures backward compatibility and covers edge cases where page-level data sources are unavailable or incomplete.

**Why this priority**: This is the safety net that guarantees the feature works on any VTEX store, regardless of its SEO configuration or storefront technology. Without this fallback, stores missing structured data would lose the PDP starters feature entirely.

**Independent Test**: On a VTEX PDP that has no ld+json Product tag and no `__NEXT_DATA__`, enable `conversationStarters.pdp: true`. The widget should call the Intelligent Search API and display starters as it does today.

**Acceptance Scenarios**:

1. **Given** both ld+json and `__NEXT_DATA__` extraction returned no valid product data, **When** the fallback triggers, **Then** the widget calls the Intelligent Search API with the URL slug and processes the response as before.

2. **Given** the Intelligent Search API returns a valid response, **When** the product is matched and data extracted, **Then** the starters payload is built and sent to the backend, and the user experience is identical to the current behavior.

3. **Given** the Intelligent Search API is unreachable or returns an error, **When** all three strategies have failed, **Then** no starters are displayed and the widget behaves as if the feature is disabled (silent failure).

4. **Given** the extraction waterfall completes (regardless of which strategy succeeded), **When** the product data payload is built, **Then** the payload structure is identical regardless of which source provided the data, ensuring the backend receives a consistent format.

---

### User Story 4 - Updated Account Name Resolution (Priority: P1)

The widget resolves the VTEX account name using a two-source strategy: first from `window.__RUNTIME__?.account` (available on VTEX IO stores), then from `window.VTEX_METADATA?.account` (available on FastStore stores). The previous hostname-based fallback (`window.location.hostname.split('.')[0]`) is removed because it is unreliable for stores using custom domains.

**Why this priority**: The account name is a required field in the product data payload and is used to build the product fingerprint for caching. An incorrect account name leads to cache misses or incorrect starters. Aligning the resolution with the actual VTEX runtime objects for each storefront technology ensures accuracy.

**Independent Test**: On a VTEX IO store, verify `window.__RUNTIME__.account` is used. On a FastStore store, verify `window.VTEX_METADATA.account` is used. On a store with neither object, verify no account is returned (graceful failure).

**Acceptance Scenarios**:

1. **Given** `window.__RUNTIME__` exists and has an `account` property, **When** the widget resolves the account name, **Then** it uses `window.__RUNTIME__.account`.

2. **Given** `window.__RUNTIME__` is not available but `window.VTEX_METADATA` exists with an `account` property, **When** the widget resolves the account name, **Then** it uses `window.VTEX_METADATA.account`.

3. **Given** neither `window.__RUNTIME__` nor `window.VTEX_METADATA` is available, **When** the widget attempts to resolve the account name, **Then** it returns `undefined`/`null`, and the product data extraction gracefully skips starters generation (since account is a required field for the payload).

4. **Given** the account is resolved from any source, **When** the product fingerprint is computed, **Then** it uses the resolved account value in the `account:slug` format, consistent with the existing caching behavior.

---

### Edge Cases

- What happens when ld+json contains a `Product` type nested inside a `WebPage` or `ItemPage`? The parser traverses the `@graph` array or `mainEntity` property to locate the Product object.
- What happens when ld+json has `name` but no `brand` and no `description`? The extraction is considered invalid (minimum threshold: `productName` + at least one of `description` or `brand`), and the widget falls through to `__NEXT_DATA__`.
- What happens when `__NEXT_DATA__` structure changes between FastStore versions? The widget uses defensive property access with optional chaining and validates the presence of key fields before accepting the data.
- What happens when the ld+json product name does not match the Intelligent Search API product name format? The field mapping normalizes names to ensure consistency (e.g., trimming whitespace).
- What happens when all three strategies fail? The widget silently skips starters — no error is shown to the user, consistent with the existing error handling behavior.
- What happens when `VTEX_METADATA.account` and `__RUNTIME__.account` return different values? The widget uses `__RUNTIME__.account` as the primary source since it is the more established and reliable runtime object.
- What happens on a non-VTEX store that has ld+json Product data? The ld+json extraction works regardless of the storefront platform, which is beneficial. The account name resolution may fail, preventing starters from being requested — this is acceptable since the feature targets VTEX stores.
- What happens during SPA navigation when ld+json tags change? On each navigation event, the extraction waterfall runs fresh against the current DOM state, so any updated ld+json tags on the new page are picked up.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST attempt product data extraction in the following order: (1) ld+json structured data, (2) `window.__NEXT_DATA__`, (3) Intelligent Search API. The first strategy that returns valid data wins, and subsequent strategies are skipped.
- **FR-002**: System MUST parse all `<script type="application/ld+json">` tags on the page and identify the one containing a Schema.org `Product` or `ProductGroup` type, including cases where the type is nested in a `@graph` array or `mainEntity` property.
- **FR-003**: System MUST extract `productName` (from `name`), `description`, `brand` (from `brand.name` or `brand`), and `attributes` (from `additionalProperty` or variant-level properties) from the ld+json Product object.
- **FR-004**: System MUST map ld+json `linkText` from the URL slug (same as current behavior) since ld+json does not contain a `linkText` field directly.
- **FR-005**: System MUST check `window.__NEXT_DATA__.props.pageProps.data.product` for product data when ld+json extraction yields no result, looking for known FastStore product data structures.
- **FR-006**: System MUST extract `productName` (from `isVariantOf.name`, falling back to `name`), `description`, `brand` (from `brand.name`), and `attributes` (from `customData.specificationGroups`, applying the same internal property filtering as the IS API path) from `__NEXT_DATA__` using defensive property access to handle varying data shapes across FastStore versions.
- **FR-007**: System MUST fall back to the existing Intelligent Search API call (`/api/io/_v/api/intelligent-search/product_search/{slug}`) when both ld+json and `__NEXT_DATA__` extraction fail.
- **FR-008**: System MUST produce an identical product data payload structure regardless of which extraction strategy succeeds, containing: `account`, `linkText`, `productName`, `description`, `brand`, `attributes`.
- **FR-009**: System MUST resolve the VTEX account name from `window.__RUNTIME__?.account` as the primary source, with `window.VTEX_METADATA?.account` as the secondary source.
- **FR-010**: System MUST NOT fall back to hostname-based account resolution. If neither `__RUNTIME__` nor `VTEX_METADATA` provides an account, the system gracefully skips starters generation.
- **FR-011**: System MUST consider extracted product data valid only when `productName` is present AND at least one of `description` or `brand` is non-empty. If this minimum threshold is not met, the strategy is treated as failed and the next one in the waterfall is attempted.
- **FR-012**: System MUST handle malformed ld+json gracefully — invalid JSON, missing fields, or unexpected schema structures must not throw errors or block subsequent strategies.
- **FR-013**: System MUST handle missing or undefined `window.__NEXT_DATA__` gracefully without throwing errors.
- **FR-014**: System MUST run the full extraction waterfall on every PDP detection, including after SPA navigation events, using the current page's DOM and global objects.
- **FR-015**: System MUST maintain backward compatibility with all existing PDP starters behavior (display, interaction, SPA lifecycle, mobile auto-hide, manual API) — only the data extraction layer changes.
- **FR-016**: System MUST build the SKU-level AI conversation context string (for `service.setContext()`) from whichever extraction strategy succeeds, mapping variant data from ld+json (`offers`, `hasVariant`), `__NEXT_DATA__` (`isVariantOf.skuVariants`, `offers`), or the IS API (`product.items`) to the same context format including SKU name, price, availability, and variant attributes.
- **FR-017**: System MUST produce a functionally equivalent context string regardless of the data source, so the AI can answer variant-specific questions (e.g., pricing, availability per variant) on any VTEX storefront technology.

### Key Entities

- **ProductDataSource**: Represents the origin of product data. Has three possible values: `ld+json`, `__NEXT_DATA__`, or `intelligent-search`. Used internally to track which strategy succeeded for debugging and logging purposes.
- **ProductData**: The normalized product payload sent to the backend for starters generation. Contains `account`, `linkText`, `productName`, `description`, `brand`, `attributes`. Structure is identical regardless of the data source.
- **AccountResolver**: The logic that determines the VTEX account name. Reads from `window.__RUNTIME__.account` (VTEX IO) or `window.VTEX_METADATA.account` (FastStore). Returns `null` if neither is available.

## Clarifications

### Session 2026-04-01

- Q: Which `name` field from `__NEXT_DATA__` maps to `productName`? → A: Use `isVariantOf.name` (product-level name), since caching is product-based, not SKU-based. Fall back to `name` if `isVariantOf` is absent.
- Q: Which field in `__NEXT_DATA__` to use for product attributes? → A: Use `customData.specificationGroups` to mirror the current IS API behavior (`product.properties`), applying the same internal property filtering (e.g., `sellerId`).
- Q: Should ld+json and `__NEXT_DATA__` strategies also build SKU-level AI context? → A: Yes, all three strategies must build the SKU context string for `service.setContext()`, mapping their respective variant/SKU data structures to the same context format.
- Q: What is the minimum set of fields for valid extraction (to skip the next strategy)? → A: `productName` plus at least one of `description` or `brand`. If only `productName` is found with neither description nor brand, fall through to the next strategy.

## Assumptions

- VTEX IO stores using the `structured-data` app render `<script type="application/ld+json">` with Schema.org `Product` or `ProductGroup` on PDP pages. This is the standard configuration for SEO.
- VTEX FastStore stores built on Next.js expose `window.__NEXT_DATA__` with product page props, as is standard for Next.js server-rendered pages.
- The `window.VTEX_METADATA` object on FastStore stores contains an `account` property matching the store's VTEX account name (as documented: `{ account: storeConfig.api.storeId, renderer: 'faststore' }`).
- The ld+json Product schema follows the Schema.org specification, where `name` maps to product name, `brand.name` maps to brand, and `description` maps to description.
- The backend starters generation is agnostic to the data source — it only cares about the product payload structure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On VTEX stores with ld+json structured data present, product data extraction completes without any network request to the Intelligent Search API, reducing extraction latency to under 50ms.
- **SC-002**: On VTEX FastStore stores where ld+json is not available but `__NEXT_DATA__` is, product data extraction completes without any network request, with latency under 50ms.
- **SC-003**: On stores where neither ld+json nor `__NEXT_DATA__` provides product data, the Intelligent Search API fallback produces starters within the same 3-second window defined in the original specification.
- **SC-004**: The product data payload sent to the backend is structurally identical regardless of extraction source — the backend requires zero changes.
- **SC-005**: The account name is correctly resolved on VTEX IO stores (via `__RUNTIME__`) and FastStore stores (via `VTEX_METADATA`), producing accurate product fingerprints for caching.
- **SC-006**: Zero user-visible errors occur when any extraction strategy fails — failures are silent and the waterfall proceeds automatically.
- **SC-007**: All existing PDP starters functionality (compact/full display, SPA lifecycle, mobile auto-hide, manual API, click behavior) continues working identically after the extraction strategy change.
