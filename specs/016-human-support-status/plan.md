# Implementation Plan: Visible Human Support Status in Shopping Assistant

**Branch**: `016-human-support-status` | **Date**: 2026-11-25 | **Spec**: [specs/016-human-support-status/spec.md](./spec.md)  
**Input**: Engineering specification from `/specs/016-human-support-status/spec.md`

## Summary

Implement Shopping Assistant human support visibility in `@weni/webchat-template-react`, gated behind `state.features.humanSupportStatus === true` (`BD-006`, `AD-008`), consuming the additive `@weni/webchat-service` state (`features.humanSupportStatus`, `humanSupport.active`, `typingAuthor`) and `Message` fields (`author`, `orderKey`, `status`, `type: 'human_support_event'` + `humanSupportEvent`). A new strict TypeScript layer (`src/utils/humanSupportStatus.ts`, `src/components/Messages/MessageMeta.tsx`, `src/components/Messages/HumanSupportMilestone.tsx`) provides deterministic locale date/time formatting (`en` 12h + `MM/DD`, `pt`/`es` 24h + `DD/MM`), author-and-minute grouping, WCAG-compliant (`>= 3:1`) Material Symbols status icons (`schedule`, `check`, `done_all`, `error`) with sent-time `aria-label`s, and non-collapsing start/end milestone pills (`FSBadge` extended with `neutral`). Targeted updates to `ChatContext.jsx`, `useWeniChat.js`, `Header.jsx`, `MessageContainer.jsx`, `TypingIndicator.jsx`, `StreamedMessageItem.tsx`, and `MessagesList.jsx` preserve server `orderKey` ordering (`AD-002`), show the green `"Human support"` header tag across all sub-views (never alongside `Live`/`Preview` `ModeTag`), render Live Desk agent first names without leaking into closed-chat `Notification` previews (`FR-036`), display the Stage 3 Figma horizontal human-typing indicator while suppressing `ThinkingIndicator`, announce live milestones and typing transitions politely via `ComponentAnnouncementRegion` without moving focus (`NFR-004`), and keep scroll position stable on in-place status transitions (`FR-039`). English source keys are added solely to `src/i18n/locales/en.json` (Crowdin owns `pt`/`es`/`ro`), and a dev-only visual debug module (`src/dev/simulateHumanSupport.ts`) wired into `src/index.jsx` alongside `COMPONENT_STREAM_SCENARIOS` enables local manual QA in `npm run dev` with zero footprint in production builds.

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict: true`) for all new modules + existing JavaScript/JSX (ES2020) for minimal targeted edits  
**Primary Dependencies**: React 18, `@weni/webchat-service` (peer bumped from `1.22.0` to new MINOR `1.23.0`), `react-i18next` / `i18next`, `@material-symbols/svg-400`, `dompurify`, `marked`, `prop-types`, Sass/SCSS with `postcss-prefix-selector` (zero new runtime npm dependencies)  
**Storage**: None — `webchat-react` persists nothing; history, milestones, author snapshots, and statuses are owned by `weni-webchat-socket` / `@weni/webchat-service` (`BD-007`)  
**Testing**: Jest 29 + jsdom + `@testing-library/react` + `@testing-library/user-event` (`>= 80%` statements, branches, functions, lines)  
**Target Platform**: Modern storefront browsers (desktop floating, fullscreen, mobile, embedded) via npm library (`dist/`) and standalone UMD bundle (`dist-standalone/`)  
**Project Type**: Frontend React widget library + standalone UMD bundle  
**Performance Goals**: `O(n)` memoized grouping/formatting over loaded messages, 0 forced layout reflows, 0 extra network/WebSocket requests, rendering well within the `<= 0.5s` socket-to-widget slice of `NFR-001` (`P95 <= 2s` end-to-end) and handling bulk `read` updates of up to 200 message IDs smoothly  
**Constraints**: `>= 3:1` contrast on status icons and milestones (`NFR-003`); polite `aria-live` without focus movement (`NFR-004`); no PII in logs or closed-chat previews (`BD-003`, `FR-036`); strict localization lock (`en.json` only); read-confirmation setting invisible to shopper (`FR-051`); dev debug scenarios excluded from production builds  
**Scale/Scope**: All Shopping Assistant channels after allowlist rollout (`BD-005`, `AD-007`); 3 new production TypeScript modules + 1 dev-only TypeScript module + targeted updates to 11 existing modules/styles/locale/mocks

## Constitution Check

*GATE: Checked pre-design (Phase 0) and re-checked post-design (Phase 1). All gates PASS.*

1. **Clean Code & Readability (Principles VII, IX, X)**: PASS — English code, types, comments, and docs; focused new modules well under 350 lines (`humanSupportStatus.ts`, `MessageMeta.tsx`, `HumanSupportMilestone.tsx`, `simulateHumanSupport.ts`) keep edits to pre-existing >350-line files (`ChatContext.jsx`, `MessagesList.jsx`, `src/index.jsx`) minimal; object maps (`STATUS_META_MAP`, `MILESTONE_CONFIG_MAP`) replace `switch` statements in all new dispatch logic; Prettier + ESLint clean.
2. **Security, Dependencies & Versioned Contracts (Principles II, IV, VIII)**: PASS — Zero new npm dependencies (`check.svg` and `done_all.svg` already ship in `@material-symbols/svg-400`); `@weni/webchat-service` peer explicitly bumped as MINOR; all new files in strict TypeScript with zero `any`; modified `.jsx` files keep accurate `prop-types`; `author.name` / `typingAuthor.name` rendered as React text nodes (never `dangerouslySetInnerHTML`); `author.id` never exposed in DOM or URLs; markdown stays DOMPurify-sanitized.
3. **Naming & Component Architecture (Principles XI, XII)**: PASS — `PascalCase` for React components (`MessageMeta.tsx`, `HumanSupportMilestone.tsx`), `camelCase` for utilities/dev helpers (`humanSupportStatus.ts`, `simulateHumanSupport.ts`); reuses `FSBadge`, `Icon`, `MessageContainer`, `TypingIndicator`, and `ComponentAnnouncementRegion` instead of raw elements.
4. **Styling, BEM, Tokens & Accessibility (Principle XIII; Quality Standards > Accessibility & i18n)**: PASS — Scoped `weni-` BEM classes using existing `src/styles/variables.scss` tokens (`$sl-color-green-3`, `$sl-color-blue-10`, `$sl-color-gray-1`, `$fg-base-soft`, `$fg-critical`, `$fs-fg-base`, `$fs-color-text`, `$spacing-1`..`$spacing-4`); all status icons (`>= 4.13:1`) and milestone pills (`> 16:1`) exceed `3:1` contrast (`NFR-003`); `aria-label`s reference sent time only; polite live announcements never move focus (`NFR-004`); only `src/i18n/locales/en.json` edited (`pt.json`, `es.json`, `ro.json` untouched per Crowdin exception).
5. **State, Async Correctness, Observability & Traceability (Principles I, III, V, VI, XIV, XV)**: PASS — `features.humanSupportStatus`, `humanSupport`, `typingAuthor`, and `messages` remain owned by `@weni/webchat-service` via `ChatContext`/`useWeniChat`; monotonic statuses and non-hidden `error` indicators prevent contradictory states; PII-free `[WebChat:HumanSupportStatus]` `console.warn` logs with `channelUuid`, `sessionId`, `messageId`, `eventId`; Conventional Commits; pinned Product Spec & Architecture Doc with `Divergences: none`.
6. **Testing & 80% Coverage Gate (Quality Standards > Testing)**: PASS — Colocated `<name>.test.ts(x)` / `<name>.test.js(x)` tests for every new and modified module (including `src/dev/simulateHumanSupport.test.ts`), covering `SC-001`, `SC-002`, all flows, edge cases, and failure paths at `>= 80%` across statements, branches, functions, and lines.

## Project Structure

### Documentation (this feature)

```text
specs/016-human-support-status/
├── spec.md                                 # Engineering specification (pinned to 009-sa-human-support-status commits)
├── plan.md                                 # This file (/speckit-plan output)
├── research.md                             # Phase 0 design decisions and rationale
├── data-model.md                           # Phase 1 TypeScript entities, grouping & state transitions
├── quickstart.md                           # Phase 1 automated & manual validation guide
├── contracts/
│   └── human-support-status-ui.md          # Phase 1 service, component prop, BEM, i18n, log & dev harness contracts
├── checklists/
│   └── requirements.md                     # Engineering spec quality validation checklist (24/24 passed)
└── tasks.md                                # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── utils/
│   ├── humanSupportStatus.ts               # NEW: types, validation, author keys, grouping metadata, locale date/time formatter, STATUS_META_MAP
│   ├── humanSupportStatus.test.ts          # NEW: colocated unit tests (en/pt/es, same/other day, grouping, validation, PII-free logs)
│   └── icons.js                            # MOD: register check & done_all Material Symbols SVGs
├── contexts/
│   ├── ChatContext.jsx                     # MOD: expose isHumanSupportFeatureEnabled, isHumanSupportActive, typingAuthor; skip human_support_event in unread/tooltip
│   └── ChatContext.test.jsx                # NEW/MOD: verify new state exposure and closed-chat milestone filtering
├── hooks/
│   ├── useWeniChat.js                      # MOD: preserve server orderKey order when feature ON; author-identity grouping & display metadata
│   └── useWeniChat.test.jsx                # NEW: colocated unit tests for orderKey preservation & author/milestone/cart grouping
├── components/
│   ├── common/
│   │   ├── FSBadge.jsx / .scss             # MOD: add neutral variant ($sl-color-gray-1, 2px white border)
│   │   └── FSBadge.test.jsx                # NEW: colocated unit tests for success & neutral variants
│   ├── Header/
│   │   ├── Header.jsx / .scss              # MOD: render green Human support tag across views (suppressed when showMode is true)
│   │   └── Header.test.jsx                 # MOD: test tag visibility, sub-view persistence, showMode exclusivity, feature gate
│   ├── Notification/
│   │   └── Notification.test.jsx           # NEW/MOD: verify closed-chat preview never renders agent name
│   └── Messages/
│       ├── MessageMeta.tsx / .scss         # NEW: below-bubble timestamp + accessible 16px status icon row
│       ├── MessageMeta.test.tsx            # NEW: colocated unit tests for statuses, aria-labels, AI mode, read-confirm OFF
│       ├── HumanSupportMilestone.tsx / .scss # NEW: centered start (green) & end (gray) milestone pills via FSBadge
│       ├── HumanSupportMilestone.test.tsx  # NEW: colocated unit tests for start/end formatting & invalid payload handling
│       ├── MessageContainer.jsx / .scss    # MOD: optional authorName prop with single-line ellipsis
│       ├── MessageContainer.test.jsx       # NEW: colocated unit tests for authorName rendering & truncation class
│       ├── TypingIndicator.jsx / .scss     # MOD: optional label prop + Stage 3 Figma horizontal bubble/label layout
│       ├── TypingIndicator.test.jsx        # NEW: colocated unit tests for dot-only vs labeled human-agent layout
│       ├── StreamedMessageItem.tsx         # MOD: forward authorName, defer MessageMeta while streaming/buffering, route error icon when feature ON
│       ├── StreamedMessageItem.test.tsx    # MOD: test streaming timestamp deferral & authorName/meta integration
│       ├── MessagesList.jsx / .scss        # MOD: render milestones, pass displayMeta & authorName, suppress ThinkingIndicator, polite live announcements, scroll guard on status updates, 4px grouped gap
│       └── MessagesList.test.jsx           # MOD: end-to-end flow tests (SC-001, SC-002, grouping, scroll stability, announcements, sub-views, failure paths)
├── types/
│   └── ambient.d.ts                        # MOD: ambient TS types for FSBadge, MessageContainer, MessageText, useWeniChat additions
├── i18n/locales/
│   └── en.json                             # MOD: human_support.* English source keys ONLY
├── dev/
│   ├── simulateHumanSupport.ts             # NEW: dev-only HUMAN_SUPPORT_SCENARIOS & runHumanSupportScenario (with 1.22.0 state fallback)
│   └── simulateHumanSupport.test.ts        # NEW: colocated unit tests (preserves >=80% Jest coverage)
└── index.jsx                               # MOD: map HUMAN_SUPPORT_SCENARIOS into #actions visual debug buttons (dev only)

test/
└── __mocks__/@weni/webchat-service.js      # MOD: add features, humanSupport, typingAuthor & test helper emitters

package.json                                # MOD: bump @weni/webchat-service peerDependency once 1.23.0 is published
```

**Structure Decision**: Preserves the single-package React widget architecture under `src/` with colocated `<name>.test.ts(x)` / `<name>.test.js(x)` tests per Constitution `Testing` and `Naming Conventions`. Dev-only visual debug scenarios live under `src/dev/simulateHumanSupport.ts` and are imported exclusively by `src/index.jsx` (`npm run dev`), keeping `src/index.js` and `src/standalone.jsx` production entry points clean.

## Complexity Tracking

No Constitution `MUST` violations introduced. Pre-existing repository exceptions are documented in `spec.md > Constitution Alignment` (`ChatContext.jsx`, `MessagesList.jsx`, and `src/index.jsx` already exceeding 350 lines; untagged upstream Product Spec/Architecture Doc pinned to immutable commit SHAs per Gate 0; `TODO(CHANGELOG)`; decorative `2px` milestone border; Crowdin post-merge translation exception).

---

## Inherited Context

- Product Spec: Atendimento humano visível no Shopping Assistant (tag, marcos, horário, status de leitura e nome do atendente) — https://github.com/weni-ai/vtex-cx-experience-specs/blob/5dbf6b398115c695326e59d65ce7113a8acaa97d/specs/009-sa-human-support-status/spec.md
- Pinned version: commit `5dbf6b398115c695326e59d65ce7113a8acaa97d` (2026-11-24 amendment for Live Desk read confirmation; no tag exists yet on `vtex-cx-experience-specs`, pinned to exact commit SHA per Gate 0)
- Architecture doc: https://github.com/weni-ai/vtex-cx-experience-specs/blob/4f2c4b4906e7a53c53bdbb89dd75a0cedb492b27/specs/009-sa-human-support-status/architecture.md (commit `4f2c4b4906e7a53c53bdbb89dd75a0cedb492b27`; tag `009-sa-human-support-status/arch-v1` pending approval)
- Engineering Spec: `specs/016-human-support-status/spec.md`

## Delivery Sequence

1. **Core utilities, types, icons & i18n (`humanSupportStatus.ts`, `icons.js`, `en.json`, `ambient.d.ts`) + unit tests** — establishes the single source of truth for locale date/time formatting, author-key & minute grouping, payload validation, status icon/aria-label mapping, and English source strings with zero component coupling.
2. **Presentational primitives (`FSBadge`, `MessageMeta.tsx/.scss`, `HumanSupportMilestone.tsx/.scss`, `MessageContainer`, `TypingIndicator`) + colocated unit tests** — builds and tests all visual building blocks matching Stage 3 Figma and WCAG `>= 3:1` contrast before wiring into chat state.
3. **Context, ordering & grouping (`ChatContext.jsx`, `useWeniChat.js`, `test/__mocks__/@weni/webchat-service.js`) + colocated unit tests** — exposes `isHumanSupportFeatureEnabled`, `isHumanSupportActive`, and `typingAuthor`, filters `human_support_event` out of closed-chat unread/tooltip handling, preserves server `orderKey` ordering, and computes author/milestone/cart groups and display metadata.
4. **Header & message list integration (`Header.jsx/.scss`, `StreamedMessageItem.tsx`, `MessagesList.jsx/.scss`, `Notification.test.jsx`) + end-to-end flow tests** — wires the green `"Human support"` header tag, milestones, timestamps (deferred while streaming), status icons, agent names, human typing indicator with `ThinkingIndicator` suppression, polite `ComponentAnnouncementRegion` announcements (non-re-announcing history/heartbeats), and in-place status scroll stability (`SC-001`, `SC-002`).
5. **Development-only visual debug harness (`src/dev/simulateHumanSupport.ts`, `src/index.jsx`) + unit tests** — adds the 9 `HUMAN_SUPPORT_SCENARIOS` buttons alongside `COMPONENT_STREAM_SCENARIOS` in `npm run dev` for manual visual verification against Figma frames US 1–US 5.
6. **Peer dependency bump (`package.json`) & full local quality gate** — aligns `@weni/webchat-service` peer dependency with the published MINOR release (`1.23.0`), runs `prettier` -> `typecheck` -> `lint` -> `jest --coverage` -> `build:all`, and confirms production bundles exclude `src/dev/`.

**Cross-repository coordination**:

- Per the Architecture Document *Delivery Sequence*, receptors deploy before producers (`weni-webchat-socket` with empty allowlist & `courier` -> `mailroom` -> `chats-engine` & Live Desk front-end including the project read-confirmation setting -> `@weni/webchat-service` MINOR -> `@weni/webchat-template-react` MINOR).
- After merging this PR (touching `en.json` only), wait for Crowdin's automated PR delivering `pt.json` and `es.json` before publishing the release, letting CDN cache expire, enabling VTEX test project channels in `weni-webchat-socket`'s allowlist for QA (`SC-001`, `SC-002`), and setting `*` for general rollout (`BD-006`).

## Peak Load Plan

- **Declared peak**: Production baseline (2026-11-23, 30-day Mimir / 24-hour Loki) of ≈ 29,900 concurrent socket connections peak and up to ≈ 700/min new actions across all WWC channels (≈ 20/min start/end milestones, ≈ 135/min `sent`/`delivered`/`read` updates with up to 200 IDs per batch read, ≈ 370/min typing heartbeats).
- **How this plan sustains it**: `webchat-react` runs strictly in the shopper's browser for their single conversation and issues zero extra HTTP or WebSocket calls. Grouping and display metadata run in `O(n)` inside `useMemo` in `useWeniChat.js`, formatting uses pure local `Date` getters with zero `Intl` object allocation per render, SVG status icons reuse static Vite-bundled components (`vite-plugin-svgr`), and in-place status updates avoid `scrollToBottom()` / forced layout reflows even during a 200-message bulk `read` transition.
- **How it is verified**: Jest unit tests exercise 200-message bulk `read` updates without scroll invocation (`FR-039`), `npm run build:all` confirms zero new dependencies and minimal bundle delta, and staging QA validates `NFR-001` (`<= 2s` P95) and `NFR-005` on test channels before setting `*` in the socket allowlist.

## Observability Plan

- **Structured logs added**: `console.warn('[WebChat:HumanSupportStatus] ...', context)` in `src/utils/humanSupportStatus.ts` (`invalid_milestone`, `invalid_author`, `invalid_status`). Zero `console.log` calls; zero PII (`text`, `author.name`, `typingAuthor.name`, email, last name, phone, order data never logged).
- **Correlation identifier**: `messageId` (`Message.id` / shopper `message.id`) and `eventId` (deterministic milestone UUID from `mailroom`), paired with `channelUuid` and `sessionId` read from `service` session context when available.
- **Error reports**: Opaque identifiers only (`channelUuid`, `sessionId`, `messageId`, `eventId`, `status`, `reason`).
- **Signals watched after rollout**: Browser console warnings under `[WebChat:HumanSupportStatus]` during test-channel QA (`SC-001`, `SC-002`) and post-release smoke checks; elevated `invalid_milestone` or `invalid_author` counts signal an upstream contract mismatch.

## Rollout and Rollback Plan

- **Rollout**: Deploy backend services & Live Desk read-confirmation setting (default ON, `weni-webchat-socket` allowlist empty) -> publish `@weni/webchat-service` MINOR -> merge `webchat-react` PR (`en.json` only) -> merge Crowdin `pt.json`/`es.json` PR -> publish `@weni/webchat-template-react` MINOR & UMD bundle and allow CDN cache to expire -> enable VTEX test channels in socket allowlist for QA (`SC-001`, `SC-002`) -> set allowlist to `*` (`AD-007`).
- **Backward compatibility window**: Purely additive MINOR; when `state.features.humanSupportStatus` is `false` or absent (allowlist empty or older `@weni/webchat-service`), the widget renders identically to `2.22.0`. Pre-launch messages without `author` keep rendering without timestamp, name, or status (`FR-010`).
- **Rollback**:
  - Instant server-side kill switch: clear `weni-webchat-socket`'s channel allowlist (`AD-007`), immediately reverting all widgets to legacy behavior without redeploying `webchat-react`.
  - Independent frontend rollback: republish/pin previous `@weni/webchat-template-react` MINOR bundle safely at any time because `@weni/webchat-service` additions are backward compatible.
- **Migration reversibility**: Not applicable — `webchat-react` introduces zero persisted storage or schema migrations (`BD-007`).

## Divergence Gate

- **Divergences found while planning**: none
- **Tasks blocked by an open amendment**: none
