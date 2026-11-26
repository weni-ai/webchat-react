# Engineering Specification: Close-only header on the back-in-stock success screen

**Repository**: webchat-react — frontend

**Feature Branch**: `016-success-header-close`

**Created**: 2026-11-25

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: When the shopping assistant is disabled, submitting the back-in-stock form leaves the shopper on a confirmation with nothing left to do in the chat. The shared header still offers Back and Fullscreen chat.
- Acceptance criteria:
  - With the shopping assistant disabled, the confirmation that follows a submitted back-in-stock form shows neither the Back button nor the Fullscreen chat button. Close chat stays, with the same downward chevron it uses on every other screen.
  - On that same confirmation, Close chat still closes the chat.
  - The form that comes before the confirmation keeps today's header: Back (which closes the chat and clears history), Fullscreen chat when the host enabled it, and Close chat with the downward chevron.
  - With the shopping assistant enabled, the confirmation and the form keep today's header, including Back, Fullscreen chat when enabled, and the downward chevron on Close chat.
  - Cart, mode tag, and every other header control are unchanged on both screens and in both modes.

## Scope in This Repository

**This repository implements**: the header shown while the back-in-stock confirmation is on screen and the shopping assistant is disabled. Back and Fullscreen chat are omitted. Close chat stays, with the downward chevron. The form screen and the assistant-enabled confirmation are unchanged.

**Out of scope here**:

- Copy, layout, and actions inside the confirmation itself (success title, description, and the hidden "show similar products" action already behave this way).
- `@weni/webchat-service` and any host-page contract (`window.WebChat`, init options, CSS custom properties).
- Translations. No new string is added. Existing accessible names stay: "Back", "Fullscreen chat", "Close chat".
- Sessions that reach the same confirmation only because they were sampled out of `renderPercentage`. They share `isBackInStockOnlyMode` today, but this change keys off the shopping assistant being disabled.

**Depends on**: nothing outside this repository. The confirmation is already the `submitted` state of the back-in-stock view.

## Current State

- `src/utils/shoppingAssistantMode.ts` — `shoppingAssistantDisabled: true` forces back-in-stock-only behavior (`isBackInStockOnlyMode` in `ChatContext`).
- `src/views/BackInStockNotify.jsx` — after a submit attempt, `submitted` is true and the view renders the confirmation (`success_title` / `success_description`). When `isBackInStockOnlyMode` is true it already hides the wait prompt and "show similar products". The view does not tell the header which of its two screens is showing.
- `src/components/Header/Header.jsx` — one header for every page. Back (`arrow_back`, accessible name "Back") shows when there is a current page and a `goBack`. In back-in-stock-only mode that button closes the chat and clears history. Fullscreen chat shows when `config.showFullScreenButton` is true. Close chat (`keyboard_arrow_down`, accessible name "Close chat") shows when `config.showCloseButton` is true and calls `toggleChat`.
- Tests: `src/views/BackInStockNotify.test.jsx` covers the confirmation content. `src/components/Header/Header.test.jsx` covers Back in back-in-stock-only mode and the fullscreen button. Neither covers a header that depends on the confirmation.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/views/BackInStockNotify.jsx` | modified | While the confirmation is showing and the shopping assistant is disabled, tells the rest of the chat that the header should be close-only. Clears that signal when the confirmation unmounts or the shopper is no longer on it. |
| `src/components/Header/Header.jsx` | modified | When that signal is set, omits Back and Fullscreen chat. Close chat stays `keyboard_arrow_down`, accessible name "Close chat", and `toggleChat` stays the click handler. |
| `src/views/BackInStockNotify.test.jsx` | modified | Asserts the signal is raised only on the confirmation with the assistant disabled, and is cleared when that screen goes away. |
| `src/components/Header/Header.test.jsx` | modified | Asserts the close-only header: no Back, no Fullscreen chat, Close chat still the downward chevron, and a click still closes the chat. A case without the signal keeps Back, fullscreen, and the same chevron. |

### Flow

**Assistant disabled, confirmation on screen**

1. The shopper submits the back-in-stock form. The view sets `submitted` and renders the confirmation, as it does today.
2. Because the shopping assistant is disabled, the view raises the close-only header signal for as long as that confirmation stays mounted.
3. The header reads the signal. It does not render Back. It does not render Fullscreen chat, even when `showFullScreenButton` is true. Close chat stays the downward chevron.
4. The shopper activates Close chat. The chat closes, the same as today's close button.
5. Leaving the confirmation (unmount, or a later navigation away from this view) clears the signal so the next screen gets the normal header.

**Form, or assistant enabled**

The view does not raise the signal. The header keeps Back, Fullscreen chat (when enabled), and the downward chevron on Close chat.

### Rejected Alternatives

- Hiding Back and Fullscreen chat for the whole back-in-stock flow whenever the assistant is disabled: the form still needs Back, which today is how the shopper dismisses the form in that mode, and the request names the last screen only.
- Keying the header off `isBackInStockOnlyMode` alone: that flag is also true for sampled-out sessions. The request is specifically the shopping assistant being disabled.
- Changing the Close chat icon to an X: the control stays the same action and the same downward chevron used on every other screen.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `window.WebChat` init options and package exports | none | none | yes |
| Header buttons a host might target by accessible name | Close chat remains "Close chat"; Back and Fullscreen chat are absent only on this screen in this mode | patch | yes — names of remaining controls are unchanged; absence is a view state, not a removed public option |

**Consumers affected**: storefronts that disable the shopping assistant and open the back-in-stock form. No host integration change is required. `showCloseButton: false` still hides Close chat, including on this screen.

## Non-Functional Requirements

### Peak Load

Unchanged. The header reads one extra boolean already available in the chat session. No new request runs when the confirmation appears.

### Observability

No new logs. The confirmation must not log the shopper's name or phone. Existing service events (`backInStock:error` and the subscribe call) stay as they are.

### Failure Handling

No new dependency. If subscribe fails, the view already shows the confirmation; the close-only header still applies, because the shopper is on that screen.

### Security and Authorization

No new input, secret, or trust boundary. The signal is internal UI state.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| Assistant disabled, confirmation: no Back, no Fullscreen chat, Close chat keeps the downward chevron | Header test with the signal set and `showFullScreenButton: true` asserts those three controls |
| Close chat on that screen still closes the chat | Same test clicks Close chat and expects `toggleChat` |
| The form keeps Back, fullscreen, and the chevron | Header test without the signal; view test that the signal is absent before submit |
| Assistant enabled, confirmation keeps today's header | View test that a successful submit with the assistant enabled does not raise the signal |
| Cart and mode tag stay as they are | Header test with the signal set still renders them when their existing conditions hold |

**Flow coverage**: assistant disabled, submit, confirmation header, close. Assistant enabled, submit, header unchanged.

**Failure paths covered**: subscribe rejection still shows the confirmation, and the view still raises the signal when the assistant is disabled.

**Stubbed at the boundary**: `service.subscribeBackInStock` and `service.validateBackInStockContact`, as the existing view tests already stub them.

## Rollout and Rollback

Ships in the widget bundle with no feature flag. Rollback is reverting the commit. Hosts that do not disable the shopping assistant see no difference. Hosts that do see the smaller header only after a successful submit.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| IV. Versioned Contracts | No init option, export, CSS custom property, or `weni-` class contract changes. Accessible names of remaining buttons stay. | none |
| V. Specification Traceability | Opens with Origin Without Product Spec. No product spec to diverge from. | none |
| Quality Standards > Internationalization | No new user-facing string. Accessible names already exist in source. | none |
| II. Security and Secrets | No new data handling. | none |
| III. Observability | No new logs and no personal data added to existing ones. | none |

## Implementation Decisions

- **Signal instead of a second header**: the confirmation and the form share `Header`. A boolean the view sets while the confirmation is visible is enough for the header to switch icons and hide two buttons, and it resets when the view leaves that screen.
- **Close icon unchanged**: Close chat stays `keyboard_arrow_down` on the confirmation and on every other screen.
- **Shopping assistant disabled means `shoppingAssistantDisabled`**, the flag that already puts the chat in back-in-stock-only mode. Sampled-out sessions are left as they are.
- **`showCloseButton: false` still wins**: this change does not force a close button onto hosts that turned it off.
