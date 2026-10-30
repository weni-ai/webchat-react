# Engineering Specification: Sent media contrast

**Repository**: webchat-react — frontend

**Feature Branch**: `007-sent-media-contrast`

**Created**: 2026-10-29

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: An outgoing file or audio bubble uses the same light gray background as an outgoing text message, but its label, icon, and audio controls are white, so the content has no contrast against the bubble.
- Acceptance criteria:
  - An outgoing file message shows the file icon and the filename in the same foreground as an outgoing text message, readable on the light gray outgoing bubble.
  - An outgoing audio message shows the play and pause icon, the time, the progress track, and the played portion in colors that are readable on that same light gray bubble. The time uses the same foreground as an outgoing text message. The track is distinguishable from the bubble, and the played portion is distinguishable from the unplayed portion.
  - An incoming file message keeps its current dark icon and filename on the white incoming bubble.
  - An incoming audio message uses the same dark foreground as outgoing audio, so the controls stay readable on the white incoming bubble.
  - Opening a file, playing and pausing audio, seeking, and the bubble shape are unchanged.

## Scope in This Repository

**This repository implements**: Foreground and control colors for file (`document` and `file`) and audio message bubbles in the widget, aligned with the outgoing text color already used on the light gray sent bubble.

**Out of scope here**:

- Incoming and outgoing text, image, video, and order bubbles. Their colors stay as they are.
- The bubble background itself (`$fs-color-main-0` for outgoing, `$fs-color-neutral-0` for incoming). This change does not recolor the bubble.
- Message payload shape, upload, playback, and file-open behavior. Owned by the existing widget and `@weni/webchat-service`; this slice only changes how the content is painted.
- Host-page overrides of `--weni-user-message-bubble-color` and `--weni-user-message-text-color`. Those custom properties are not what the sent bubble uses today.

**Depends on**: nothing from another repository. `@weni/webchat-service` already delivers `direction`, `type`, `media`, and document `metadata.filename`. No peer-dependency bump.

This change persists nothing. There is no schema, migration, or stored setting.

## Current State

- `src/components/Messages/MessageContainer.scss` — `.weni-message--outgoing` background is `$fs-color-main-0` (`#F5F5F5`). `.weni-message--incoming` background is `$fs-color-neutral-0` (`#ffffff`).
- `src/components/Messages/MessageText.scss` — `.weni-message-text--incoming` and `.weni-message-text--outgoing` both set `color: $fs-fg-base` (`#1F1F1F`). That is the readable sent-text color on the gray bubble.
- `src/components/Messages/MessageDocument.jsx` — the icon `color` is `'white'` when `message.direction === 'outgoing'` and `'fg-emphasized'` when incoming.
- `src/components/Messages/MessageDocument.scss` — `.weni-message-document__view--outgoing` sets `color: $white`. `.weni-message-document__view--incoming` sets `color: $fg-emphasized`.
- `src/components/Messages/MessageAudio.jsx` — the play button forces `iconColor="white"`, which overrides the tertiary variant color. The component does not branch on `message.direction`.
- `src/components/Messages/MessageAudio.scss` — the progress track is `$white`, the played fill and thumb are `$gray-700`, and `.weni-message-audio__time` is `$fg-inverted` (`$white`). On `#F5F5F5` the time and the white track disappear; on the white incoming bubble the same white controls disappear.
- `src/components/Messages/MessagesList.jsx` — `document` and `file` render `MessageDocument`; `audio` renders `MessageAudio`. Routing stays as it is.
- `src/components/Messages/MessageDocument.test.jsx` — asserts the `--outgoing` and `--incoming` modifier classes, not the foreground color.
- `src/components/Messages/MessageAudio.test.jsx` — covers playback, time, and errors. It does not assert control colors.
- `src/styles/variables.scss` — `$fs-fg-base` is `#1F1F1F`. `$fg-inverted` is `$white`. `$fs-color-neutral-5` is `#ADADAD`.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/components/Messages/MessageDocument.jsx` | modified | Stop passing `white` for the outgoing file icon. |
| `src/components/Messages/MessageDocument.scss` | modified | Outgoing filename color matches sent text. |
| `src/components/Messages/MessageAudio.jsx` | modified | Stop forcing a white play icon. |
| `src/components/Messages/MessageAudio.scss` | modified | Time, track, fill, and thumb contrast on the light bubbles. |
| `src/components/Messages/MessageDocument.test.jsx` | modified | Assert the outgoing icon and label are not white and use the sent-text foreground. |
| `src/components/Messages/MessageAudio.test.jsx` | modified | Assert the play icon is not forced white, and that time and progress use the contrasting tokens. |

### Flow

1. `MessagesList` still wraps the message in `MessageContainer` with `direction` `outgoing` or `incoming`, which paints the gray or white bubble.
2. For a file, `MessageDocument` renders the icon and the filename button. Outgoing uses the same foreground token as `.weni-message-text--outgoing` (`$fs-fg-base`) for both the icon (via `currentColor` or the `fs` token already exposed as a CSS variable the icon can take) and the label. Incoming keeps `fg-emphasized` and `$fg-emphasized`.
3. For audio, `MessageAudio` renders the existing play button, range input, and time. The play button no longer passes `iconColor="white"`; it inherits the dark tertiary/text foreground (`$fs-fg-base` on the audio block, so the icon uses `currentColor`). The time color is `$fs-fg-base`. The unplayed track uses `$fs-color-neutral-5`, which is visible on both `#F5F5F5` and `#ffffff`. The played fill and the thumb use `$fs-fg-base`.
4. Direction does not split the audio palette. Both bubbles are light and both text directions already use `$fs-fg-base`.

### Rejected Alternatives

- Recoloring the outgoing bubble to a dark brand color and keeping white content: the sent text bubble is light gray with dark text. Matching that visual is the request; a dark bubble would diverge from sent text.
- Using `--weni-user-message-text-color` (`#ffffff`): that custom property is the legacy white sent-text color and is what makes the current content fail on the gray bubble. The live sent-text color is `$fs-fg-base`.
- Leaving incoming audio white: the player has one style. White controls on the white incoming bubble fail the same way. A direction split would duplicate the palette for no contrast gain.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `MessageDocument` and `MessageAudio` props | unchanged | none | yes |
| Normalized `document`, `file`, and `audio` messages from `@weni/webchat-service` | unchanged | none | yes |
| Package exports, `window.WebChat`, and documented CSS custom properties | unchanged | none | yes |
| `weni-message-document__view--outgoing` and `weni-message-audio` class names | modified appearance only; class names stay | patch | yes |

**Consumers affected**: none. Host pages are not notified. No deprecation path is required because no public name or option is removed.

## Non-Functional Requirements

### Peak Load

No new requests and no new work per message beyond the styles the browser already applies. A seasonal sales peak produces the same volume of file and audio bubbles the widget already renders.

### Observability

No new logs. Do not log filenames, media URLs, or message contents. Existing `console.error` calls in `MessageAudio` for playback failure stay as they are and must not start including the media URL.

### Failure Handling

Color changes do not add a network call, timeout, or retry. File open and audio playback keep their current behavior: a document the widget cannot open does not call `window.open`; an audio element that errors disables the controls and still shows the contrasting time and track. Painting is local and idempotent.

### Security and Authorization

No new input crosses the trust boundary. The filename stays text content of the button, not HTML. This repository does not authorize the message; it displays what the service already delivered. Media URLs are unchanged.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| Outgoing file icon and filename match sent text and are readable on the gray bubble | `MessageDocument.test.jsx`: render `direction: "outgoing"`. The icon color is not `white` and resolves to the sent-text foreground (`currentColor` or the `$fs-fg-base` variable). The button keeps `weni-message-document__view--outgoing`, and that rule sets `color: $fs-fg-base` rather than `$white`. |
| Outgoing audio controls contrast on the gray bubble, and the time matches sent text | `MessageAudio.test.jsx`: the play button is not passed `iconColor="white"`. `.weni-message-audio__time` uses `$fs-fg-base`. The track rule uses `$fs-color-neutral-5`. The played fill and thumb use `$fs-fg-base`. |
| Incoming file keeps its dark foreground | `MessageDocument.test.jsx`: incoming icon color stays `fg-emphasized` and the button keeps `weni-message-document__view--incoming`. |
| Incoming audio uses the same dark foreground | The audio rules above are not scoped to outgoing, so the same assertions cover an incoming message. |
| Open, play, pause, and seek still work | Existing `MessageDocument` open tests and `MessageAudio` playback, seek, and error tests stay green. |

**Flow coverage**: an outgoing file from props to icon and filename color; an outgoing and an incoming audio message from props to play icon, time, and progress colors; an incoming file keeping its current colors.

**Failure paths covered**: the existing audio error path (controls disabled, no playback) still renders the contrasting time and track. A document type the widget cannot open still does not call `window.open`.

**Stubbed at the boundary**: `window.open` and the `HTMLMediaElement` play API, as the current tests already do. No service is called.

## Rollout and Rollback

Ship inside the normal widget release. No feature flag. The change is done when a production widget build shows a sent file and a sent audio message with dark content on the light gray bubble, readable the way a sent text message is. Rollback is reverting that widget build. Older widgets keep the white content on the same service messages. The previous widget version still works against the same payloads.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| II. Security and secrets | No new dependency, secret, or HTML interpolation. The filename stays text. | none |
| III. Observability | No new logs. Existing audio errors stay on `console.error` and must not include the media URL. | none |
| IV. Versioned contracts | No package export, `window.WebChat` option, CSS custom property, or `weni-` class name is added or removed. Appearance of existing classes changes in a backward-compatible patch. | none |
| V. Specification traceability | Opens with Origin Without Product Spec. Nothing is inherited, so nothing diverges. | none |
| VIII. Type safety | The edit stays in the existing `.jsx` files. | Bug fix in existing JavaScript. A TypeScript migration of these components is out of scope, and the toolchain TODO still blocks new `.ts` files. Props stay on `prop-types`. |
| XII. Component architecture | Reuse `Icon` and `Button`. Do not introduce a new control. | none |
| XIII. Styling, BEM, and tokens | Colors come from existing tokens (`$fs-fg-base`, `$fs-color-neutral-5`, `$fg-emphasized`). No new raw hex. Class names stay BEM with the `weni-` prefix. | none |
| Accessibility | Foreground on the outgoing bubble matches sent text (`#1F1F1F` on `#F5F5F5`). The play control keeps its existing `aria-label`. Color is not the only cue for play state; the icon name still switches between play and pause. | none |
| Testing | Colocated component tests cover the color outcome and keep the existing behavior tests. | none |
| Changelog maintenance | User-facing visual fix. | `CHANGELOG.md` does not exist yet (`TODO(CHANGELOG)` in the constitution). This change does not create that file. The release notes for the widget version that ships the fix list it under Fixed. |

## Implementation Decisions

- **Sent-text token**: outgoing file content and all audio chrome use `$fs-fg-base`, the token `.weni-message-text--outgoing` already uses. They do not use `$fg-inverted`, `$white`, or `--weni-user-message-text-color`.
- **Audio track**: the unplayed track is `$fs-color-neutral-5` so it remains visible on both `#F5F5F5` and `#ffffff`. The played portion and the thumb are `$fs-fg-base`.
- **Play icon**: remove the `iconColor="white"` override and set the audio block color to `$fs-fg-base` so the icon paints with `currentColor`. The button stays `variant="tertiary"` and `size="small"`.
- **Incoming file**: unchanged. It already uses `$fg-emphasized` on the white bubble.
- **Incoming audio**: same palette as outgoing audio, because both bubbles are light and the player is one component.
