# Tasks: PDP Conversation Starters

**Input**: Design documents from `/specs/003-pdp-conversation-starters/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/public-api.md, quickstart.md

**Tests**: Included — constitution mandates 80% coverage for statements, branches, functions, and lines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration plumbing, i18n keys, and file scaffolding

- [X] T001 Add `conversationStarters` to `mapConfig` and PropTypes in src/standalone.jsx (pass `conversationStarters` object through to config). In src/contexts/ChatContext.jsx: add `conversationStarters: undefined` to `defaultConfig` and add `conversationStarters` to `ChatProvider.propTypes` as `PropTypes.shape({ pdp: PropTypes.bool })`
- [X] T002 [P] Add conversation starters i18n keys to src/i18n/locales/en.json, src/i18n/locales/pt.json, and src/i18n/locales/es.json (keys: `conversation_starters.aria_label`, `conversation_starters.send_question`)
- [X] T003 [P] Create directory structure: src/components/ConversationStarters/, src/utils/vtex.js, src/utils/navigationMonitor.js, src/hooks/useConversationStarters.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Utility modules and UI components that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement VTEX PDP detection utilities in src/utils/vtex.js: `isVtexPdpPage()` (regex `/\/[^/]+\/p\/?$/`), `extractSlugFromUrl()`, `getVtexAccount()` (reads `window.__RUNTIME__?.account` with hostname fallback)
- [X] T005 Implement VTEX product data extraction in src/utils/vtex.js: `fetchProductData(slug)` (calls VTEX Intelligent Search API at `/api/io/_v/api/intelligent-search/product_search/{slug}`), `selectProduct(products, slug)` (match by `linkText` or fallback to first), `extractProductData(product, account)` (builds StartersData object), `filterInternalProperties(properties)` (excludes `sellerId`, `commercialConditionId`, `cluster_highlights`, `allSpecifications`, `allSpecificationsGroups`). Note: same file as T004 — must run sequentially after T004
- [X] T006 [P] Implement SPA navigation monitor in src/utils/navigationMonitor.js: `createNavigationMonitor(onNavigate)` returning `{ start(), stop() }`. Listens for `vtex:pageView` messages, patches `history.pushState`/`replaceState`, listens for `popstate`. Cleanup restores original History API methods and removes all listeners
- [X] T007 Implement `ConversationStarterButton` component in src/components/ConversationStarters/ConversationStarterButton.jsx and src/components/ConversationStarters/ConversationStarterButton.scss. Reuses `Button` component. Two variants via `variant` prop: `compact` (dark bg `#272B2F`, white text, pill shape `9999px`) and `full` (transparent bg, `--weni-main-color` border, pill shape `9999px`). Text truncated to 2 lines with ellipsis. Uses `react-i18next` for `aria-label`. SCSS must use `$spacing-*` design tokens for all padding, margins, and gaps (e.g., `$spacing-2` for gaps, `$spacing-3` for padding). Only `9999px` pill radius and color hex values are exempt from token rule per constitution
- [X] T008 Implement `ConversationStarters` container component in src/components/ConversationStarters/ConversationStarters.jsx and src/components/ConversationStarters/ConversationStarters.scss. Two exported sub-components: `ConversationStartersCompact` (accepts `questions`, `onStarterClick`, `isVisible`, `isHiding` props; renders vertical list of compact buttons with `weni-slide-in`/`weni-slide-out` animations; max-width `var(--weni-widget-width, 360px)`) and `ConversationStartersFull` (accepts `questions`, `onStarterClick` props; renders list of full-variant buttons). SCSS must use `$spacing-*` design tokens for all spacing values (gaps, margins, padding)

**Checkpoint**: Foundation ready — utilities, navigation monitor, and UI components are all available for user story integration

---

## Phase 3: User Story 1 — Automatic PDP Conversation Starters (Priority: P1) MVP

**Goal**: Detect VTEX PDP pages, extract product data, request AI-generated starters via WebSocket, and display them as floating buttons (compact) and inside the chat (full)

**Independent Test**: Navigate to a VTEX PDP with `conversationStarters.pdp: true`. Starters appear above the launcher. Click one — chat opens and question is sent.

### Implementation for User Story 1

- [X] T009 [US1] Implement `useConversationStarters` hook in src/hooks/useConversationStarters.js — core state management: `questions`, `source`, `fingerprint`, `isLoading`, `isCompactVisible`, `isDismissed`. Expose: `handleStarterClick(question)`, `setManualStarters(questions)`, `clearStarters()`. Wire up `service.on('starters:received')` and `service.on('starters:error')` event listeners. On `starters:received`: set questions, set `isCompactVisible = true`, set `isLoading = false`. On `starters:error`: set `isLoading = false` silently
- [X] T010 [US1] Add PDP auto-detection flow to `useConversationStarters` hook in src/hooks/useConversationStarters.js — on mount (and when `config.conversationStarters?.pdp` is true): call `isVtexPdpPage()`, if PDP then `extractSlugFromUrl()` → `fetchProductData(slug)` → `extractProductData(product, account)` → `service.getStarters(productData)`. Handle VTEX API errors silently. Check `service.isConnected()` before calling `getStarters()`; if not connected, defer until connection via `service.on('connected')` listener
- [X] T011 [US1] Add click handling to `useConversationStarters` hook in src/hooks/useConversationStarters.js — `handleStarterClick(question)`: if chat is open, call `sendMessage(question)` directly and set `isDismissed = true`; if chat is closed, store question in `pendingStarterRef.current`, call `setIsChatOpen(true)`, and add a `useEffect` on `isChatOpen` + `isConnected` that sends the pending message and clears the ref (race condition pattern from research R8)
- [X] T012 [US1] Integrate compact variant into Widget in src/components/Widget/Widget.jsx — import `useConversationStarters` and `ConversationStartersCompact`. Render `<ConversationStartersCompact>` between `<Chat />` and `<Launcher />` in `WidgetContent`, conditionally when `questions.length > 0 && isCompactVisible && !isChatOpen && !isDismissed`. Pass `onStarterClick={handleStarterClick}`
- [X] T013 [US1] Integrate full variant into MessagesList in src/components/Messages/MessagesList.jsx — import `useConversationStarters` and `ConversationStartersFull`. Render `<ConversationStartersFull>` at the bottom of the messages section (after message groups, before the scroll anchor) with `margin-top: auto` so it pushes to the bottom when few messages exist. Render when `questions.length > 0 && !isDismissed`, including when `messageGroups.length > 0` (starters appear alongside existing conversation). Pass `onStarterClick={handleStarterClick}`
- [X] T014 [US1] Wire up starters state in src/contexts/ChatContext.jsx — add `starters:received` and `starters:error` event listeners to the service setup `useEffect`. Export starters-related state and methods from the context value so `useConversationStarters` hook can access the service instance and chat state (`isChatOpen`, `isConnected`, `sendMessage`, `config`)

**Checkpoint**: At this point, automatic PDP starters work end-to-end on a single page load — compact and full variants render, clicking sends a message. SPA navigation and SKU context are not yet handled.

---

## Phase 4: User Story 2 — SPA Navigation and Page-Specific Lifecycle (Priority: P1)

**Goal**: Clear starters on page navigation, re-detect on new PDP pages, handle VTEX IO and History API navigation

**Independent Test**: Navigate between product pages and non-product pages. Starters refresh per-product and disappear on non-PDP pages.

### Implementation for User Story 2

- [X] T015 [US2] Integrate navigation monitor into `useConversationStarters` hook in src/hooks/useConversationStarters.js — call `createNavigationMonitor(onNavigate)` on mount. In `onNavigate` callback: call `service.clearStarters()`, reset all starters state (questions, source, fingerprint, isLoading, isCompactVisible, isDismissed), then re-run PDP detection for the new URL. Call `monitor.stop()` on cleanup
- [X] T016 [US2] Implement stale response prevention in src/hooks/useConversationStarters.js — maintain a `currentFingerprintRef` that updates on each PDP detection. In the `starters:received` handler, compare the received fingerprint against `currentFingerprintRef.current`; discard the response if they don't match (handles the case where user navigated away before response arrived). Note: this is a defense-in-depth layer; the service already discards stale responses via its internal fingerprint, but this client-side guard protects against edge cases where timing differs

**Checkpoint**: Starters now correctly refresh across SPA navigation, including product-to-product, product-to-non-product, and back/forward navigation.

---

## Phase 5: User Story 3 — SKU-Level Context Setting (Priority: P1)

**Goal**: Set the currently selected SKU's information as conversation context; update when variant changes; clear on navigation away

**Independent Test**: On a PDP, select different SKU variants and ask variant-specific questions. AI responds with information matching the selected SKU.

### Implementation for User Story 3

- [X] T017 [P] [US3] Implement SKU extraction utilities in src/utils/vtex.js: `getSelectedSku(product)` (multi-strategy: URL `skuId` param → `window.__RUNTIME__` state → first available item from `product.items`), `buildSkuContextString(product, sku)` (formats SKU data as natural-language string per data-model.md: product name, brand, variant, price, availability, image, specifications)
- [X] T018 [US3] Implement SKU context management in `useConversationStarters` hook in src/hooks/useConversationStarters.js — after product data is fetched: call `getSelectedSku(product)` → `buildSkuContextString(product, sku)` → `service.setContext(contextString)`. On navigation away from PDP: call `service.setContext('')` to clear product context
- [X] T019 [US3] Implement SKU change detection in src/hooks/useConversationStarters.js — set up a debounced (300ms) observer that monitors for SKU selection changes: listen for URL query parameter changes (`skuId`) via the navigation monitor, and optionally use a `MutationObserver` on the SKU selector area. On change: re-extract selected SKU and update context via `service.setContext()`

**Checkpoint**: AI responses now reflect the currently selected SKU variant. Context updates when the user changes variants and clears on navigation.

---

## Phase 6: User Story 4 — Mobile-Specific Floating Behavior (Priority: P2)

**Goal**: Auto-hide floating starters on mobile after 5 seconds; starters remain accessible inside the chat

**Independent Test**: Load a PDP on mobile viewport. Floating starters appear, auto-hide after 5s. Open chat — starters visible inside conversation.

### Implementation for User Story 4

- [X] T020 [US4] Implement mobile auto-hide logic in src/hooks/useConversationStarters.js — on `starters:received`: check `window.matchMedia('(max-width: 768px)')`. If mobile: start a 5-second timeout that sets `isCompactVisible = false` (with `isHiding = true` briefly for the fade-out animation class). Cancel the timer on starter click, navigation, or component unmount. Desktop: no auto-hide
- [X] T021 [US4] Add fade-out animation support to src/components/ConversationStarters/ConversationStarters.scss — when `isHiding` is true, apply the `weni-slide-out` animation (250ms) to the compact container. After animation completes, the component is hidden via `isCompactVisible = false`

**Checkpoint**: Mobile floating starters auto-hide after 5 seconds. Desktop starters remain visible. Full variant always accessible inside chat.

---

## Phase 7: User Story 5 — Manual Conversation Starters API (Priority: P2)

**Goal**: Expose `WebChat.setConversationStarters(questions)` public API for programmatic starters

**Independent Test**: Call `WebChat.setConversationStarters(["Q1?", "Q2?"])` after init. Starters appear. Call again with new questions — old ones replaced.

### Implementation for User Story 5

- [X] T022 [US5] Implement `setConversationStarters` function in src/standalone.jsx — guard: if called before `WebChat.init()` (i.e., `widgetInstance` is null), silently ignore the call. Validate input (must be array of 1–3 non-empty strings; silently ignore invalid input with `console.warn` in dev). Call `service.setManualStarters(questions)` via a custom `starters:set-manual` event on the service (since the service extends EventEmitter3, use `service.emit('starters:set-manual', questions)`). Add to the `WebChat` export object
- [X] T023 [US5] Implement manual starters ingestion in `useConversationStarters` hook in src/hooks/useConversationStarters.js — listen for `service.on('starters:set-manual', handler)` (custom event emitted by standalone.jsx in T022). Handler: set questions, set `source = 'manual'`, set `fingerprint = null`, set `isCompactVisible = true`, set `isDismissed = false`, set `isLoading = false`. If mobile, start auto-hide timer. Clean up listener on unmount with `service.off('starters:set-manual', handler)`
- [X] T024 [US5] Handle manual-to-auto transition in src/hooks/useConversationStarters.js — when navigation occurs and `config.conversationStarters?.pdp` is true: always clear manual starters and re-run PDP auto-detection (manual starters do not survive navigation when PDP mode is enabled)

**Checkpoint**: Manual API works for any page. Auto-detection takes over on navigation when PDP mode is enabled. Starters from both sources render identically.

---

## Phase 8: User Story 6 — Conversation Starters Appearance State Management (Priority: P2)

**Goal**: Proper visibility lifecycle across interactions: dismiss on click, fresh starters per product, discard stale responses

**Independent Test**: Click a starter on Product A, navigate to Product B, navigate back to Product A. Fresh starters appear each time.

### Implementation for User Story 6

- [X] T025 [US6] Implement dismissed state reset on navigation in src/hooks/useConversationStarters.js — in the `onNavigate` callback: reset `isDismissed = false` alongside other state resets. This ensures starters for a new product appear fresh even if the user dismissed starters on the previous product
- [X] T026 [US6] Verify starters-alongside-conversation behavior in src/components/Messages/MessagesList.jsx — confirm that the `ConversationStartersFull` placement from T013 (bottom of messages with `margin-top: auto`) works correctly when `messageGroups.length > 0`. If the user navigated from a different product and has conversation history, starters for the new product should appear below the last message group. No new placement logic needed (handled in T013); this task verifies the behavior and adjusts styling if needed
- [X] T027 [US6] Verify connection-aware starters request works with `connectOn: 'demand'` in src/hooks/useConversationStarters.js — confirm that the deferred connection logic from T010 (storing product data in a ref and sending `getStarters()` on `service.on('connected')`) handles the demand-connect scenario correctly. Add cleanup of the `connected` listener on navigation or unmount if not already present. Note: core deferral logic is implemented in T010; this task validates and extends cleanup only

**Checkpoint**: State management is robust. Starters appear fresh per-product, dismissed state doesn't leak between pages, deferred requests work with demand-connect.

---

## Phase 9: Tests

**Purpose**: Achieve 80% minimum coverage for statements, branches, functions, and lines

- [X] T028 [P] Write unit tests for VTEX utilities in src/utils/vtex.test.js — test `isVtexPdpPage()` with PDP and non-PDP URLs, `extractSlugFromUrl()`, `getVtexAccount()` with and without `__RUNTIME__`, `fetchProductData()` with mocked fetch (success, error, empty), `selectProduct()` with exact match and fallback, `extractProductData()`, `filterInternalProperties()` with internal and valid properties, `getSelectedSku()` with URL param/fallback, `buildSkuContextString()` output format
- [X] T029 [P] Write unit tests for navigation monitor in src/utils/navigationMonitor.test.js — test `createNavigationMonitor()` start/stop lifecycle, `vtex:pageView` message detection, `history.pushState` interception, `history.replaceState` interception, `popstate` event, cleanup restores original History methods, multiple start/stop cycles
- [X] T030 [P] Write unit tests for `useConversationStarters` hook in src/hooks/useConversationStarters.test.js — test hook initialization with PDP config enabled/disabled, `starters:received` event updates state, `starters:error` event handles silently, `handleStarterClick` sends message when chat open, `handleStarterClick` defers message when chat closed (pending ref pattern), `clearStarters()` resets state, `setManualStarters()` sets questions with correct source, navigation clears starters and re-detects, mobile auto-hide timer behavior, SKU context is set on PDP load, stale fingerprint responses are discarded. Mock: service instance, `window.location`, `window.__RUNTIME__`, `fetch`, `window.matchMedia`
- [X] T031 [P] Write unit tests for ConversationStarters components in src/components/ConversationStarters/ConversationStarters.test.jsx — use the centralized `react-i18next` mock via `jest.config.js` `moduleNameMapper` (at `test/__mocks__/react-i18next.js`). Test `ConversationStarterButton` renders compact and full variants with correct styles, `ConversationStartersCompact` renders questions list with correct props, `ConversationStartersCompact` applies `weni-slide-in` animation class, `ConversationStartersCompact` applies `weni-slide-out` class when `isHiding`, `ConversationStartersFull` renders questions with primary color border, click handler calls `onStarterClick` with correct question text, text truncation (2 lines with ellipsis), accessibility: buttons have `aria-label` via `t()` function
- [X] T032 Verify test coverage meets 80% minimum for all metrics (statements, branches, functions, lines) by running `npm test -- --coverage` and checking the report for src/utils/vtex.js, src/utils/navigationMonitor.js, src/hooks/useConversationStarters.js, src/components/ConversationStarters/

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Example file, final validation, and cleanup

- [X] T033 [P] Create test HTML example file at examples/conversation-starters-test.html — manual starters test page (similar to examples/voice-mode-test.html). Include config panel, `setConversationStarters` test buttons, instructions
- [X] T034 Run quickstart.md Scenario 2 (manual starters) validation against the example HTML file — verify starters appear, replace on second call, click sends message
- [X] T035 Code cleanup: verify no trailing whitespace, all files under 350 lines, no `console.log` in production code (only `console.warn` for invalid manual API input in dev), remove any TODO comments added during development

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — core PDP flow (MVP)
- **US2 (Phase 4)**: Depends on US1 — adds navigation to existing hook
- **US3 (Phase 5)**: Depends on US1 — adds SKU context to existing hook
- **US4 (Phase 6)**: Depends on US1 — adds mobile behavior to existing hook
- **US5 (Phase 7)**: Depends on US1 — adds manual API pathway
- **US6 (Phase 8)**: Depends on US1 + US2 — refines state management with navigation
- **Tests (Phase 9)**: Depends on all user story phases
- **Polish (Phase 10)**: Depends on Tests

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **US2 (P1)**: Depends on US1 (extends the hook with navigation logic)
- **US3 (P1)**: Depends on US1 (extends the hook with SKU context logic); can run in parallel with US2
- **US4 (P2)**: Depends on US1 (extends the hook with mobile auto-hide); can run in parallel with US2/US3
- **US5 (P2)**: Depends on US1 (extends standalone.jsx + hook with manual API); can run in parallel with US2/US3/US4
- **US6 (P2)**: Depends on US1 + US2 (refines state management that uses navigation)

### Within Each User Story

- Utilities/models before hook logic
- Hook logic before component integration
- Component integration before UI refinements

### Parallel Opportunities

- T002 and T003 can run in parallel with T001 (different files)
- T004 → T005 must run sequentially (same file: src/utils/vtex.js); T006 can run in parallel with T004+T005 (different file)
- US3, US4, US5 can run in parallel after US1 (different concerns in different parts of the hook)
- All test tasks (T028–T031) can run in parallel (different test files)
- T033 can run in parallel with tests

---

## Parallel Example: Foundational Phase

```bash
# T004 → T005 are sequential (same file), T006 runs in parallel with them:
Task T004+T005: "Implement VTEX utilities in src/utils/vtex.js" (sequential)
Task T006: "Implement SPA navigation monitor in src/utils/navigationMonitor.js" (parallel)
```

## Parallel Example: After US1 Completion

```bash
# These can run simultaneously (different concerns):
Task T015: "[US2] Integrate navigation monitor into hook"
Task T017: "[US3] Implement SKU extraction utilities"
Task T020: "[US4] Implement mobile auto-hide logic"
Task T022: "[US5] Implement setConversationStarters in standalone.jsx"
```

## Parallel Example: Tests

```bash
# All tests can run simultaneously:
Task T028: "Write unit tests for VTEX utilities"
Task T029: "Write unit tests for navigation monitor"
Task T030: "Write unit tests for useConversationStarters hook"
Task T031: "Write unit tests for ConversationStarters components"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test on a VTEX PDP — starters appear, click sends message
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy (MVP: starters on single PDP load)
3. Add US2 → Test independently → Deploy (SPA navigation support)
4. Add US3 → Test independently → Deploy (SKU-aware AI context)
5. Add US4 + US5 + US6 → Test independently → Deploy (mobile, manual API, state management)
6. Add Tests + Polish → Final validation → Release

### Parallel Team Strategy

With multiple developers after US1:

- Developer A: US2 (navigation) → US6 (state management)
- Developer B: US3 (SKU context) → Tests
- Developer C: US4 (mobile) + US5 (manual API) → Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable (after US1 as foundation)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All starters errors are silent — never show errors to the end user
- The `useConversationStarters` hook is the central integration point — most user stories extend it incrementally
