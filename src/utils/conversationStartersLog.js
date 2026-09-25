const MAX_ENTRIES = 200;

const entries = [];

let logConfig = {
  conversationStarters: {},
  connectOn: undefined,
};

export function recordConversationStarterEvent(
  phase,
  level = 'info',
  detail = {},
) {
  entries.push({
    ts: new Date().toISOString(),
    phase,
    level,
    detail: detail && typeof detail === 'object' ? { ...detail } : {},
  });

  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

export function setConversationStartersLogConfig(config = {}) {
  logConfig = {
    conversationStarters: config.conversationStarters || {},
    connectOn: config.connectOn,
  };
}

export function clearConversationStartersLog() {
  entries.length = 0;
}

export function getConversationStartersLog() {
  const href =
    typeof window !== 'undefined' && window.location
      ? window.location.href
      : '';
  const pathname =
    typeof window !== 'undefined' && window.location
      ? window.location.pathname
      : '';

  return {
    generatedAt: new Date().toISOString(),
    url: href,
    pathname,
    config: {
      conversationStarters: {
        pdp: logConfig.conversationStarters?.pdp === true,
      },
      connectOn: logConfig.connectOn,
    },
    entries: entries.map((entry) => ({
      ...entry,
      detail: { ...entry.detail },
    })),
  };
}
