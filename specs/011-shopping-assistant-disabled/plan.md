# Implementation Plan: Back-in-stock only mode (`shoppingAssistantDisabled`)

**Branch**: `011-shopping-assistant-disabled` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-shopping-assistant-disabled/spec.md`

## Summary

A new `init` option, `shoppingAssistantDisabled`, turns the shopping assistant off and leaves the back-in-stock form. `ChatProvider` fills placeholder `socketUrl` and `channelUuid` when the host omits them and forces `connectOn: 'manual'`, so the current service can be constructed and never opens a socket. The widget renders nothing until an unavailable SKU, and the form no longer falls through to a conversation. The first TypeScript file in the repo brings the toolchain from `TODO(TYPESCRIPT_TOOLCHAIN)`.

## Technical Context

**Language/Version**: Existing JavaScript and JSX, plus one new TypeScript module. Strict `tsc` covers `src/**/*.ts` excluding tests. See [research.md](./research.md).
**Primary Dependencies**: No runtime dependency. Dev: `typescript`, `@babel/preset-typescript`. Peer `@weni/webchat-service` stays `1.19.2`.
**Storage**: None. The service may write its existing render-decision key under the placeholder channel id.
**Testing**: Jest, colocated. New `shoppingAssistantMode.test.ts` and `standalone.test.ts`. Existing Widget, Chat, Header, hook, and view suites gain cases. The service stays mocked.
**Target Platform**: Storefront widget, the React package entry, and the standalone UMD bundle. Vite already transpiles TypeScript.
**Project Type**: Frontend widget.
**Performance Goals**: Zero WebSocket connections and zero starter requests per page view in this mode. One catalog read per product resolution and one subscribe POST per submit, unchanged from spec `010`.
**Constraints**: Do not change the service. Do not export `mapConfig` from `standalone.jsx`. Do not imply `unavailableProductNotify` or `conversationStarters.pdp`. Do not add strings. Do not edit Crowdin locale files. Flag off means today's behavior.
**Scale/Scope**: One new util, the provider, the widget shell, the starters hook, the notify view, the header, the chat shell, standalone init, tests, toolchain config, and a new changelog.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Versioned contracts (IV)** — PASS. New boolean option, default off. `socketUrl` and `channelUuid` stay required when the option is off. Minor release. Recorded in `contracts/init-options.md`. `mapConfig` stays private so the UMD global is unchanged.
2. **Type safety (VIII)** — PASS. `shoppingAssistantMode.ts` is strict TypeScript. This change adds `tsconfig.json`, Babel, Jest extensions and coverage, `eslint --ext .ts,.tsx`, and `npm run typecheck`. Existing JSX stays JSX.
3. **API boundary (XVI)** — PASS. No new HTTP call. The option is camelCase. Placeholders are constants in `src/utils/constants.js`.
4. **State (XIV)** — PASS. The flag is read from config. `isShoppingAssistantDisabled` is derived once in `ChatProvider`. Offer state stays in the starters hook.
5. **Async state (XV)** — PASS. Submit loading and the double-submit guard stay as in spec `010`. An open chat with no notify page is closed.
6. **Observability (III)** — PASS. The starters log records the flag. Warnings use stable messages and carry no contact data and no placeholder values.
7. **i18n** — PASS. No new string. `src/i18n/locales/en.json` is not edited.
8. **Testing** — PASS. The suites in [quickstart.md](./quickstart.md) cover the flag off, the placeholders, no socket, visibility, close, the reduced success, and navigation. Coverage includes the new `.ts` file.
9. **Single responsibility (IX)** — PASS with the departure already in the spec. `ChatContext.jsx` is over 350 lines and gains a few lines. Splitting it is out of scope. The mode rule lives in its own module.

No unjustified MUST departure. Re-checked after Phase 1: the contract adds one option and does not persist a preference. The TypeScript config excludes tests so `tsc` does not typecheck the existing JSX. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/011-shopping-assistant-disabled/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── init-options.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── utils/
│   ├── constants.js                         # two placeholder constants
│   ├── shoppingAssistantMode.ts             # applyShoppingAssistantMode
│   └── shoppingAssistantMode.test.ts
├── contexts/ChatContext.jsx                 # apply mode before the service
├── components/
│   ├── Widget/Widget.jsx                    # render nothing until the offer
│   ├── Chat/Chat.jsx                        # hide banner and input
│   └── Header/Header.jsx                    # back closes the chat
├── hooks/useConversationStarters.js         # no starters; close on navigation
├── views/BackInStockNotify.jsx              # close, reduced success
├── standalone.jsx                           # flag, warning, send no-op
└── standalone.test.ts
tsconfig.json
babel.config.js
jest.config.js
package.json                                 # lint ext, typecheck, devDeps
CHANGELOG.md                                 # created if still absent
```

**Structure Decision**: The mode rule is a pure function in `src/utils/`, which is where this repo keeps shared rules. `ChatProvider` is the only constructor of the service, so it is the place that applies the function. Components only read `isShoppingAssistantDisabled`. Tests stay colocated. No new view and no new string.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `ChatContext.jsx` stays above 350 lines (Principle IX, SHOULD) | The mode is a few lines around service construction and the init effect | Splitting the provider is a separate refactor and would mix with this behavior change |

## Inherited Context

- Product Spec: none
- Engineering Spec: `specs/011-shopping-assistant-disabled/spec.md`

## Delivery Sequence

1. Toolchain: `typescript`, `@babel/preset-typescript`, `tsconfig.json`, Babel preset order, Jest extensions and coverage, lint `--ext`, `typecheck` script. Confirm `npm run typecheck` and `npm test` still pass before any feature code.
2. `shoppingAssistantMode.ts` and its test, plus the two constants. The function is idempotent and treats an empty string as missing.
3. `ChatProvider`: apply the mode before `new WeniWebchatService`. Skip `initPayload`, the tooltip timer, the restored open state, and the embedded fullscreen override. Expose `isShoppingAssistantDisabled`. Relax `propTypes`.
4. `WidgetContent`: render nothing in this mode until the offer or the notify page. Skip the opt-in balloon. Relax `propTypes`.
5. Starters hook: do not call `requestStarters` or flush deferred starters. On pathname change, close the chat and clear the page stack.
6. Notify view and header: close instead of showing the conversation. Success state drops the wait prompt and the similar-products button.
7. `Chat`: do not render `ConnectionStatusBanner` or `InputBox`.
8. `standalone.jsx`: map the flag, warn when the other two flags are off, and make `send` and `setConversationStarters` no-ops. Do not export `mapConfig`. Comment an example in `src/index.jsx`.
9. Starters log config records the flag.
10. Create `CHANGELOG.md` if it is missing, with an Unreleased Added entry. Do not backfill.
11. `npm run typecheck`, `npm test -- --coverage`, `npm run lint`, then the manual path in [quickstart.md](./quickstart.md).

**Cross-repository coordination**: none. The linked service from spec `010` is used as it is. A later service spec may add a real headless mode. This plan does not wait for it.

## Peak Load Plan

- Declared peak: a campaign-day product page with many shoppers. Zero WebSocket connections and zero starter requests per page view in this mode. One catalog read per resolution and one subscribe POST per submit.
- How this plan sustains it: `connectOn: 'manual'` stops `init` and `runQueue` from connecting. The hook never calls `getStarters`. The subscribe path is unchanged and still guarded by `isSubmitting`.
- How it is verified: Widget and hook tests assert `connect` and `getStarters` are not called. No load harness. The manual path checks the Network panel for the absence of a WebSocket.

## Observability Plan

- Structured logs added: `shoppingAssistantDisabled` on the conversation-starters log config and its `init` event, beside `connectOn`.
- Correlation identifier: the SKU, already on `divert_back_in_stock` and on the service's `backInStock:*` events.
- Error reports: `console.warn('WebChat: shoppingAssistantDisabled needs unavailableProductNotify and conversationStarters.pdp')` for a config that can never show. `console.warn('WebChat.<method>: shopping assistant is disabled')` for `send` and `setConversationStarters`. Neither includes the name, the phone, or the placeholder values.
- Signals watched after rollout: a storefront on this config shows no WebSocket in the Network panel, and `WebChat.getConversationStartersLog()` shows the flag as true.

## Rollout and Rollback Plan

- Rollout: minor release of `@weni/webchat-template-react` and the UMD bundle. The option defaults to off, so existing storefronts do not change. No separate feature flag. The peer stays `1.19.2`.
- Backward compatibility window: a host that does not pass the option keeps today's required `socketUrl` and `channelUuid`. `connectOn`, `embedded`, and `startFullScreen` change only when the option is true.
- Rollback: remove the option, or set it to `false`, and restore the connection values. Reverting the commit is safe. Nothing new is persisted. The service's render key under the placeholder channel id is cleared by the service when `renderPercentage` is 0 or 100.
- Migration reversibility: no schema. The new changelog file can stay after a code rollback.

## Divergence Gate

Removed. This spec has no Product Spec.
