# Tasks: Video message media

**Input**: Design documents from `/specs/008-video-message-media/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/message-video.md, quickstart.md

**Tests**: Included. The spec's test strategy asks for a colocated `MessageVideo` test, and the constitution requires tests for the behavior change.

**Organization**: Tasks are grouped by user story so each slice can be tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root. This feature's test is colocated under `src/components/Messages/`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the player change does not add a dependency or a store

- [x] T001 Confirm no new npm dependency and no edit to `src/contexts/ChatContext.jsx` or `src/components/Messages/MessagesList.jsx`. `MessagesList.jsx` already routes `message.type === 'video'` to `MessageVideo`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The video row identity stays stable so a later `media` change updates `src` instead of remounting

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Confirm `src/components/Messages/MessagesList.jsx` keeps the row key on `message.id` (`rowKey`) and do not change that key. Constraint from `data-model.md`: `id` is required on the list row and keeps the row mounted when `media` changes

**Checkpoint**: Routing and row identity are unchanged

---

## Phase 3: User Story 1 - Play message.media (Priority: P1) 🎯 MVP

**Goal**: A video message whose `media` is set, including a `blob:` URL, renders a player with that address and does not warn that `message.url` is missing

**Independent Test**: `npm test -- --testPathPattern=MessageVideo` — a message `{ type: 'video', media: 'blob:http://localhost/preview-id', direction: 'outgoing' }` produces a `video` whose `src` is that blob URL, with no prop-type failure for `url`

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [US1] Add `src/components/Messages/MessageVideo.test.jsx` with a failing test that renders `{ type: 'video', media: 'https://example.com/clip.mp4', direction: 'outgoing' }` and `{ media: 'blob:http://localhost/preview-id' }` and expects the `video` `src` to be that address

### Implementation for User Story 1

- [x] T004 [US1] In `src/components/Messages/MessageVideo.jsx`, set `<video src>` from a non-empty `message.media`. Stop requiring `message.url` and `message.sender` in prop-types. Constraint from `data-model.md`: `media` is the preferred player address and is not required when absent; `url` and `sender` are not required. Do not call `URL.createObjectURL` or `URL.revokeObjectURL`

**Checkpoint**: A service message with `media` and no `url` plays and does not warn

---

## Phase 4: User Story 2 - Follow the official link (Priority: P2)

**Goal**: When `media` changes from the blob URL to the official uploaded link, the same player source updates

**Independent Test**: Rerender the same message `id` in `MessageVideo.test.jsx` with `media` changed from `blob:http://localhost/preview-id` to `https://example.com/clip.mp4` and expect `src` to update

### Tests for User Story 2 ⚠️

- [x] T005 [US2] Extend `src/components/Messages/MessageVideo.test.jsx` with a failing rerender: first `media` is `blob:http://localhost/preview-id`, then `media` is `https://example.com/clip.mp4`, and the `video` `src` matches each value

### Implementation for User Story 2

- [x] T006 [US2] Keep `src` derived on each render in `src/components/Messages/MessageVideo.jsx` so the rerender from T005 updates the DOM without storing the previous blob URL in component state

**Checkpoint**: The player follows `media` from the blob URL to the official link

---

## Phase 5: User Story 3 - Legacy url and empty address (Priority: P3)

**Goal**: A caller that still passes `url` and not `media` gets a player. A message with neither address does not set `src` and does not throw

**Independent Test**: `MessageVideo.test.jsx` covers `{ url: 'https://example.com/legacy.mp4' }` without `media`, and a message with neither field

### Tests for User Story 3 ⚠️

- [x] T007 [US3] Extend `src/components/Messages/MessageVideo.test.jsx` with a failing test for legacy `url` without `media`, and a test that neither address leaves the `video` without `src` and does not throw

### Implementation for User Story 3

- [x] T008 [US3] In `src/components/Messages/MessageVideo.jsx`, use non-empty `message.url` only when `message.media` is empty, and omit `src` when both are empty. Keep the existing unsupported-video fallback text. Do not add a locale string

**Checkpoint**: Legacy callers and empty messages match `contracts/message-video.md`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Format, lint, and the quickstart gate

- [x] T009 Run the commands in `specs/008-video-message-media/quickstart.md` (`prettier` on `src/components/Messages/MessageVideo.jsx` and `src/components/Messages/MessageVideo.test.jsx`, then `npm test` for MessageVideo and MessagesList with coverage, then `npm run lint`)
- [x] T010 Add a Fixed entry for the video player reading `message.media` to the changelog file this package uses for the release, or to the PR notes if `CHANGELOG.md` is still absent (`TODO(CHANGELOG)` in `.specify/memory/constitution.md`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on User Story 1, because it rerenders the player User Story 1 creates
- **User Story 3 (Phase 5)**: Depends on User Story 1, because fallback `url` is the other branch of the same `src` expression. It does not depend on User Story 2
- **Polish (Phase 6)**: Depends on the stories you intend to ship. MVP can stop after User Story 1 and still run T009 against that slice

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. No dependency on other stories
- **User Story 2 (P2)**: Starts after User Story 1
- **User Story 3 (P3)**: Starts after User Story 1. Can follow User Story 2 or replace it in order if the official-link rerender is postponed

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Each story edits `src/components/Messages/MessageVideo.jsx` or its test, so the stories are sequential rather than parallel

### Parallel Opportunities

- No `[P]` tasks. The test file and the component are the only files, and each test is written immediately before the code that makes it pass
- `MessagesList.jsx` is not edited, so its existing tests stay a separate check in T009

---

## Parallel Example: User Story 1

```bash
# Not parallel. Write the failing test, then change the component:
Task: "Add media and blob src tests in src/components/Messages/MessageVideo.test.jsx"
Task: "Point video src at message.media in src/components/Messages/MessageVideo.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3
3. **STOP and VALIDATE**: a video with `media` and no `url` renders and does not warn

### Incremental Delivery

1. User Story 1 removes the missing-`url` warning for current service messages
2. User Story 2 covers the blob URL becoming the official link after the service ack
3. User Story 3 keeps exported `url` callers working

### Parallel Team Strategy

One developer. The component and its test cannot be split across people without conflicting edits.

---

## Notes

- Do not create or revoke blob URLs in this repository
- Do not persist `media` in the widget
- The service pin bump for `@weni/webchat-service` is a follow-up, not a task here
- Commit after each story
