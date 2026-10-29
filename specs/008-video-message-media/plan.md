# Implementation Plan: Video message media

**Branch**: `008-video-message-media` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-video-message-media/spec.md`

## Summary

`MessageVideo` plays `message.media`, which is the address the service already emits. While the upload is in progress that address is a `blob:` URL. After the ack it is the official `http(s)` link. `message.url` remains a fallback for existing callers of the exported component and is no longer required. This repository does not create the blob URL, revoke it, or write storage.

## Technical Context

**Language/Version**: JavaScript (ES2020+), React 18, JSX. The component stays JSX. The new test is `MessageVideo.test.jsx` because the testing standard requires a colocated `.test.jsx` and the TypeScript toolchain is not configured.
**Primary Dependencies**: `prop-types`, React 18. No new npm dependency. `@weni/webchat-service` is unchanged by this plan.
**Storage**: N/A. The widget does not persist messages.
**Testing**: Jest 29, `@testing-library/react`. New `src/components/Messages/MessageVideo.test.jsx`.
**Target Platform**: Browser widget embedded in storefronts.
**Project Type**: Single frontend library (React, UMD + ESM).
**Performance Goals**: One shopper session, history page of 20 messages, one video playing. The component only sets `src`.
**Constraints**: No new user-facing string. No storage. Do not remap `media` onto `url` in `MessagesList`. Keep `url` working when `media` is absent.
**Scale/Scope**: `MessageVideo.jsx` and one colocated test. `MessagesList` routing stays.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Clean Code & Readability** — PASS. One derived source variable in `MessageVideo`. The list still switches on `message.type`.
2. **Code Style Standards** — PASS. Prettier and the existing ESLint config. No new dependency.
3. **Naming Conventions** — PASS. No new component. The test file matches the component name.
4. **Testing & Quality Assurance** — PASS. The new test covers `media`, the blob-to-official rerender, legacy `url`, and a missing address. Coverage gate stays at 80%.
5. **Semantic HTML & Unnnic** — PASS. The existing `<video controls>` element stays. No new color, spacing, or string. The bubble chrome stays on `MessageContainer`.
6. **Pre-Commit Compliance** — PASS. Format the touched files, then `npm run lint` and `npm test` before the pull request. The localization lock does not apply; no locale file changes.

TypeScript exception for the new test file is the one recorded in the spec (testing standard requires `.test.jsx`; toolchain TODO). Re-checked after Phase 1: the contract keeps `url` as a fallback, so the exported component is not a breaking change. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/008-video-message-media/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── message-video.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/components/Messages/
├── MessageVideo.jsx           # src from media, url as fallback
├── MessageVideo.test.jsx      # new
└── MessagesList.jsx           # unchanged routing
```

**Structure Decision**: Single frontend library. The player change stays inside the existing video component. No context, hook, or service module.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New file is `.test.jsx`, not TypeScript (Principle VIII) | Colocated test required by the testing standard. `TODO(TYPESCRIPT_TOOLCHAIN)` means a `.ts` test cannot run. | Putting the assertions only in `MessagesList.test.jsx` would keep mocking `MessageVideo` and would not mount the real `<video>`. |

## Inherited Context

- Product Spec: none
- Engineering Spec: `specs/008-video-message-media/spec.md`

## Delivery Sequence

1. Change `MessageVideo` so the video `src` is `message.media` when that string is non-empty, otherwise `message.url`. Omit `src` when both are empty. Relax prop-types so `url` and `sender` are not required.
2. Add `MessageVideo.test.jsx` for the four cases in the spec.
3. Run the quickstart commands. Changelog Fixed entry in the same change.

**Cross-repository coordination**: None required to stop the missing-`url` warning. Playback during upload uses the `blob:` URL from `webchat-service` `specs/002-persist-uploaded-media`. That package is pinned at `1.19.2` here. Bumping the pin is a follow-up after the service patch is published, not a task in this plan.

## Peak Load Plan

- Declared peak: one shopper session on a campaign day, a history page of 20 messages, one video playing at a time.
- How this plan sustains it: the component sets one `src`. It does not fetch, copy, or store the file.
- How it is verified: the component test renders one video and rerenders the same message id with a new `media`. No load test.

## Observability Plan

- Structured logs added: none.
- Correlation identifier: none added. The message `id` stays the list row key and is not logged.
- Error reports: the native video element keeps its own error behavior. The `message.url` prop-type warning goes away.
- Signals watched after rollout: the console no longer reports `The prop message.url is marked as required in MessageVideo`.

## Rollout and Rollback Plan

- Rollout: widget release. No flag. Direct deploy with the package.
- Backward compatibility window: callers that pass `url` and not `media` still get a player. Exports are unchanged.
- Rollback: previous widget bundle. This repository does not touch stored sessions.
- Migration reversibility: nothing is persisted here.

## Divergence Gate

Removed. This spec has no Product Spec.
