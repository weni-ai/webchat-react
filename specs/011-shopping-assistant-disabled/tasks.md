# Tasks: Back-in-stock only mode (`shoppingAssistantDisabled`)

**Input**: Design documents from `/specs/011-shopping-assistant-disabled/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/init-options.md, quickstart.md

**Tests**: Included. The spec's test strategy names the suites. Jest keeps mocking `@weni/webchat-service`. Write each test so it fails before the implementation task that follows it.

**Organization**: The engineering spec has no user-story headings. The stories below are the acceptance slices: stay disconnected and hidden until an unavailable SKU, keep the form from becoming a conversation, then navigation and the public methods. The peer dependency stays `1.19.2`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root. Tests are colocated under `src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the first TypeScript file buildable, lintable, and covered. No feature behavior yet

- [x] T001 In `package.json`, add devDependencies `typescript` and `@babel/preset-typescript`, change the `lint` script to `eslint src --ext .js,.jsx,.ts,.tsx`, and add `"typecheck": "tsc --noEmit"`. Leave `peerDependencies["@weni/webchat-service"]` at `1.19.2`. Do not add a runtime dependency
- [x] T002 [P] Create `tsconfig.json` with `strict: true`, `noEmit: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `baseUrl: "."`, `paths` mapping `@/*` to `src/*`, `include` of `src/**/*.ts` and `src/**/*.tsx`, and `exclude` of `src/**/*.test.ts` and `src/**/*.test.tsx`
- [x] T003 [P] In `babel.config.js`, add `@babel/preset-typescript` as the last entry of `presets`, so Babel runs it before `@babel/preset-react` and `@babel/preset-env`
- [x] T004 [P] In `jest.config.js`, add `ts` and `tsx` to `moduleFileExtensions` and extend `collectCoverageFrom` from `src/**/*.{js,jsx}` to `src/**/*.{js,jsx,ts,tsx}`. Keep the existing test-file exclusion
- [x] T005 Run `npm install`, then `npm run typecheck` and `npm test`. Both must pass before any feature file is added. `typecheck` has no `.ts` sources yet

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: One function decides the service config, and `ChatProvider` applies it before the service exists

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Add and export `SHOPPING_ASSISTANT_DISABLED_SOCKET_URL = 'wss://shopping-assistant-disabled.invalid'` and `SHOPPING_ASSISTANT_DISABLED_CHANNEL_UUID = 'shopping-assistant-disabled'` in `src/utils/constants.js`
- [x] T007 Write `src/utils/shoppingAssistantMode.test.ts` first, so it fails before T008. Constraints from `data-model.md`: with the flag off, the config is returned unchanged. With `shoppingAssistantDisabled: true`, a missing or empty `socketUrl` becomes `wss://shopping-assistant-disabled.invalid`, a missing or empty `channelUuid` becomes `shopping-assistant-disabled`, and `connectOn` becomes `'manual'` even when the host passed `'mount'` or `'demand'`. A non-empty host `socketUrl` or `channelUuid` is kept. A second call returns the same values
- [x] T008 Implement `applyShoppingAssistantMode` in `src/utils/shoppingAssistantMode.ts` to satisfy T007. Import the two constants from `src/utils/constants.js`. Do not construct the service here
- [x] T009 In `src/contexts/ChatContext.jsx`, default `shoppingAssistantDisabled` to `false`. Call `applyShoppingAssistantMode` on the merged config before `new WeniWebchatService`. When the flag is true: do not apply the `embedded` fullscreen override, start with `isChatOpen` false, do not send `initPayload`, do not start the tooltip timer, and do not restore `isChatOpen` from the session. Expose `isShoppingAssistantDisabled` on the context value. In `propTypes`, add `shoppingAssistantDisabled: PropTypes.bool` and remove `isRequired` from `socketUrl` and `channelUuid`

**Checkpoint**: A flag-on config can construct the mocked service with placeholders and `connectOn: 'manual'`. Story work can start

---

## Phase 3: User Story 1 - Hidden until an unavailable SKU (Priority: P1) 🎯 MVP

**Goal**: With the flag on, the widget never connects and draws nothing until a product page resolves to an unavailable SKU. Then the bubble and launcher appear

**Independent Test**: `npm test -- --testPathPattern='Widget|useConversationStarters' --coverage=false`

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before T012 and T013**

- [x] T010 [P] [US1] Extend `src/components/Widget/Widget.test.jsx`. With `shoppingAssistantDisabled: true` and no `socketUrl` or `channelUuid`, rendering does not throw, the mocked service is constructed with the placeholders and `connectOn: 'manual'`, and `connect`, `sendMessage`, and `simulateMessageReceived` are never called even when `initPayload` and `tooltipMessage` are set. Nothing from the widget is in the DOM while `evaluateBackInStockOffer` returns `isUnavailable: false`. Returning `isUnavailable: true` shows the back-in-stock bubble and the launcher. The opt-in balloon is not rendered. With the flag off, today's render is unchanged
- [x] T011 [P] [US1] Extend `src/hooks/useConversationStarters.test.js`. With the flag on, an available SKU or `isUnavailable: false` leaves `isBackInStockNotify` false and does not call `getStarters`. A thrown `evaluateBackInStockOffer` does not call `getStarters` and records `back_in_stock_evaluate_error` with the SKU. Emitting `connected` does not flush a deferred `getStarters`. An unavailable SKU still sets the offer. Opening the chat with no offer and no `back-in-stock-notify` page closes it

### Implementation for User Story 1

- [x] T012 [US1] In `src/components/Widget/Widget.jsx`, render `WidgetContent` only when `shouldRenderWidgetContent` is true: `!isShoppingAssistantDisabled || isBackInStockNotify || isChatOpenOnNotifyPage`, where `isChatOpenOnNotifyPage` means the chat is open and `currentPage.view === 'back-in-stock-notify'`. Do not render `OptInBalloon` while the flag is on. Remove `isRequired` from the `socketUrl` and `channelUuid` `propTypes` and add `shoppingAssistantDisabled`. Read `isBackInStockNotify` from `useConversationStarters` and `isShoppingAssistantDisabled` from `useChatContext`
- [x] T013 [US1] In `src/hooks/useConversationStarters.js`, when `shoppingAssistantDisabled` is true: do not call `requestStarters` from `detectAndFetchPdp`, and make the `connected` handler return without calling `getStarters`. Read `currentPage` from `useChatContext`. If the flag is on, the chat is open, the offer is inactive, `pendingBackInStockRef` is false, and `currentPage?.view !== 'back-in-stock-notify'`, call `setIsChatOpen(false)`. A thrown evaluator still records `back_in_stock_evaluate_error` and does not request starters

**Checkpoint**: The flag-on widget is invisible on an available SKU, shows the bubble on an unavailable SKU, and never calls `connect` or `getStarters`

---

## Phase 4: User Story 2 - The form does not start a conversation (Priority: P2)

**Goal**: Opening the notify page never shows the connection banner, the input, or the conversation. Closing the form closes the chat. Success has no similar-products action

**Independent Test**: `npm test -- --testPathPattern='Chat.test|BackInStockNotify|Header.test' --coverage=false`

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before T017, T018, and T019**

- [x] T014 [P] [US2] In `src/components/Chat/Chat.test.jsx`, with the flag on and connection status `'disconnected'`, neither `ConnectionStatusBanner` nor `InputBox` renders. With the flag off and that status, both render as they do today
- [x] T015 [P] [US2] In `src/views/BackInStockNotify.test.jsx`, with the flag on, "Not now" calls `setIsChatOpen(false)` and `clearPageHistory` and does not call `sendMessage`. After a valid submit, the success title and description render, and `back_in_stock.wait_prompt` and "Show me similar products" do not. `sendMessage` is never called. With the flag off, "Not now" and the similar-products button keep today's behavior
- [x] T016 [P] [US2] In `src/components/Header/Header.test.jsx`, with the flag on and a current page, the back button calls `setIsChatOpen(false)` and `clearPageHistory` and does not call `goBack`. With the flag off, back still calls `goBack`

### Implementation for User Story 2

- [x] T017 [P] [US2] In `src/components/Chat/Chat.jsx`, when `config.shoppingAssistantDisabled` is true, do not render `ConnectionStatusBanner` or `InputBox`
- [x] T018 [P] [US2] In `src/views/BackInStockNotify.jsx`, when `isShoppingAssistantDisabled` is true, `handleNotNow` calls `setIsChatOpen(false)` and `clearPageHistory()`. The success state omits `back_in_stock.wait_prompt` and the "Show me similar products" button. Do not add a string and do not edit `src/i18n/locales/en.json` or any Crowdin locale file
- [x] T019 [P] [US2] In `src/components/Header/Header.jsx`, when `config.shoppingAssistantDisabled` is true, the back button calls `setIsChatOpen(false)` and `clearPageHistory()` instead of `goBack`

**Checkpoint**: The notify page can be submitted and dismissed without a conversation, a message, or a connection banner

---

## Phase 5: User Story 3 - Navigation and the public methods (Priority: P3)

**Goal**: A route change clears the offer and closes an open chat. `WebChat.send` and `WebChat.setConversationStarters` do nothing in this mode, and a config that can never show warns once

**Independent Test**: `npm test -- --testPathPattern='useConversationStarters|standalone|conversationStartersLog' --coverage=false`

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before T023, T024, and T025**

- [x] T020 [US3] Extend `src/hooks/useConversationStarters.test.js`. With the flag on and the chat open, a pathname change calls `setIsChatOpen(false)` and `clearPageHistory`, then evaluates the new product. The `init` starter event detail includes `shoppingAssistantDisabled: true` beside `connectOn`
- [x] T021 [P] [US3] Create `src/standalone.test.ts`. `init` without the flag passes `socketUrl`, `channelUuid`, and `connectOn` through to the mocked service and sets `shoppingAssistantDisabled: false`. `init` with the flag and no connection values does not throw; the service receives the placeholders and `connectOn: 'manual'`. `init` with the flag and without `unavailableProductNotify` or `conversationStarters.pdp` logs `console.warn('WebChat: shoppingAssistantDisabled needs unavailableProductNotify and conversationStarters.pdp')`. After that `init`, `send` and `setConversationStarters` return without calling the service and log `console.warn('WebChat.send: shopping assistant is disabled')` and `console.warn('WebChat.setConversationStarters: shopping assistant is disabled')`. Do not import `mapConfig`
- [x] T022 [P] [US3] Extend `src/utils/conversationStartersLog.test.js`. After `setConversationStartersLogConfig({ shoppingAssistantDisabled: true, connectOn: 'manual' })`, `getConversationStartersLog().config` includes `shoppingAssistantDisabled: true` beside `connectOn`

### Implementation for User Story 3

- [x] T023 [US3] In `src/hooks/useConversationStarters.js`, when the flag is on and `applyNavigationChange` runs while the chat is open, call `setIsChatOpen(false)` and `clearPageHistory()` before detecting the new product. Add `shoppingAssistantDisabled: config?.shoppingAssistantDisabled === true` to the existing `init` event detail next to `connectOn`. Depends on T013 and T020
- [x] T024 [US3] In `src/standalone.jsx`, map `shoppingAssistantDisabled: params.shoppingAssistantDisabled || false` inside `mapConfig` and keep `mapConfig` unexported. Store the flag in a module variable from `init`. Warn with the exact string from T021 when the flag is on and `unavailableProductNotify` or `conversationStarters.pdp` is off. `send` and `setConversationStarters` return immediately with their exact warnings while the flag is on. Depends on T021
- [x] T025 [US3] In `src/utils/conversationStartersLog.js`, store `shoppingAssistantDisabled` in `logConfig` and include it on the `config` object returned by `getConversationStartersLog`, next to `connectOn`. Depends on T022

**Checkpoint**: Route changes, `send`, and `setConversationStarters` cannot open a conversation in this mode, and the log shows the flag

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Document the option and run the full gate

- [x] T026 [P] In `src/index.jsx`, add a commented example of the back-in-stock only config: `shoppingAssistantDisabled: true`, `unavailableProductNotify: true`, and `conversationStarters: { pdp: true }`, with `socketUrl` and `channelUuid` omitted
- [x] T027 [P] Create `CHANGELOG.md` if it is absent, in Keep a Changelog format, with a single Unreleased Added entry for the `shoppingAssistantDisabled` init option. Do not backfill older releases. State that `socketUrl` and `channelUuid` are optional only when the option is true, and that `embedded` and `startFullScreen` are ignored at startup in this mode
- [x] T028 Run `npm run typecheck`, `npm run lint`, and `npm test -- --coverage`. All four coverage metrics stay at or above 80%
- [ ] T029 Follow `specs/011-shopping-assistant-disabled/quickstart.md`: `npm run dev` with the commented config, confirm no WebSocket and no launcher on an available SKU, then the bubble, the form, the reduced success, and a route change on an unavailable SKU

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T005 waits for T001 through T004
- **Foundational (Phase 2)**: Depends on T005. BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational only. Independent of User Story 1
- **User Story 3 (Phase 5)**: T020 and T023 depend on User Story 1, because they edit `src/hooks/useConversationStarters.js` and its test after T011 and T013. T021, T022, T024, and T025 depend on Foundational only
- **Polish (Phase 6)**: T028 and T029 after the stories you ship. T026 and T027 can be written any time after Foundational

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2 or US3
- **User Story 2 (P2)**: No dependency on US1. The form still needs an offer from US1 to be reachable in the browser
- **User Story 3 (P3)**: The navigation half needs the US1 hook. The standalone methods and the log do not

### Within Each User Story

- The failing test task is done before the implementation task in that story
- T012 and T013 can run together after T010 and T011
- T017, T018, and T019 can run together after T014, T015, and T016

### Parallel Opportunities

- T002, T003, and T004 touch different files and can run together
- After Foundational, US1 (widget and hook) and US2 (chat, view, header) can run together
- T021 and T022 can run beside US2. They do not touch the hook
- T020 cannot run beside T011 or T013. It edits the same hook test and follows the hook implementation

---

## Parallel Example: User Story 1 and User Story 2

```bash
# After T009, different files:
Task: "T010 src/components/Widget/Widget.test.jsx"
Task: "T011 src/hooks/useConversationStarters.test.js"
Task: "T014 src/components/Chat/Chat.test.jsx"
Task: "T015 src/views/BackInStockNotify.test.jsx"
Task: "T016 src/components/Header/Header.test.jsx"

# Then, still different files:
Task: "T012 src/components/Widget/Widget.jsx"
Task: "T013 src/hooks/useConversationStarters.js"
Task: "T017 src/components/Chat/Chat.jsx"
Task: "T018 src/views/BackInStockNotify.jsx"
Task: "T019 src/components/Header/Header.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete User Story 1
3. Stop and run `npm test -- --testPathPattern='Widget|useConversationStarters' --coverage=false`
4. US1 alone still shows "Show me similar products" after submit. The usable opt-in is US1 plus US2

### Incremental Delivery

1. Setup makes `tsc`, Jest, and ESLint accept `.ts`
2. Foundational fills placeholders and forces `connectOn: 'manual'`
3. User Story 1 hides the widget until an unavailable SKU and never connects
4. User Story 2 stops the form from opening a conversation
5. User Story 3 covers route changes, `WebChat.send`, `WebChat.setConversationStarters`, and the log
6. T029 is the manual storefront check. It needs US1 and US2, and a product page

### Parallel Team Strategy

1. One person finishes Setup and Foundational
2. Then one person takes the widget and hook (US1, then the navigation half of US3)
3. Another takes the chat shell, the notify view, and the header (US2), and can also take `standalone.jsx` and the log

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to the acceptance slice above
- Do not export `mapConfig` from `src/standalone.jsx`. A named export changes the UMD global and breaks `window.WebChat.init` (`research.md`)
- Do not edit `src/i18n/locales/`
- Do not change `@weni/webchat-service` or its peer version
- Commit after each task or logical group
