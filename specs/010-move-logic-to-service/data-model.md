# Data model: Move logic to service

This package does not own the storefront snapshot, the pending-cart map, or the voice-session state machine. Those are defined in `webchat-service` `specs/003-move-logic-to-service/data-model.md`. The widget holds render state derived from events.

## Render state that stays

| State | Owner | Source after this change |
|-------|--------|--------------------------|
| `isChatOpen`, unread count, page stack (`currentPage`, `goBack`) | `ChatContext` | Local UI. Checkout close is triggered by `storefront:entered-checkout`, not by `isCheckoutPage()`. |
| Messages and connection | `ChatContext` via the service | Unchanged. `useWeniChat` still sorts and groups them for bubbles. |
| Starter questions, compact visibility, dismissal | `useConversationStarters` | Questions come from `starters:received`. Visibility timers stay local. Product identity comes from `storefront:changed`. |
| Displayed cart quantities | `OrderFormContext` | Last `cart:updated` value. `cart:failed` restores the previous displayed quantity. |
| Voice screen phase | `useVoiceMode` | `voice:state` and `voice:error`. |

## Fields the widget stops storing

Account, product path, SKU, seller, availability, pending-cart debounce deadlines, and voice tokens. Those move to the service. This package adds no `localStorage` key.

## Validation at the boundary

The widget does not re-parse the host document. It treats a missing snapshot as "not a product page" and renders no starters. Quantity controls still refuse a new flush while a flush for that item has not produced `cart:updated` or `cart:failed`.
