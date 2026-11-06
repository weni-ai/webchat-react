# Data model: Back-in-stock logic and request in the service

Nothing is persisted. No storage key, schema, or migration.

The service's field rules are in webchat-service `specs/003-back-in-stock-to-service/data-model.md`. This file is only the widget's state and the values it passes across.

## Offer handoff

`detectAndFetchPdp` already computes `normalized` (the `normalizeForContext` result) and `selectedSkuId`. It passes both through unchanged.

```text
evaluateBackInStockOffer({ product: normalized, selectedSkuId })
→ { isUnavailable, skuId, seller }
```

`showBackInStockNotify` stores `skuId` and `seller` in the existing refs (`notifySkuIdRef`, `notifySellerRef`). The page props stay `{ productName, skuId, seller }`.

The `unavailableProductNotify` flag stays on the widget config. When it is off, the method is not called.

## Form state

Unchanged states, owned by `BackInStockNotify`:

| State | Meaning |
|-------|---------|
| editing | Name, calling code, national number. Calling code still defaults from `loadStoreCountryAlpha3`. |
| invalid | `showNameError` or `showPhoneError`, from the service codes below. |
| submitting | `isSubmitting`. A second submit returns immediately. |
| success | `submitted`. Set in `finally`, whether the promise resolves or rejects. |

## Values passed to the service

| Call | Widget value |
|------|----------------|
| `validateBackInStockContact` | `name` as typed. `phone` from `internationalDigits(ddi, nationalNumber)`. |
| `subscribeBackInStock` | `name`, that same `phone`, `skuId` prop or `getSelectedSkuId()` or `''`, `seller` prop, `salesChannel` from `getSalesChannel()` (`string` or `null`), `storeLocales` from `getStoreLocaleCandidates()`, `language` from `i18n.language`. |

Error codes map to existing copy:

| Code | Key |
|------|-----|
| `errors.name === 'required'` | `back_in_stock.name_required` |
| `errors.phone === 'invalid'` | `back_in_stock.invalid_phone` |

`src/i18n/locales/en.json` is not edited. Other locale files are Crowdin-managed and are not edited.

## Host reads that stay

| Function | Returns |
|----------|---------|
| `getSalesChannel()` | FastStore session channel, else `__RUNTIME__.segmentToken` channel, else `null`. |
| `getStoreLocaleCandidates()` | `__RUNTIME__.culture.locale`, then `document.documentElement.lang`, dropping empty values. Order kept. |
| `getSelectedSkuId()` | Unchanged page read. |
| `loadStoreCountryAlpha3()` and the phone formatters | Unchanged. They only fill the inputs. |
