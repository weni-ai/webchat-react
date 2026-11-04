# Implementation Plan: Move logic to service

**Branch**: `010-move-logic-to-service` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-move-logic-to-service/spec.md`

## Summary

The widget stops owning storefront, cart, starter, and voice-session rules. `ChatContext`, `OrderFormContext`, and `useConversationStarters` subscribe to `@weni/webchat-service` and keep the render state components already use. The local rule modules are deleted in the same pull request as the peer bump that replaces them. `window.WebChat.init` does not change. Message grouping, streaming animation, locale formatting, and HTML sanitization stay.

## Technical Context

**Language/Version**: JavaScript and JSX, React 18. No new production source file, so the TypeScript toolchain stays out of this plan. New colocated tests stay `.test.js` / `.test.jsx` under the Principle VIII exception in `spec.md`.
**Primary Dependencies**: `@weni/webchat-service` peer, today `1.19.2`. First release of this spec pins the storefront minor from `webchat-service` `specs/003-move-logic-to-service`. The voice release pins the later minor. No other new dependency.
**Storage**: None added. Session storage stays inside the service.
**Testing**: Jest and Testing Library. The service is `test/__mocks__/@weni/webchat-service.js`. New or updated tests are colocated `.test.js` / `.test.jsx` files.
**Target Platform**: Browser widget, ESM package and standalone UMD, embedded in storefronts.
**Project Type**: Single frontend library.
**Performance Goals**: One widget instance. Render one starter list, one cart update, and one streaming reply arriving in the same second during a Black Friday weekend peak.
**Constraints**: Do not change `init` options, CSS variables, or `weni-` classes. Do not edit Crowdin translation files. Do not keep a fallback copy of `vtex.js`. Do not call `fetch` from components.
**Scale/Scope**: Two contexts, the starters hook, the voice hook, the service mock, the peer pin, and deletion of the modules listed in the contract.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Clean Code & Readability** — PASS. Contexts forward to the service instead of embedding VTEX and voice rules. Components stay declarative.
2. **Code Style Standards** — PASS. Prettier and the existing ESLint config. No new runtime dependency besides the peer bump.
3. **Naming Conventions** — PASS. No new component. Existing PascalCase components and camelCase hooks stay.
4. **Testing & Quality Assurance** — PASS. Quickstart covers starters, cart rollback, checkout close, and voice states through the mock. Coverage stays at 80% on all four metrics.
5. **Semantic HTML & Unnnic** — PASS. No markup or token change. Existing voice and starter screens keep their structure. Strings stay in `src/i18n/locales/en.json` if a screen needs a key; translation files are not edited.
6. **Pre-Commit Compliance** — PASS. Prettier, `npm run lint`, and `npm test -- --coverage` before the pull request. The localization lock applies only if `en.json` changes.

No unjustified MUST departure. Re-checked after Phase 1: the host contract is unchanged, and the peer bump is the only contract change. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/010-move-logic-to-service/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── widget-service.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── contexts/
│   ├── ChatContext.jsx            # watchStorefront, checkout and voice events
│   └── OrderFormContext.jsx       # forward cart actions
├── hooks/
│   ├── useConversationStarters.js # render starters from events
│   └── useVoiceMode.js            # second slice
├── utils/                         # delete vtex and host-page rule modules
└── services/voice/                # delete in the voice slice
test/__mocks__/@weni/webchat-service.js
package.json                       # peer pin
```

**Structure Decision**: Single frontend library. No new directory. Providers remain the subscription boundary. Presentation utilities listed in the spec stay.

## Complexity Tracking

The Principle VIII departure is limited to `src/contexts/ChatContext.test.jsx` and `src/hooks/useVoiceMode.test.js`, justified in `spec.md`: the testing standard requires those extensions, and `TODO(TYPESCRIPT_TOOLCHAIN)` means a `.ts` test cannot run. A new production source file still stops the pull request until that toolchain is included.

## Inherited Context

- Product Spec: none
- Engineering Spec: `specs/010-move-logic-to-service/spec.md`

## Delivery Sequence

1. Wait until `@weni/webchat-service` has published the storefront minor (`watchStorefront`, cart methods, checkout and cart events).
2. Extend the Jest mock with those methods and events.
3. Point `ChatProvider`, `OrderFormProvider`, and `useConversationStarters` at them. Delete the storefront rule modules in that same change. Bump the peer.
4. Run the storefront quickstart. Changelog the peer bump. Release a minor of this package.
5. After the voice minor of the service is published, repeat steps 2–4 for `useVoiceMode` and `src/services/voice/`.

**Cross-repository coordination**: Service spec `specs/003-move-logic-to-service` ships first. This plan does not start step 3 against `1.19.2`.

## Peak Load Plan

- Declared peak: one widget on a storefront page during Black Friday weekend, one streaming reply, one starter list, and one cart update in the same second.
- How this plan sustains it: the widget does not add a session, a socket, or a document parser. It renders events the service already emitted.
- How it is verified: Jest renders one starter list and one cart update from mocked events in one test. No browser load lab. The bundle does not gain the deleted parsers, which is the size win.

## Observability Plan

- Structured logs added: none on the success path. A missing handler uses `console.error` with a stable message and the channel UUID or session id already on the service.
- Correlation identifier: the service session id and channel UUID. This package does not invent a new id.
- Error reports: `starters:error`, `cart:failed`, and `voice:error` are rendered. They are not logged with question text, quantities, or transcripts.
- Signals watched after rollout: storefronts still show starters on a PDP and still close the chat on checkout. Host pages do not report a new required `init` option.

## Rollout and Rollback Plan

- Rollout: minor of `@weni/webchat-template-react` after the service minor is on npm. CDN `webchat-latest.umd.js` updates with that release. No flag.
- Backward compatibility window: host `init` options keep working. The previous widget build remains valid with peer `1.19.2`.
- Rollback: republish the previous widget version and restore the deleted modules together with the `1.19.2` peer pin, so the bundle never calls a method that pin lacks.
- Migration reversibility: this package writes no schema. The service storage key is irrelevant to the widget rollback.

## Divergence Gate

Removed. This spec has no Product Spec.
