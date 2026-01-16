export function isExperimentalEnabled(feature, fallbackEnabledFromConfig) {
  try {
    const raw = localStorage.getItem('WeniWebChatExperimental');
    const parsed = raw ? JSON.parse(raw) : {};
    const value = parsed?.[feature];
    if (typeof value === 'boolean') {
      return value;
    }
  } catch {
    // ignore and try fallback
  }

  if (typeof fallbackEnabledFromConfig === 'boolean') {
    return fallbackEnabledFromConfig;
  }

  return false;
}
