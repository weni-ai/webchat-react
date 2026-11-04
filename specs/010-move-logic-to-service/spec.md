# Engineering Specification: Move logic to service

**Repository**: webchat-react — frontend

**Feature Branch**: `010-move-logic-to-service`

**Created**: 2026-11-04

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: The widget still decides storefront context, cart updates, conversation starters, and voice-session control inside its contexts, hooks, and utils, so the interface package is not limited to rendering.
- Acceptance criteria:
  - On a VTEX product page, the shopper still sees conversation starters for that product, can change pending cart quantities, and sees the chat close when they enter checkout. The widget obtains those outcomes from `@weni/webchat-service` events and methods, not from a local copy of the rules.
  - Choosing voice mode still asks for the microphone, shows listening and speaking states, sends the final transcript as a chat message, and returns to the text composer on exit. Permission denial and an unsupported browser still show an explicit error state.
  - `src/utils/vtex.js`, `src/utils/vtexCustomFields.js`, `src/utils/sendVtexUtm.js`, `src/utils/VTEXIOMinicartBridge.js`, `src/utils/faststoreBootstrap.js`, `src/utils/availabilityNotify.js`, and `src/services/voice/*` no longer contain those rules. The components that used them still render.
  - `window.WebChat.init` options and the standalone UMD globals keep their current names and meanings. A host page that does not opt into new options behaves as it does today.
  - User-facing strings added for unchanged screens stay in `src/i18n/locales/en.json` only. No shopper message, token, or cart content is logged.

## Scope in This Repository

**This repository implements**: The interface slice. Components, views, styles, and i18n stay here. `ChatContext`, `OrderFormContext`, and `useConversationStarters` become subscribers of the service contract specified in `webchat-service` `specs/003-move-logic-to-service`. Page chrome (`currentPage`, `goBack`, launcher open state, starter visibility timers, message grouping, streaming buffer, viewport CSS variables) stays here because it only affects rendering.

**Out of scope here**:

- Implementing product resolution, cart debounce, custom-field sync, UTM, availability HTTP, or the voice capture and playback pipeline. `webchat-service` owns that slice.
- The socket server and starter generation.
- Redesigning the chat layout or moving Unnnic styling.

**Depends on**: `@weni/webchat-service` published with `watchStorefront`, cart methods, voice-session methods, and the events named in that spec. The peer dependency moves from `1.19.2` to that minor. Until the minor exists, this repo does not delete the local rules.

## Current State

- `src/hooks/useWeniChat.js` — already documents that business logic belongs to `WeniWebchatService`. It still sorts messages and builds `messageGroups` for rendering. That stays.
- `src/contexts/ChatContext.jsx` — constructs the service, mirrors its state, and also owns voice entry (`enterVoiceMode`, `VoiceService`), VTEX custom-field sync, and checkout detection through `isCheckoutPage` and `createNavigationMonitor`.
- `src/contexts/OrderFormContext.jsx` — owns pending cart state, the 5s debounce, FastStore bootstrap, and the VTEX IO minicart send.
- `src/hooks/useConversationStarters.js` — resolves the product with `src/utils/vtex.js`, calls `service.getStarters`, and also owns compact-starter timers, dismissal, and i18n labels.
- `src/services/voice/` — `VoiceService`, `AudioCapture`, `STTConnection`, `TTSPlayer`, `EchoGuard`, `SessionGuard`, `TextChunker`, `sanitizeForTTS`. Used by `ChatContext` and `src/hooks/useVoiceMode.js`.
- `src/components/` and `src/views/` — the interface. They read context and hooks; they should not gain fetch or storefront parsing.
- `src/standalone.jsx` — `window.WebChat` init, `setConversationStarters`, `setThinkingText`. This is the public contract and stays compatible.
- Peer dependency in `package.json` is `@weni/webchat-service` `1.19.2`.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/contexts/ChatContext.jsx` | modified | Subscribe to `storefront:entered-checkout` and `voice:*`. Remove `VoiceService` construction and `startVtexCustomFieldsSync`. |
| `src/contexts/OrderFormContext.jsx` | modified | Replace local debounce and host-cart writes with `setPendingCartItem` and `flushPendingCart`. Keep the React context value the product controls already read. |
| `src/hooks/useConversationStarters.js` | modified | Take product identity and starters from service events. Keep visibility, dismissal, and translation. |
| `src/hooks/useVoiceMode.js` | modified | Map `voice:state` and `voice:error` to the props `VoiceMode` already renders. Call `enterVoiceSession` and `exitVoiceSession`. |
| `src/utils/vtex.js` and the host-page utils listed in the acceptance criteria | removed | Rules now live in the service. Call sites disappear with the context and hook edits. |
| `src/services/voice/` | removed | Session pipeline lives in the service. |
| `package.json` peer dependency | modified | Pin the minor that exports the new contract. |

No new production source file is required. Existing production files stay JavaScript. A new production source file, if one becomes necessary while thinning a context, brings the TypeScript toolchain from Principle VIII in that same pull request. The new tests named in Test Strategy are the exception below. Components under `src/components/` and `src/views/` stay presentational and keep `prop-types` until they are migrated for another reason.

Adoption follows the service slices: storefront and starters first, voice second. The second slice is not started until `enterVoiceSession` is in the published minor the peer pins.

### Flow

1. `ChatProvider` still constructs `WeniWebchatService` and calls `init`. After init it calls `watchStorefront()` once.
2. `useConversationStarters` listens for `storefront:changed` and `starters:received`. It no longer imports `vtex.js`. Compact visibility, the mobile auto-hide timer, and in-chat dismissal stay in the hook and still only affect whether the starter UI is mounted.
3. Product quantity controls call the context methods they call today. `OrderFormProvider` forwards them to the service and renders `cart:updated` / `cart:failed`. It does not debounce locally.
4. `storefront:entered-checkout` runs the same close-chat transition `closeChatOnEnteringCheckout` runs today.
5. The voice control calls `enterVoiceSession`. `voice:transcript` goes to the existing `sendMessage`. `voice:state` drives `VoiceMode`. `exitVoiceSession` runs when the shopper closes voice mode.
6. Message list rendering is unchanged: `useWeniChat` still groups consecutive messages, and `sanitizeHtml` still runs before HTML is rendered.

### Rejected Alternatives

- Deleting the contexts and making every component call the service: the components already share one provider, and Principle XIV says chat state comes from the service through `useWeniChat` rather than from scattered subscriptions.
- Keeping a fallback copy of `vtex.js` after the peer bump: two owners of the same rule is the defect this spec removes.
- Moving message grouping or the streaming buffer into the service: those exist to paint bubbles and do not change what is sent or stored.
- A new major of `@weni/webchat-template-react`: host `init` options do not change, so the widget release stays backward compatible.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `@weni/webchat-service` peer dependency | modified | minor of this package, because init options are unchanged | yes |
| `window.WebChat.init` and documented init options | unchanged | none | yes |
| `window.WebChat.setConversationStarters`, `setThinkingText` | unchanged | none | yes |
| Documented CSS custom properties and `weni-` class names | unchanged | none | yes |
| Internal utils `vtex.js`, `services/voice/*` | removed | none on the public package — they are not package exports | yes for host pages; internal imports in this repo are updated in the same change |

**Consumers affected**: storefronts that load `v3/webchat-latest.umd.js` or depend on `@weni/webchat-template-react`. They are notified through the changelog entry on the release PR. No host-page change is required. The peer bump is a contract change under Principle IV and is called out in that changelog entry.

## Data Model and Migrations

The widget stops persisting storefront and pending-cart rules of its own. Session messages remain the service's session blob. This package does not add a storage key.

**Migrations**: None in this repository. Rollback is pinning the peer back to `1.19.2` and restoring the removed modules in the same revert, so the widget does not call methods that `1.19.2` lacks.

## Non-Functional Requirements

### Peak Load

One widget instance on a storefront page. During a seasonal sales peak (Black Friday weekend) the instance still only renders one conversation: one streaming reply, one starter list, and one cart update arriving in the same second. The widget does not add a second session.

### Observability

Service errors reach the UI as the existing error and loading states. Any `console.error` or `console.warn` added while wiring events uses a stable message plus the channel UUID or session id already on the service. No message body, token, email, phone, or cart contents. `console.log` is not added. `standalone.jsx` already logs init success with `console.log`; this spec does not extend that.

### Failure Handling

- `starters:error`, `cart:failed`, and `voice:error` set the loading and error flags the screens already understand. They are not left as unhandled rejections.
- The widget does not retry a cart flush or a starters request on its own. The service owns retry. A failed flush rolls the displayed pending quantity back to the last `cart:updated` value.
- Double submits stay guarded: quantity controls ignore a new flush while `cart:failed` or `cart:updated` for that action has not arrived, matching Principle XV.
- If `watchStorefront` is missing because the peer was not bumped, the widget fails the peer install. There is no runtime feature flag that half-enables the old rules.

### Security and Authorization

Rendered message HTML still passes through `src/utils/sanitizeHtml.js` before it is inserted. The widget does not gain a new trust boundary: product and cart data arrive as service events and are rendered, not re-parsed from the host document. No new secret is introduced. Channel configuration remains the existing init options.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| Starters, cart quantities, and checkout-close still happen, driven by service events | `src/hooks/useConversationStarters.test.js`, `src/contexts/OrderFormContext.test.jsx`, and `src/contexts/ChatContext.test.jsx` feed mocked service events and assert the rendered outcome |
| Voice mode still shows listening, speaking, denial, and exit | `src/hooks/useVoiceMode.test.js` and the existing `VoiceMode` component test, with the service mock emitting `voice:state` and `voice:error` |
| The moved rule modules are gone and components still render | The tests above fail if the hook imports `vtex.js` or constructs `VoiceService`; component tests for `MessagesList`, `InputBox`, and `Launcher` stay green |
| `window.WebChat.init` options are unchanged | `src/standalone` test (or the existing standalone coverage) asserts the current option names still initialize |
| New strings stay in the English source, and logs omit shopper content | Locale lock plus assertions that the mock logger was not called with message text |

**Flow coverage**: mocked product snapshot → starters render; quantity change → service cart call → updated cart render; checkout event → chat closed; voice entry → transcript sent with `sendMessage` → exit returns to the composer.

**Failure paths covered**: `starters:error`, `cart:failed` with quantity rollback, `voice:error` for permission denial, missing event handler does not throw into the tree.

**Stubbed at the boundary**: `@weni/webchat-service` is mocked through `test/__mocks__/@weni/webchat-service.js`. Tests do not open a socket or a VTEX page. `localStorage` stays mocked as it is today.

## Rollout and Rollback

Ship only after the service minor that contains the matching slice is on npm. First release of this spec removes the storefront rules and bumps the peer. The voice removal is a follow-up pull request on this spec once `enterVoiceSession` is in that peer line. Production is the CDN bundle and the npm package, not the merge alone. Rollback republishes the previous widget version and restores the peer pin to `1.19.2` together with the deleted modules, so the bundle never calls a method the pinned service lacks. Host `init` options do not need a migration in either direction.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| IV. Versioned Contracts | Public `window.WebChat` options, CSS variables, and `weni-` classes are unchanged. The peer bump is recorded as a contract change in the changelog. | none |
| V. Specification Traceability | Opens with Origin Without Product Spec. | none |
| II. Security and Secrets | No new secrets. HTML sanitization stays at render time. | none |
| III. Observability | Event wiring logs ids only, through `console.error` or `console.warn`. | none |
| VIII. Type Safety | Production edits stay in the existing `.js` and `.jsx` files. A new production source file brings the TypeScript toolchain in that same pull request. | The new tests `src/contexts/ChatContext.test.jsx` and `src/hooks/useVoiceMode.test.js` are JavaScript. The testing standard requires colocated `.test.js` / `.test.jsx` files, and `TODO(TYPESCRIPT_TOOLCHAIN)` means a `.ts` test cannot run. The exception is only those test files. |
| IX. Single Responsibility | Thinning `ChatContext` and `OrderFormContext` removes responsibilities instead of adding them. | none |
| XIV. State Management | Chat and session state still enter through `useWeniChat` and the service. Cart and voice state are no longer mirrored as a second rule engine. | The React context value remains, because components already subscribe to it. It mirrors service events for render; it does not recompute the rules. |
| XV. Async State Correctness | Loading, success, and error come from service events. Failed cart updates roll back the displayed quantity. Double flush is guarded. | none |
| XVI. API Integration & Data Boundaries | Components do not call `fetch`. Host-page HTTP moves to the service. `snake_case` stays inside the service adapter. | none |
| Testing | Colocated behavior tests cover happy and error paths. The service package is mocked. Coverage stays at or above 80% on all four metrics. | none |
| Internationalization | Strings stay in `src/i18n/locales/en.json`. Translation locale files are not edited. | none |
| XII and XIII | Shared components and BEM tokens are untouched. | none |

## Implementation Decisions

- **Subscribe, do not reimplement**: contexts keep the shape components already consume and forward to the service. The deleted modules are the proof the rule moved.
- **Same slice order as the service spec**: storefront and starters first, voice second, each tied to a published service minor.
- **Presentation stays**: `messageGroups`, `useStreamingBuffer`, `useVtexCxVisualViewportCssVars`, starter show and hide timers, `sanitizeHtml`, and `currency.js` / `formatters.js` stay in this repo.
- **No runtime fallback**: the peer dependency is the switch. The bundle does not carry both implementations.
