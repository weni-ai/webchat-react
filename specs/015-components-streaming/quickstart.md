# Quickstart Validation Guide: Shopping Assistant Components Streaming

**Feature**: `015-components-streaming`  
**Spec**: [specs/015-components-streaming/spec.md](./spec.md)  
**Contracts**: [contracts/component-streaming-ui.md](./contracts/component-streaming-ui.md)

## Prerequisites

- Node.js + npm dependencies installed (`npm install`)
- Git pre-commit localization lock active (`.githooks/pre-commit`, ensuring only `src/i18n/locales/en.json` is touched)
- For end-to-end service frame processing: `@weni/webchat-service` MINOR release (`AD-005`, `AD-006`). During parallel development on `1.21.0`, the dev harness in `src/index.jsx` automatically drives `AD-005` state transitions so all visual and interaction scenarios are runnable immediately.

## 1. Automated Quality Gate

Run in the exact order required by Constitution `Development Workflow > Local Quality Gate`:

```bash
npx prettier --check src
npm run typecheck
npm run lint
npm test -- --coverage
```

**Expected outcomes**:

- Zero Prettier, ESLint, or TypeScript (`tsc --noEmit`) errors.
- Jest passes all existing and new colocated suites (`componentStreaming.test.ts`, `usePrefersReducedMotion.test.ts`, `useComponentStreamLifecycle.test.ts`, `ComponentSkeleton.test.tsx`, `ComponentAnnouncementRegion.test.tsx`, `StreamedMessageItem.test.tsx`, `QuickReplies.test.jsx`, `ListMessage.test.jsx`, `CallToAction.test.jsx`, `views/ListMessage.test.jsx`, `MessageText.test.jsx`, `MessagesList.test.jsx`, `useStreamingBuffer.test.js`, `simulateComponentStreams.test.ts`) with **>= 80%** statements, branches, functions, and lines.

## 2. Production Bundle Verification (Dev Harness Exclusion)

```bash
npm run build:all
```

**Expected outcomes**:

- Both `dist/` (library) and `dist-standalone/` (UMD) build cleanly.
- `simulateComponentStreams` and `#actions` debug buttons from `src/index.jsx` do NOT appear in `dist/` or `dist-standalone/`.

## 3. Manual Interactive Validation (`npm run dev`)

Start the Vite dev playground:

```bash
npm run dev
```

Open `http://localhost:3000` and use the streaming debug buttons in `#actions` (alongside `Simulate WhatsApp coupon opt-in` and `Simulate streamed rationale`) to verify each scenario across floating, fullscreen, and mobile viewport widths:

1. **Quick replies — 3 options & 6 options (multi-line wrap)**:
   - Skeletons appear immediately at text start with exact button width and wrapped height (no layout jump on swap; `SC-003`).
   - Clicking buttons while text is typing or during the `<= 300ms` staggered entrance has no effect (`SC-002`, `SC-004`).
   - After entrance finishes, buttons activate and the polite live region announces `"3 options available"` / `"6 options available"` without moving focus.
   - Clicking an option sends the label once and disables all buttons on that message.
2. **List message — known vs. unknown `item_count`**:
   - Trigger button skeleton swaps smoothly; opening the list animates items in sequence (`<= 300ms` total).
   - Screen-reader announcement includes the count when `item_count` is present (`"List with 9 options available"`) and omits it when absent (`"List of options available"`).
   - Selecting an item and clicking Send closes the list, appends the user message, and disables the trigger button.
3. **CTA — ready URL vs. 1.5s delayed URL**:
   - With delayed URL, the text caret disappears at `stream_text_end` while the skeleton continues shimmering; no partial URL appears in the DOM or announcement.
   - When `stream_component` arrives with the full `https://` URL, CTA enters with `180ms` grow-in disabled, then activates and announces `"<label> link available"`.
4. **Multi-component (`list_message` + `cta_message` + `quick_replies`)**:
   - Skeletons appear in order: list trigger, CTA, quick replies.
   - All buttons enter together in one unified `<= 300ms` sequence only once all components are complete, followed by sequential polite announcements in order.
5. **Edge & failure scenarios**:
   - **Mid-stream hint (~60%)**: Skeleton appears mid-stream; buttons still wait for text end.
   - **Hint without labels**: Skeleton uses `120px` (`210px` for CTA) fallback width.
   - **No hint (`BD-008`)**: No skeleton; buttons enter in sequence after text ends.
   - **Undelivered component timeout**: Skeleton disappears silently 10s after text end with no error UI and a single PII-free `[WebChat:ComponentStreaming]` console warning.
   - **Scroll preservation**: Scroll up while a stream is running — incoming deltas and skeleton swaps must NOT pull scroll back to bottom.
   - **Continuity & sub-views**: Open Cart or close chat while a stream completes, then return — message renders in final state with zero skeleton/animation; sub-view is never closed while open.
   - **Reduced motion**: Enable `prefers-reduced-motion: reduce` in browser DevTools — skeleton is static (no shimmer), components still wait for text end, then appear and activate immediately (`0ms`) without animation.
