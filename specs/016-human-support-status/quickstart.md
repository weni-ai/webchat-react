# Quickstart Validation Guide: Visible Human Support Status in Shopping Assistant

**Feature**: `016-human-support-status`  
**Spec**: [specs/016-human-support-status/spec.md](./spec.md)  
**Contracts**: [contracts/human-support-status-ui.md](./contracts/human-support-status-ui.md)

## Prerequisites

- Node.js + npm dependencies installed (`npm install`)
- Git pre-commit localization lock active (`.githooks/pre-commit`, ensuring only `src/i18n/locales/en.json` is edited)
- For end-to-end socket/service integration: `@weni/webchat-service` MINOR release (`AD-002`..`AD-008`). During parallel development on `1.22.0`, `HUMAN_SUPPORT_SCENARIOS` in `src/index.jsx` projects `state:changed` updates locally so every visual and accessibility scenario is runnable immediately in `npm run dev`.

## 1. Automated Quality Gate

Run in the exact order mandated by Constitution `Development Workflow > Local Quality Gate`:

```bash
npx prettier --check src
npm run typecheck
npm run lint
npm test -- --coverage
```

**Expected outcomes**:

- Zero Prettier, TypeScript (`tsc --noEmit`), or ESLint errors.
- Jest passes all existing and new colocated test suites (`humanSupportStatus.test.ts`, `MessageMeta.test.tsx`, `HumanSupportMilestone.test.tsx`, `useWeniChat.test.jsx`, `Header.test.jsx`, `FSBadge.test.jsx`, `MessageContainer.test.jsx`, `TypingIndicator.test.jsx`, `StreamedMessageItem.test.tsx`, `MessagesList.test.jsx`, `ChatContext.test.jsx`, `Notification.test.jsx`, `simulateHumanSupport.test.ts`) with **>= 80%** statements, branches, functions, and lines.

## 2. Production Bundle Verification (Dev Harness Exclusion)

```bash
npm run build:all
```

**Expected outcomes**:

- Both `dist/` (npm library) and `dist-standalone/` (UMD bundle) build cleanly with zero new runtime dependencies.
- `simulateHumanSupport` and `HUMAN_SUPPORT_SCENARIOS` do NOT appear anywhere in `dist/` or `dist-standalone/`.

## 3. Manual Visual & Interactive Validation (`npm run dev`)

Start the local Vite dev playground:

```bash
npm run dev
```

Open `http://localhost:3000` and exercise the `HUMAN_SUPPORT_SCENARIOS` debug buttons in `#actions` (alongside `COMPONENT_STREAM_SCENARIOS`) across desktop floating, fullscreen, and mobile viewport widths:

1. **Transfer & close lifecycle (US 1 — `simulate-hs-transfer-and-close`)**:
   - AI messages display timestamps without ticks (`FR-010`, `FR-022`).
   - On transfer, the green `"Human support"` tag appears in the header and `"Forwarded to human agent · <time>"` appears in green after the AI transfer message (`FR-001`, `FR-005`).
   - Open a sub-view (e.g., Cart or Product Details) during active human support: the green header tag stays visible; closing human support removes the tag immediately without closing the sub-view (`FR-002`, `FR-003`, `FR-037`).
   - On close, `"Human support ended · <time>"` appears in gray (`FSBadge neutral`), the header tag disappears, and subsequent AI-mode messages have no ticks (`FR-006`, `FR-021`, `FR-022`).
2. **Queue delivery & bulk read (US 2 — `simulate-hs-queue-and-bulk-read`)**:
   - Shopper messages step `pending` (clock + muted text) -> `sent` (single gray `✓`) -> `delivered` (double gray `✓✓`) -> bulk `read` (double blue `✓✓`, `#0366DD`) (`FR-017`..`FR-019`).
   - Scroll up slightly before bulk `read` fires: status icons update in place without moving scroll, focus, or composer text (`FR-038`, `FR-039`).
3. **Read confirmation OFF (US 2 — `simulate-hs-read-confirmation-off`)**:
   - Messages progress to `delivered` (gray `✓✓`) and stay `delivered` even while the agent replies; zero notice, icon, or banner indicates that read confirmation is off (`FR-048`, `FR-051`, `SC-002`).
4. **Send failure (US 2 — `simulate-hs-send-failure`)**:
   - Failed shopper message shows the red `error` icon next to the timestamp, with zero visible error text and no retry button (`FR-023`).
5. **Named agent typing, grouped messages & handoff (US 3 — `simulate-hs-agent-typing-and-handoff`)**:
   - Horizontal 3-dots bubble + `"Julia is typing"` appears while `ThinkingIndicator` is suppressed (`FR-031`, `FR-033`).
   - Consecutive `Julia` messages show `"Julia"` only on the first bubble (`4px` intra-group gap), and timestamp only on the last bubble of the same minute (`FR-014`, `FR-026`).
   - Handoff to a second agent starts a new author group (`16px` gap) with the new first name and no new milestone (`FR-007`, `FR-026`).
   - A long first name truncates on one line with ellipsis on narrow/mobile widths (`FR-025`).
6. **Unnamed agent & Live Desk system message (US 3 — `simulate-hs-unnamed-agent`)**:
   - Typing shows `"Agent is typing"`, and agent/system messages show no name header (`FR-027`, `FR-031`).
7. **Other-day history, grouping, cart notice & streaming (US 4 — `simulate-hs-timestamps-grouping-streaming`)**:
   - Yesterday messages show `"MM/DD · h:mm A"` in `en` and `"DD/MM · HH:mm"` in `pt`/`es` (`FR-012`, `FR-013`).
   - Cart `conversation_status` notice shows no timestamp and never collapses with adjacent milestones (`FR-009`, `FR-016`).
   - Streaming AI response hides its timestamp while text is revealing and displays it only when streaming finishes (`FR-015`).
8. **Offline pending & reconnect after close (US 5 — `simulate-hs-offline-and-reconnect-close`)**:
   - Existing `ConnectionStatusBanner` appears; offline shopper message stays `pending` (clock + muted text); on reconnect, status updates to `delivered`, header tag disappears, and the end milestone shows the original closing time (`FR-035`).
9. **Closed-chat privacy & feature OFF (`simulate-hs-feature-off-prelaunch`)**:
   - With chat closed, incoming agent messages show preview text and unread badge with zero agent name, and milestones do not increment unread count or trigger tooltips (`FR-036`, `BD-008`).
   - With `features.humanSupportStatus: false` or pre-launch messages lacking `author`, zero new UI elements appear (`FR-010`, `BD-006`).
10. **Accessibility check**:
    - Inspect DOM `aria-label` on each status icon (`Sending`, `Sent at <time>`, `Delivered · sent at <time>`, `Read · sent at <time>` — never a read timestamp).
    - Verify `ComponentAnnouncementRegion` (`aria-live="polite"`) announces live start/end milestones and typing start without moving keyboard focus from `InputBox` (`NFR-004`, `FR-038`).
