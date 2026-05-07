const lastRunByField = new Map();

/**
 * Returns a (field, value) => void that forwards to setCustomField at most once
 * per `field` every `intervalMs` (leading edge: first call in the window runs).
 *
 * @param {(field: string, value: unknown) => void} setCustomField
 * @param {number} [intervalMs=10000]
 */
export function createThrottledCustomFieldSetter(
  setCustomField,
  intervalMs = 10_000,
) {
  return (field, value) => {
    const now = Date.now();
    const last = lastRunByField.get(field) ?? 0;
    if (now - last < intervalMs) {
      return;
    }
    lastRunByField.set(field, now);
    setCustomField(field, value);
  };
}
