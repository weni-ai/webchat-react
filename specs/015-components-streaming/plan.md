# Implementation Plan: Shopping Assistant Components Streaming

**Branch**: `015-components-streaming` | **Date**: 2026-11-24 | **Spec**: [specs/015-components-streaming/spec.md](./spec.md)  
**Input**: Engineering specification from `/specs/015-components-streaming/spec.md`

## Summary

Implement Shopping Assistant streaming component UX in `@weni/webchat-template-react` for `list_message`, `cta_message`, and `quick_replies` (plus staggered item entrance in `views/ListMessage`), consuming the additive `@weni/webchat-service` `Message` fields `componentHints` and `streamPhase` (`AD-005`, `AD-006`). A new TypeScript per-message lifecycle layer (`componentStreaming.ts`, `usePrefersReducedMotion.ts`, `useComponentStreamLifecycle.ts`, `StreamedMessageItem.tsx`, `ComponentSkeleton.tsx`, `ComponentAnnouncementRegion.tsx`) coordinates word-by-word text buffering (`useStreamingBuffer`), layout-preserving in-flow hidden-label skeletons, a unified `<= 300ms` staggered entrance, strict last-message activation with `10_000ms` timeout and disconnect cleanup, scroll/focus/sub-view stability, and English source `aria-live="polite"` keys in `src/i18n/locales/en.json`. A dev-only simulation module (`src/dev/simulateComponentStreams.ts`) wired into `src/index.jsx` enables manual socket-stream testing in `npm run dev` without affecting production bundles.

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict: true`) for all new modules + existing JavaScript/JSX (ES2020) for minimal targeted edits  
**Primary Dependencies**: React 18, `@weni/webchat-service` (peer bumped from `1.21.0` to new MINOR `1.22.0`), `react-i18next` / `i18next`, `dompurify`, `marked`, `prop-types`, Sass/SCSS with `postcss-prefix-selector` (zero new runtime npm dependencies)  
**Storage**: None — transient per-message UI state only (`BD-007`)  
**Testing**: Jest 29 + jsdom + `@testing-library/react` + `@testing-library/user-event` (`>= 80%` statements, branches, functions, lines)  
**Target Platform**: Modern storefront browsers (desktop floating, fullscreen, mobile, embedded) via npm library (`dist/`) and standalone UMD bundle (`dist-standalone/`)  
**Project Type**: Frontend React widget library + standalone UMD bundle  
**Performance Goals**: Total button entrance `<= 300ms` (`NFR-001`), clickable within `<= 300ms` after text end when complete (`NFR-002`), 0px layout shift on hint-labeled swap (`NFR-003`, `SC-003`), 0 forced synchronous reflows, compositor-only (`transform` + `opacity`) animations  
**Constraints**: `10_000ms` hard timeout after text end/hint (`NFR-004`); no PII in logs; strict localization lock (`en.json` only, Crowdin owns `pt`/`es`/`ro`); `prefers-reduced-motion: reduce` respected in CSS and JS; dev harness excluded from production bundles  
**Scale/Scope**: All Shopping Assistant channels globally with zero merchant configuration (`BD-010`); 6 new TypeScript modules + 1 dev-only TypeScript helper + targeted updates to 9 existing components/styles/tests

## Constitution Check

*GATE: Checked pre-design (Phase 0) and re-checked post-design (Phase 1). All gates PASS.*

1. **Clean Code & Readability (Principles VII, IX, X)**: PASS — English identifiers/comments/docs; focused modules well under 350 lines (`StreamedMessageItem.tsx` extracted so 432-line `MessagesList.jsx` does not grow; `src/dev/simulateComponentStreams.ts` extracted so 466-line `src/index.jsx` stays minimal); object maps instead of `switch` in all new dispatch logic; Prettier + ESLint clean.
2. **Dependencies & Versioned Contracts (Principles II, IV, VIII)**: PASS — Zero new third-party dependencies; `@weni/webchat-service` peer bumped explicitly as MINOR; all new code in strict TypeScript with zero `any`; existing `.jsx` edits maintain `prop-types`; CTA URLs validated against `^https?://.+` and markdown sanitized via `sanitizeHtml.js`.
3. **Naming Conventions (Principles XI, XII)**: PASS — `PascalCase` for new component files (`ComponentSkeleton.tsx`, `StreamedMessageItem.tsx`, `ComponentAnnouncementRegion.tsx`), `camelCase` for hooks/utils (`useComponentStreamLifecycle.ts`, `usePrefersReducedMotion.ts`, `componentStreaming.ts`, `simulateComponentStreams.ts`); reuses shared `FSButton`, `Button`, and `Icon`.
4. **Testing & 80% Coverage Gate (Quality Standards > Testing)**: PASS — Colocated `<name>.test.ts(x)` tests for every new module (including `src/dev/simulateComponentStreams.test.ts`), updated colocated tests for modified components, updated `test/__mocks__/@weni/webchat-service.js` and `test/hooks/useStreamingBuffer.test.js`, covering all happy paths, edge cases, and failure paths.
5. **Semantic HTML, BEM, Unnnic Tokens & Accessibility (Principles XII, XIII; Quality Standards > Accessibility & i18n)**: PASS — `weni-` BEM classes scoped under `.weni-widget`; existing `src/styles/variables.scss` tokens used; inline styles limited solely to runtime `--weni-enter-duration` / `--weni-enter-delay`; `aria-hidden="true"` non-focusable `<span>` skeletons; sequential `aria-live="polite"` region; `prefers-reduced-motion` dual CSS/JS support; only `src/i18n/locales/en.json` edited.
6. **Pre-Commit & Traceability Compliance (Principles I, III, V, VI, XIV, XV)**: PASS — Conventional commits; `npx prettier --write` -> `npm run lint` -> `npm run typecheck` -> `npm test -- --coverage` gate; `.githooks/pre-commit` localization lock honored; state stays owned by `@weni/webchat-service`; structured PII-free `[WebChat:ComponentStreaming]` warnings; pinned traceability with `Divergences: none`.

## Project Structure

### Documentation (this feature)

```text
specs/015-components-streaming/
├── spec.md                                 # Engineering specification (pinned to 019-sa-components-streaming-v1)
├── plan.md                                 # This file (/speckit-plan output)
├── research.md                             # Phase 0 design decisions and rationale
├── data-model.md                           # Phase 1 TypeScript entities and lifecycle state machine
├── quickstart.md                           # Phase 1 automated & manual validation guide
├── contracts/
│   └── component-streaming-ui.md           # Phase 1 service, component prop, BEM, i18n, log & dev harness contracts
├── checklists/
│   └── requirements.md                     # Engineering spec quality validation checklist
└── tasks.md                                # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── utils/
│   ├── componentStreaming.ts               # NEW: constants, stagger math, URL/hint validation, announcement builders
│   └── componentStreaming.test.ts          # NEW: colocated unit tests
├── hooks/
│   ├── usePrefersReducedMotion.ts          # NEW: matchMedia hook with safe fallback
│   ├── usePrefersReducedMotion.test.ts     # NEW: colocated unit tests
│   ├── useComponentStreamLifecycle.ts      # NEW: per-message skeleton/entering/ready state machine + 10s timeout
│   ├── useComponentStreamLifecycle.test.ts # NEW: colocated unit tests
│   └── useStreamingBuffer.js               # MOD: clean empty-text completion without lingering caret
├── components/Messages/
│   ├── ComponentAnnouncementRegion.tsx     # NEW: sequential aria-live="polite" sr-only announcer
│   ├── ComponentAnnouncementRegion.scss    # NEW: .weni-sr-only styling
│   ├── ComponentAnnouncementRegion.test.tsx# NEW: colocated unit tests
│   ├── StreamedMessageItem.tsx             # NEW: coordinates useStreamingBuffer + useComponentStreamLifecycle across bubble & QuickReplies
│   ├── StreamedMessageItem.test.tsx        # NEW: colocated flow tests (SC-001..SC-004, continuity, timeout, multi-component)
│   ├── MessageText.jsx                     # MOD: optional external buffer + list/CTA render slots; omit empty text node
│   ├── MessageText.test.jsx                # MOD: unit tests for external slots & empty-text responses
│   ├── MessagesList.jsx                    # MOD: strict last-message check, StreamedMessageItem delegation, announcement region, near-bottom scroll guard
│   ├── MessagesList.test.jsx               # MOD: tests for strict last-message, scroll preservation, live announcements
│   └── TextComponents/
│       ├── ComponentSkeleton.tsx           # NEW: in-flow hidden-label shimmer skeletons + 120px/210px fallbacks
│       ├── ComponentSkeleton.scss          # NEW: BEM styles + shimmer + reduced-motion + BD-005 CSS vars
│       ├── ComponentSkeleton.test.tsx      # NEW: colocated unit tests
│       ├── QuickReplies.jsx / .scss        # MOD: stagger animation props, click-lock guard, string/object normalization
│       ├── QuickReplies.test.jsx           # NEW: colocated unit tests
│       ├── ListMessage.jsx / .scss         # MOD: stagger animation props, animateEntrance flag to views/ListMessage
│       ├── ListMessage.test.jsx            # NEW: colocated unit tests
│       ├── CallToAction.jsx / .scss        # MOD: grow-in animation props, isValidCtaUrl guard
│       └── CallToAction.test.jsx           # NEW: colocated unit tests
├── views/
│   ├── ListMessage.jsx / .scss             # MOD: staggered option entrance (<=300ms) + Send double-submit guard
│   └── ListMessage.test.jsx                # NEW: colocated unit tests
├── styles/
│   └── animations.scss                     # MOD: weni-component-pop-in, weni-component-grow-in, weni-skeleton-shimmer keyframes
├── i18n/locales/
│   └── en.json                             # MOD: streaming_components.* English source keys ONLY
├── dev/
│   ├── simulateComponentStreams.ts         # NEW: dev-only WebSocket frame replay helper + 1.21.0 fallback
│   └── simulateComponentStreams.test.ts    # NEW: colocated unit tests (preserves >=80% Jest coverage)
└── index.jsx                               # MOD: dev-only debug buttons inside #actions (not in production builds)

test/
├── __mocks__/@weni/webchat-service.js      # MOD: helpers for streaming updates, hints, disconnect completion
└── hooks/useStreamingBuffer.test.js        # MOD: empty-text and awaiting_components transition cases

package.json                                # MOD: bump @weni/webchat-service peerDependency once 1.22.0 is published
```

**Structure Decision**: Existing single-package React frontend layout under `src/` with colocated `<name>.test.ts(x)` unit tests per Constitution `Testing` and `Naming Conventions`. Dev-only simulation helpers live under `src/dev/` and are imported exclusively by `src/index.jsx` (`npm run dev`), keeping `src/index.js` and `src/standalone.jsx` production entry points clean.

## Complexity Tracking

No Constitution `MUST` violations introduced. Pre-existing repository exceptions documented in `spec.md > Constitution Alignment` (`MessagesList.jsx` and `src/index.jsx` already exceeding 350 lines; `TODO(CHANGELOG)`; Crowdin post-merge translation exception; decorative animation/fallback px constants).

---

## Inherited Context

- Product Spec: Streaming de componentes no Shopping Assistant (quick reply, lista e CTA) — https://github.com/weni-ai/vtex-cx-experience-specs/blob/e0f8e7ec9b5645681534645dc182a070b2d38e15/specs/019-sa-components-streaming/spec.md
- Pinned version: `019-sa-components-streaming-v1` (commit `e0f8e7ec9b5645681534645dc182a070b2d38e15`)
- Architecture doc: https://github.com/weni-ai/vtex-cx-experience-specs/blob/fe00c1ce98126044f7b5770fb75d54aadc88d34d/specs/019-sa-components-streaming/architecture.md (commit `fe00c1ce98126044f7b5770fb75d54aadc88d34d`)
- Engineering Spec: `specs/015-components-streaming/spec.md`

## Delivery Sequence

1. **Core utilities, types & hooks (`componentStreaming.ts`, `usePrefersReducedMotion.ts`, `useStreamingBuffer.js`, `useComponentStreamLifecycle.ts`) + unit tests** — foundational pure math, boundary validation, and state machine with zero UI coupling; everything else depends on these contracts.
2. **Visual primitives (`animations.scss`, `ComponentSkeleton.tsx/.scss`, `ComponentAnnouncementRegion.tsx/.scss`, `en.json`) + unit tests** — provides shimmer skeletons, entrance keyframes, polite live-region queue, and English i18n keys before wiring into message components.
3. **Interactive component updates (`QuickReplies`, `ListMessage`, `CallToAction`, `views/ListMessage`) + colocated tests** — adds optional entrance animation props, click-lock double-submit guards, CTA URL guard, and list-item staggering while keeping existing non-animated behavior 100% backward compatible.
4. **Message row & list integration (`StreamedMessageItem.tsx`, `MessageText.jsx`, `MessagesList.jsx`, service mock) + flow tests** — connects text buffering, skeletons, unified multi-component entrance, strict last-message activation, scroll preservation, and continuity rules (`SC-001`..`SC-004`).
5. **Development simulation harness (`src/dev/simulateComponentStreams.ts`, `src/index.jsx`) + unit test** — wires local `npm run dev` debug buttons for manual and Design Stage-3 visual verification.
6. **Peer dependency bump (`package.json`) & full quality gate** — align `@weni/webchat-service` peer dependency with the published MINOR release (`AD-005`), run `prettier` -> `lint` -> `typecheck` -> `jest --coverage` -> `build:all`, and verify production bundles exclude `src/dev/`.

**Cross-repository coordination**:

- `flows` and `weni-webchat-socket` deploy additive changes first, followed by `@weni/webchat-service` MINOR release (`AD-005`, `AD-006`) before publishing `@weni/webchat-template-react`.
- After merging this PR (touching `en.json` only), wait for Crowdin's automated PR delivering `pt.json` and `es.json` (`NFR-005`) before QA runs final staging validation (`SC-001`..`SC-004` in `pt`, `en`, `es`) and before `nexus-ai` enables global Shopping Assistant component streaming (`BD-010`).

## Peak Load Plan

- **Declared peak**: Seasonal retail campaign spikes (e.g., Black Friday shopping peak) across all Shopping Assistant storefronts simultaneously (`BD-010`).
- **How this plan sustains it**: Zero additional network or WebSocket traffic is generated by `webchat-react`. All skeleton rendering, stagger calculations, reduced-motion checks, and `aria-live` announcements execute locally in the shopper's browser using CSS compositor-only properties (`transform`, `opacity`), in-flow layout sizing (0 `getBoundingClientRect` reflows), memoized derivations, and at most one active wait timer (`10_000ms`) + one entrance timer (`<= 300ms`) per live message (cleaned up on unmount/completion).
- **How it is verified**: Fake-timer Jest tests confirm single bounded timers and cleanup on unmount; `npm run build:all` confirms zero new dependencies and negligible UMD bundle delta; QA executes >= 20 runs per scenario across floating, fullscreen, mobile, and embedded layouts (`SC-001`..`SC-004`).

## Observability Plan

- **Structured logs added**: `console.warn('[WebChat:ComponentStreaming] ...', context)` in `src/utils/componentStreaming.ts` (`invalid_hint`, `invalid_cta_url`) and `src/hooks/useComponentStreamLifecycle.ts` (`component_timeout`). Zero `console.log` calls; zero PII (`text`, `labels`, `button_text`, `list_items`, `display_text`, `url` are never logged).
- **Correlation identifier**: `messageId` (originating as `msg_id` in `nexus-ai` -> `weni-webchat-socket` -> `@weni/webchat-service` `Message.id`), paired with `channelUuid` and `sessionId` read from `service` session context when available.
- **Error reports**: Opaque identifiers (`channelUuid`, `sessionId`, `messageId`, `componentType`/`componentTypes`, `reason`) only.
- **Signals watched after rollout**: Browser console warnings under `[WebChat:ComponentStreaming]` during staging QA and post-cutover smoke checks (specifically elevated `component_timeout` or `invalid_cta_url` rates indicating upstream contract regressions); no new product analytics signals (`BD-011`).

## Rollout and Rollback Plan

- **Rollout**: Merge feature PR to `main` (with `en.json` source keys only and `@weni/webchat-service` peer updated) -> merge Crowdin translation PR (`pt.json`, `es.json`) -> publish MINOR release of `@weni/webchat-template-react` and standalone UMD bundle -> QA baseline & post-change validation (`SC-001`..`SC-004`) in staging -> `nexus-ai` enables global `use_components=True` gRPC streaming (`BD-010`).
- **Backward compatibility window**: Additive MINOR; works cleanly before `nexus-ai` cutover (via `BD-008` no-hint path) and renders all pre-launch history messages identically (`FR-034`). Previous `webchat-react` versions safely ignore additive `componentHints` / `streamPhase` fields.
- **Rollback**: Republish/pin previous `@weni/webchat-template-react` MINOR bundle independently at any time; `nexus-ai` can also independently revert its `use_components=True` gRPC gate without breaking the new widget (`BD-008`).
- **Migration reversibility**: Not applicable — `webchat-react` introduces zero persisted storage or schema migrations (`BD-007`).

## Divergence Gate

- **Divergences found while planning**: none
- **Tasks blocked by an open amendment**: none
