# Feature Specification: PDP Data Capture Priority & SKU-Specific Context

**Feature Branch**: `005-pdp-data-capture`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "Change PDP product data capture priority order for Conversation Starters generation and populate product context with only the currently selected SKU information"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conversation Starters generated from correct data source priority (Priority: P1)

When a user visits a VTEX Product Detail Page, the system captures product data to generate Conversation Starters using a new priority order: first `window.__NEXT_DATA__`, then Intelligent Search API, and finally `ld+json` structured data. This ensures that the richest and most reliable data source is preferred for generating relevant product questions.

**Why this priority**: This is the core behavioral change. The new priority order reflects the data quality and reliability of each source for question generation. `__NEXT_DATA__` contains the most complete FastStore product data, Intelligent Search provides normalized catalog data, and `ld+json` serves as a universal fallback.

**Independent Test**: Can be fully tested by visiting a VTEX PDP page and verifying that the system attempts data extraction in the correct order, generating Conversation Starters from the first available source.

**Acceptance Scenarios**:

1. **Given** a VTEX PDP page with `window.__NEXT_DATA__` containing valid product data, **When** the system resolves product data, **Then** it uses `__NEXT_DATA__` as the source and does not attempt Intelligent Search or `ld+json` extraction.
2. **Given** a VTEX PDP page where `window.__NEXT_DATA__` is unavailable or invalid, **When** the system resolves product data, **Then** it falls back to Intelligent Search API and does not attempt `ld+json` extraction.
3. **Given** a VTEX PDP page where both `window.__NEXT_DATA__` and Intelligent Search are unavailable, **When** the system resolves product data, **Then** it falls back to `ld+json` structured data as the last resort.
4. **Given** a VTEX PDP page where all three sources fail, **When** the system resolves product data, **Then** no Conversation Starters are generated and no context is set.

---

### User Story 2 - Product context contains only the selected SKU (Priority: P1)

When sending product context to the backend, the system sends only information about the SKU currently being viewed by the user, rather than listing multiple SKUs. The selected SKU ID is determined exclusively from `ld+json` structured data. If `ld+json` does not contain the SKU ID, the system considers the selected SKU unknown and sends only product-level information — `window.__NEXT_DATA__` is never used for SKU resolution.

**Why this priority**: Equally critical as US1. Sending the full catalog of SKUs creates noise in the context. Providing only the currently viewed SKU's details (name, price, availability, variations) makes the AI assistant's responses more relevant and focused on what the user is actually looking at. Using `ld+json` as the sole SKU source simplifies the resolution logic and relies on the structured data standard that is most consistently present across VTEX storefronts.

**Independent Test**: Can be fully tested by visiting a VTEX PDP with a specific SKU selected and verifying the context string contains only that SKU's information when `ld+json` has the SKU ID, or no SKU information when it does not.

**Acceptance Scenarios**:

1. **Given** a VTEX PDP where `ld+json` contains a Product node with a `sku` or `productID` field, **When** the system builds the product context, **Then** the context includes only that specific SKU's details (name, price, availability, variations).
2. **Given** a VTEX PDP where product data was fetched via Intelligent Search or `__NEXT_DATA__`, **When** the system builds the product context, **Then** it still resolves the selected SKU ID from `ld+json` (not from the product data source) and includes only that SKU in the context.
3. **Given** a VTEX PDP where `ld+json` does not contain a `sku` or `productID` field (or `ld+json` is absent entirely), **When** the system builds the product context, **Then** the context includes only product-level information (name, brand, product ID, description, attributes) without any SKU-specific details — regardless of whether `__NEXT_DATA__` has SKU information.
4. **Given** a VTEX PDP where `ld+json` contains a `ProductGroup` with `hasVariant` but no root-level `sku`/`productID`, **When** the system builds the product context, **Then** the context includes only product-level information (no SKU section).

---

### User Story 3 - SKU resolution uses only ld+json (Priority: P2)

The SKU resolution mechanism (determining which SKU the user is currently viewing) uses exclusively `ld+json` to find the SKU ID. This is the single source of truth for SKU identification, regardless of which data source provided the product data for Conversation Starters. `window.__NEXT_DATA__` is never consulted for SKU resolution.

**Why this priority**: This ensures a simple, predictable SKU identification path. `ld+json` is a structured data standard present across VTEX storefronts (both legacy Portal/CMS and FastStore). Using a single source eliminates ambiguity about which source takes precedence and avoids inconsistencies between data sources.

**Independent Test**: Can be tested by simulating a PDP where `ld+json` contains a valid SKU ID and Intelligent Search provides the product data. The context should reflect the SKU from `ld+json`. Conversely, when `ld+json` has no SKU but `__NEXT_DATA__` does, no SKU should appear in context.

**Acceptance Scenarios**:

1. **Given** a PDP where `ld+json` contains a valid `sku` or `productID` field, and Intelligent Search provides the product data, **When** context is built, **Then** the context uses the SKU ID from `ld+json` to filter the Intelligent Search product's items array to that single SKU.
2. **Given** a PDP where `ld+json` is absent or has no `sku`/`productID` field, but `window.__NEXT_DATA__` contains a SKU ID, **When** context is built, **Then** the system does NOT use the `__NEXT_DATA__` SKU — context contains only product-level information.
3. **Given** a PDP where `ld+json` contains a `sku` field and `__NEXT_DATA__` contains a different SKU ID, **When** the system resolves the selected SKU, **Then** it uses the `ld+json` value exclusively.

---

### Edge Cases

- What happens when the user navigates between SKU variants on the same PDP (e.g., selecting a different color)? The system should re-detect and update context upon SPA navigation events if the URL or `ld+json` content changes.
- What happens when `ld+json` contains a `ProductGroup` with `hasVariant` but no root-level `sku`/`productID`? The system should not send any SKU info in context (product-level only).
- What happens when the SKU ID from `ld+json` does not match any item in the product data (e.g., Intelligent Search response)? The system should fall back to product-level context only (no SKU details).
- What happens when `ld+json` is entirely absent from the page? The system should treat SKU as unresolvable and send product-level context only, even if `__NEXT_DATA__` has SKU data.
- What happens when a `ld+json` Product node has no `sku` or `productID` field? The system should treat SKU as unresolvable and send product-level context only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST attempt product data extraction for Conversation Starters in this order: (1) `window.__NEXT_DATA__`, (2) Intelligent Search API, (3) `ld+json` structured data. The first source that yields valid product data is used.
- **FR-002**: System MUST resolve the currently selected SKU ID exclusively from `ld+json` structured data, independently from the product data source used for Conversation Starters.
- **FR-003**: System MUST extract the selected SKU ID from the `ld+json` Product node's `sku` or `productID` field.
- **FR-004**: System MUST NOT use `window.__NEXT_DATA__` for SKU resolution under any circumstances. If `ld+json` does not provide a SKU ID, the selected SKU is considered unknown.
- **FR-005**: System MUST build the product context string containing only the selected SKU's details (name, price, availability, variations) when the SKU ID is known.
- **FR-006**: System MUST build the product context string with product-level information only (name, brand, product ID, description, attributes) and no SKU section when the selected SKU ID cannot be determined.
- **FR-007**: System MUST use the resolved SKU ID to filter the normalized product's `items` array to a single matching item, regardless of which data source provided the product data.
- **FR-008**: System MUST NOT include multiple SKUs in the context string. The context either contains exactly one SKU (the selected one) or zero SKUs (when unresolvable).
- **FR-009**: System MUST continue to send the same `productData` payload structure to the starters service (`getStarters`) — only the extraction priority order changes for starters; the payload shape remains identical.

### Key Entities

- **ProductData** (for starters): Contains `account`, `linkText`, `productName`, `description`, `brand`, `attributes`. Shape unchanged; only the source priority order changes.
- **SelectedSkuId**: A string identifier resolved exclusively from `ld+json`, representing the SKU the user is currently viewing. Used to filter the context. When `ld+json` does not provide this value, the SKU is considered unknown.
- **ProductContext** (for `setContext`): A multi-line string containing product-level info and optionally one SKU's details. Previously contained up to 5 SKUs; now contains 0 or 1.

## Assumptions

- The `ld+json` Product node's `sku` or `productID` field represents the currently displayed SKU on pages that use this standard. This is the sole source of truth for SKU resolution.
- When `ld+json` contains a `ProductGroup` with `hasVariant`, the root-level `sku`/`productID` (if present) indicates the selected variant; otherwise, the selected variant is considered unknown.
- `window.__NEXT_DATA__` is used only for product data extraction (Conversation Starters priority step 1), never for SKU identification.
- The Intelligent Search API response format and endpoint (`/api/io/_v/api/intelligent-search/product_search/{slug}`) remain stable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Conversation Starters are generated using the correct priority order (`__NEXT_DATA__` → Intelligent Search → `ld+json`) on 100% of PDP page visits.
- **SC-002**: Product context sent to the backend contains at most one SKU's details, matching the SKU identified by `ld+json`.
- **SC-003**: When the selected SKU cannot be determined, context contains zero SKU entries and only product-level information.
- **SC-004**: The Conversation Starters payload (`productData`) maintains backward compatibility — no changes to the data shape sent to `getStarters`.
- **SC-005**: All existing PDP detection, slug extraction, and account resolution behaviors remain unchanged.
- **SC-006**: Test coverage for modified functions meets or exceeds 80% for branches, statements, and lines.
