# Engineering Specification: Open back-in-stock page

**Repository**: webchat-react — frontend

**Feature Branch**: `009-open-back-in-stock-page`

**Created**: 2026-10-29

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: While the "Notify me when back in stock" bubble is the active offer, opening the chat lands on the conversation. The shopper only reaches the notify form by clicking that bubble. The chat should open on the back-in-stock page, and the back control should return to the conversation.
- Acceptance criteria:
  - While the back-in-stock offer is active and the chat is closed, opening the chat shows the back-in-stock page for that product, with the same product name, SKU, and seller the bubble click already passes.
  - The header back control on that page returns to the conversation. The conversation stays for the rest of that open session. The widget does not open the back-in-stock page again until the chat is closed and opened once more while the offer is still active.
  - Clicking the bubble still opens the chat on the back-in-stock page.
  - Opening the chat when the back-in-stock offer is not active still shows the conversation. That includes an available SKU, the notify feature turned off, a page that is not a product page, ordinary conversation starters, and the WhatsApp offers balloon.
  - Leaving the product, or any reset that clears the offer, means a later open shows the conversation.

## Scope in This Repository

**This repository implements**: The closed-to-open landing while the back-in-stock offer is the current starter. The existing back control already pops a single page and reveals the conversation. This slice makes that page the first screen on open.

**Out of scope here**:

- The notify form, its validation, the availability request, and the success state. Those already live in `BackInStockNotify`.
- How the host decides a SKU is unavailable, and the `unavailableProductNotify` flag. This slice only changes where the chat opens once the offer is already active.
- The WhatsApp offers balloon, ordinary conversation starters, and sending a starter as a message.
- Auto-opening the form when the offer becomes active while the chat is already open. The shopper stays in the conversation until they click the bubble or close and open the chat.
- Remembering that the shopper pressed back, across a later open. Each open while the offer is active starts on the back-in-stock page again.

**Depends on**: nothing from another repository. Product name, SKU, and seller are already held by the conversation-starters hook. No peer-dependency bump.

This change persists nothing. There is no schema, migration, or stored preference.

## Current State

- `src/hooks/useConversationStarters.js` — `showBackInStockNotify` sets `isBackInStockNotify`, the product name, the SKU and seller refs, and the single question `back_in_stock.notify_me_cta` ("Notify me when back in stock"). `handleBackInStockClick` opens `view: 'back-in-stock-notify'` when the chat is already open. When the chat is closed, it sets `pendingBackInStockRef` and calls `setIsChatOpen(true)`. A later effect opens the page only when that pending flag is set. Opening the chat from the launcher leaves the flag false, so the conversation is what the shopper sees.
- `src/contexts/ChatContext.jsx` — `pushPage` appends a view. `goBack` clears the history when it holds one page, which is the conversation (`currentPage` null).
- `src/components/Header/Header.jsx` — the back button renders when `currentPage` is set and calls `goBack`.
- `src/components/Chat/Chat.jsx` — `currentPage.view === 'back-in-stock-notify'` renders `BackInStockNotify` and hides the composer.
- `src/views/BackInStockNotify.jsx` — success and "show similar products" call `clearPageHistory`, which returns to the conversation. Those exits stay as they are.
- `src/hooks/useConversationStarters.test.js` — covers the bubble click while open, and the click-while-closed path that waits for `isChatOpen` before calling `setCurrentPage`. It does not cover a launcher open while the offer is active.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/hooks/useConversationStarters.js` | modified | On the closed-to-open transition, if the back-in-stock offer is active, open the notify page once. |
| `src/hooks/useConversationStarters.test.js` | modified | Assert the launcher open, the single push per open, the bubble click, and the cases that stay on the conversation. |

### Flow

1. The offer is active when `isBackInStockNotify` is true. That includes the compact chip after it auto-hides. Navigation away and `resetStartersState` already clear the flag.
2. The shopper opens a closed chat by the launcher, or by clicking the bubble. The bubble path may still set `pendingBackInStockRef`. Both paths share one landing rule.
3. When `isChatOpen` changes from false to true and the offer is active, call `openBackInStockPage` once with the product name, SKU, and seller already stored for the bubble click. Clear `pendingBackInStockRef` so the pending effect does not push the same view again. `pushPage` also ignores a second push of the same view.
4. The page history then holds only the notify page. Header back calls `goBack`, the history becomes empty, and `Chat` renders the conversation. The hook does not subscribe to back and does not push again while `isChatOpen` stays true.
5. Closing the chat and opening it again, while the offer is still active, repeats step 3.
6. If the chat is already open when the offer becomes active, this transition does not run. The in-chat bubble click keeps calling `openBackInStockPage` immediately.
7. If the offer is not active, the existing open effect is unchanged: a pending WhatsApp page or a pending starter message may still run, and a plain open stays on the conversation.

### Rejected Alternatives

- Opening the page whenever `isBackInStockNotify` is true, including while the chat stays open: after back, or after the form clears the history on success, a later render would cover the conversation again.
- Remembering the back press for the rest of the visit: the request is a default landing on each open, and back is how the shopper reaches the conversation during that open.
- A new back target or a second conversation route: `goBack` on a one-page history already reveals the conversation. A new route would duplicate that screen.
- Navigating from `Chat` by reading starter state: the offer, the product fields, and the page opener already live in the starters hook. `Chat` only renders `currentPage`.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `window.WebChat` and package exports | unchanged | none | yes |
| `setCurrentPage` / `goBack` | unchanged | none | yes |
| Chat open while the back-in-stock offer is active | modified (lands on the notify page) | patch | yes — the conversation remains one back press away; no option or event is removed |

**Consumers affected**: shoppers on a product page with the notify bubble. Hosts do not gain or lose an init option. Changelog lists the behavior under Changed. No deprecation.

## Non-Functional Requirements

### Peak Load

One shopper opening the widget once on a campaign-day product page. The landing is one in-memory page push. It adds no request.

### Observability

No new log and no new correlation identifier. The existing `divert_back_in_stock` starter event still records that the offer replaced starters. The landing does not log the product name, SKU, or seller.

### Failure Handling

`openBackInStockPage` already returns when `setCurrentPage` is missing. A missing product name still opens the page with an empty name, matching the bubble click. There is no network call, timeout, or retry on this path. Pushing the page twice in one transition is idempotent because `pushPage` drops a duplicate of the current view, and the hook pushes only on the closed-to-open edge.

### Security and Authorization

No new input crosses the trust boundary. The page receives the product name, SKU, and seller the hook already holds from the product page. This repository does not authorize the notify submission here. No new secret.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| Opening a closed chat while the offer is active shows the notify page with the stored product, SKU, and seller | `useConversationStarters.test.js`: resolve an unavailable SKU so `isBackInStockNotify` is true, then set `isChatOpen` from false to true without calling the click handler. Expect `setCurrentPage` with `view: 'back-in-stock-notify'` and the Cool Shoe props the click test already expects. |
| Back stays on the conversation for that open | After that expectation, rerender while `isChatOpen` stays true and expect `setCurrentPage` not to be called again. `goBack` in `ChatContext` already clears a one-page history; this spec does not change it. |
| A later open lands on the page again | Set `isChatOpen` back to false, then to true, and expect `setCurrentPage` once more. |
| The bubble click still opens the page | The existing "opens chat then page when CTA is clicked while chat is closed" test stays green. |
| A plain open without the offer stays on the conversation | With the notify feature off or the SKU available, flip `isChatOpen` to true and expect `setCurrentPage` not to be called. |
| WhatsApp offers and ordinary starters are unchanged | Existing pending-starter and WhatsApp tests stay as they are. |

**Flow coverage**: unavailable product, chat closed, open from the launcher, one page push, no second push while open, and a second push only on the next open. The bubble-click path remains covered.

**Failure paths covered**: `setCurrentPage` absent still no-ops inside `openBackInStockPage`. An open without the offer does not push a page.

**Stubbed at the boundary**: the hook tests already mock VTEX product resolution, `@weni/webchat-service`, and `useChatContext`. No network.

## Rollout and Rollback

Ship with the widget release. No feature flag. The notify feature flag `unavailableProductNotify` still decides whether the offer exists. Rollback is the previous widget bundle. Nothing is stored, so a rolled-back bundle opens on the conversation again.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| I. Version Control and Review | Change enters through a pull request with lint and the coverage gate. | none |
| III. Observability | No new console output. Product name, SKU, and seller are not logged on landing. | none |
| IV. Versioned Contracts | No export or init option changes. The open behavior is a patch. The conversation remains available through the existing back control. | none |
| V. Specification Traceability & No Silent Divergence | Opens with Origin Without Product Spec. Nothing is inherited. | none |
| VIII. Type Safety | The change stays in the existing `useConversationStarters.js` hook. | The new assertions go in the existing `useConversationStarters.test.js`, not a new TypeScript file. The testing standard keeps tests next to this module, and the TypeScript toolchain is not configured (`TODO(TYPESCRIPT_TOOLCHAIN)`). |
| IX. Single Responsibility | The landing rule stays next to `openBackInStockPage` and the existing open effect. | none |
| XII. Component Architecture | `Chat` and `Header` keep rendering `currentPage` and `goBack`. No new view. | none |
| XIV. State Management | The offer stays in the starters hook. The page stack stays in `ChatContext`. This slice does not copy either into a second store. | none |
| Testing | The launcher open, the once-per-open rule, the next open, and the inactive offer are asserted in the existing hook test. | none |
| Internationalization | No new user-facing string. The page title stays `back_in_stock.form_title`. The back button keeps its current label. | none |

## Implementation Decisions

- **Active offer**: `isBackInStockNotify` is the offer, including after the compact chip auto-hides. The chip's visibility is not the landing condition.
- **Once per open**: the push runs on the false-to-true edge of `isChatOpen` only. Back, success, and "show similar products" can reveal the conversation without being overwritten in that same open.
- **Each new open starts on the page**: closing the chat forgets the back press. The next open while the offer is active shows the notify page again.
- **Already-open chat**: if the offer appears during an open conversation, the shopper is not moved. The bubble click still opens the page.
- **Same page payload as the bubble**: product name, SKU, and seller come from the refs `openBackInStockPage` already uses. The launcher does not invent a second payload.
