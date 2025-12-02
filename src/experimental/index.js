export function isExperimentalEnabled(feature) {
  try {
    return JSON.parse(localStorage.getItem('WeniWebChatExperimental'))[feature];
  } catch {
    return false;
  }
}
