# Research: Move logic to service

## What stays in this package

- **Decision**: Keep rendering and the React subscription layer. `ChatContext`, `OrderFormContext`, and `useConversationStarters` keep the values components already read. They forward actions to `@weni/webchat-service` and render its events. Delete `src/utils/vtex.js`, `vtexCustomFields.js`, `sendVtexUtm.js`, `VTEXIOMinicartBridge.js`, `faststoreBootstrap.js`, `availabilityNotify.js`, and `src/services/voice/` only in the pull request that bumps the peer to a service build that exports the replacement.
- **Rationale**: The spec forbids a second copy of the rules and forbids a runtime fallback. Components should not each subscribe to the service.
- **Alternatives considered**: Calling `watchStorefront` from `Widget.jsx` and `InputBox.jsx` directly — rejected, Principle XIV keeps chat state behind `useWeniChat` and the existing providers. Keeping `vtex.js` as a thin re-export of the service — rejected, that leaves the old module in the bundle.

## Peer dependency

- **Decision**: Two widget releases on this spec. The first pins the peer to the service minor that contains `watchStorefront` and the cart methods, and deletes the storefront modules. The second pins the peer to the later minor that contains `enterVoiceSession`, and deletes `src/services/voice`. `window.WebChat.init` options are not added or renamed. Package version bump for each release is minor (`2.17.0` is current).
- **Rationale**: The service plan publishes those slices separately. This package cannot call a method the pinned peer lacks.
- **Alternatives considered**: One widget release that waits for both service minors — rejected, it delays the storefront move for the voice pipeline. A major of this package — rejected, host init options do not change.

## Tests

- **Decision**: Extend the Jest mock at `test/__mocks__/@weni/webchat-service.js` with the new methods and events. Colocate behavior tests next to the hook and the two contexts. Do not add a TypeScript toolchain in this plan. New tests are `.test.js` / `.test.jsx` siblings. Production source files stay the existing JavaScript files.
- **Rationale**: The testing standard requires colocated `.test.js` / `.test.jsx` files, and `TODO(TYPESCRIPT_TOOLCHAIN)` means a `.ts` test cannot run. `spec.md` records that as the Principle VIII exception for `src/contexts/ChatContext.test.jsx` and `src/hooks/useVoiceMode.test.js` only. A new production source file still brings the toolchain.
- **Alternatives considered**: A new `src/services/webchatService.ts` adapter — rejected, it is a new file and a second wrapper around the package the contexts already hold.

## Presentation left in place

- **Decision**: Do not move `messageGroups` in `useWeniChat`, `useStreamingBuffer`, `useVtexCxVisualViewportCssVars`, starter visibility timers, `sanitizeHtml`, or `currency.js` / `formatters.js`.
- **Rationale**: Those decide how a frame is painted or formatted for the shopper's locale. The service spec leaves them here. The service constitution says the library emits raw values.
- **Alternatives considered**: Moving grouping into the service so the widget maps a ready-made list — rejected, it couples every consumer to React bubble layout.
