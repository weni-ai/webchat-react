# Research: Back-in-stock independent of `conversationStarters.pdp`

## One detection path, two flags

**Decision**: Keep `detectAndFetchPdp` as the only product detection path. Its entry guard becomes `shouldResolveProduct = isPdpEnabled || isUnavailableNotifyEnabled`. `requestStarters` stays at the end of that function and runs only when `isPdpEnabled` is true.

**Rationale**: The coupling is a single early return (`isPdpEnabledRef.current` false → `skip` `pdp_disabled`). Everything after that return already does slug, account, fingerprint, generation, `resolveProductData`, `setContext`, and `evaluateBackInStockOffer`. A second path would copy those steps. `applyNavigationChange` currently re-runs detection only when `pdp` is on, so it needs the same derived boolean or SPA navigation would never refresh a notify-only offer.

**Alternatives considered**:

- Making `unavailableProductNotify` imply `conversationStarters.pdp`. That would request starters on every available product page, which is what the integrator turned off.
- A dedicated detection function for back-in-stock. Duplicate of `detectAndFetchPdp`.
- Renaming `detectAndFetchPdp`. The function still detects the PDP and fetches the product. A rename would touch many tests for no behavior change.

## Skip reasons

**Decision**: Keep `reason: 'pdp_disabled'` when both flags are off. Add `reason: 'starters_disabled'` when the product was resolved, no offer was shown, and `pdp` is off.

**Rationale**: `pdp_disabled` already means "this path did not run." Both flags off is still that case, and renaming it would break anyone filtering the debug log. `starters_disabled` is a different event: detection ran, the SKU was available or the evaluator threw, and starters were intentionally not requested. The fingerprint on that event matches the preceding `attempt`.

The `pdp` gate runs before the `shoppingAssistantDisabled` gate. Both skip starters, but `starters_disabled` tells you the integrator turned starters off. Spec `011` keeps the shopping-assistant-disabled return silent.

**Alternatives considered**:

- Reusing `pdp_disabled` for the available-SKU case. That would mix "never looked at the product" with "looked and chose not to request starters."
- A new reason `notify_only`. Less precise: the same skip happens whether notify is on or off, as long as `pdp` is off after a resolved product with no offer. In practice notify is on, because otherwise the entry guard would have stopped earlier.

## Product context is still set

**Decision**: Call `service.setContext` whenever the product is resolved, including when `pdp` is off.

**Rationale**: The back-in-stock success state can send the shopper into a conversation ("Show me similar products") when the shopping assistant is still on. Without the context string, the assistant would not know which product the shopper was looking at. With both flags off the product is not resolved, so no context is set, as today.

**Alternatives considered**: Skipping `setContext` when `pdp` is off. Rejected because of the success-state conversation.

## Warning only needs `unavailableProductNotify`

**Decision**: `init` warns `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify'` when `shoppingAssistantDisabled` is on and `unavailableProductNotify` is off. It does not mention `conversationStarters.pdp`.

**Rationale**: Spec `011` warned when either flag was off, because detection required `pdp`. After this change, a back-in-stock-only storefront is `shoppingAssistantDisabled: true` plus `unavailableProductNotify: true`. Naming `pdp` in the warning would push integrators to turn starters back on. The warning still fires when notify is off, because then nothing can ever show.

**Alternatives considered**: Dropping the warning entirely. A misconfigured `shoppingAssistantDisabled` storefront would still render nothing, with no hint.

## Stay in JavaScript

**Decision**: Edit `useConversationStarters.js` and `standalone.jsx` in place. Do not migrate the hook to TypeScript in this change.

**Rationale**: Principle VIII: existing JS stays JS for small changes. The hook is already above 350 lines. A migration would be larger than the feature.

**Alternatives considered**: Extracting `shouldResolveProduct` into a new `.ts` util. The boolean is two config refs and is only used inside the hook.

## Changelog

**Decision**: If `CHANGELOG.md` exists because spec `011` created it, add an Unreleased Changed entry. If it does not exist, do not create it here; put the note in the GitHub release description, as the spec already allows.

**Rationale**: Spec `011` owns `TODO(CHANGELOG)`. Creating the file in two features would race. The user-facing behavior change is still announced.

**Alternatives considered**: Always creating `CHANGELOG.md` in this feature. That would conflict with `011`'s plan if both land in the same release.
