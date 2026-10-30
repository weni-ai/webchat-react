# Contract: MessageVideo

Exported from `@weni/webchat-template-react` as `MessageVideo`. Patch. `url` stays valid when `media` is absent.

## Props

`message` object:

| Prop | Before | After |
|------|--------|-------|
| `message.media` | ignored | Preferred `src` when non-empty |
| `message.url` | required `src` | Optional fallback `src` |
| `message.sender` | required | Optional, not required for render |
| `message.poster` | optional | unchanged |

## Behavior

- `media` set, including a `blob:` URL: `<video src>` is that value. No prop-type warning about `url`.
- `media` later replaced with an `https://` link on the same message: `src` updates.
- `url` set and `media` absent: `src` is `url`.
- Both absent: no `src`. The existing unsupported-video fallback text stays. The component does not throw.
- This component does not call `URL.createObjectURL` or `URL.revokeObjectURL`.
- This component does not write `localStorage` or `sessionStorage`.

## Unchanged

`MessagesList` still renders `MessageVideo` for `message.type === 'video'`. Image, audio, and file keep reading `message.media` themselves. Package export name is unchanged.
