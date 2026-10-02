import {
  clearConversationStartersLog,
  getConversationStartersLog,
  recordConversationStarterEvent,
  setConversationStartersLogConfig,
} from './conversationStartersLog';

describe('conversationStartersLog', () => {
  beforeEach(() => {
    clearConversationStartersLog();
  });

  it('records events and returns a dump from getConversationStartersLog', () => {
    setConversationStartersLogConfig({
      conversationStarters: { pdp: true },
      connectOn: 'demand',
    });
    recordConversationStarterEvent('attempt', 'info', { slug: 'ipad' });
    recordConversationStarterEvent('ws_error', 'error', {
      code: 'STARTERS_LAMBDA',
    });

    const dump = getConversationStartersLog();

    expect(dump.config).toEqual({
      conversationStarters: { pdp: true },
      connectOn: 'demand',
    });
    expect(dump.pathname).toBeDefined();
    expect(dump.entries).toHaveLength(2);
    expect(dump.entries[0].phase).toBe('attempt');
    expect(dump.entries[0].detail.slug).toBe('ipad');
    expect(dump.entries[1].phase).toBe('ws_error');
    expect(dump.entries[1].detail.code).toBe('STARTERS_LAMBDA');
  });

  it('keeps only the last 200 entries', () => {
    for (let i = 0; i < 205; i += 1) {
      recordConversationStarterEvent('attempt', 'info', { i });
    }

    const dump = getConversationStartersLog();
    expect(dump.entries).toHaveLength(200);
    expect(dump.entries[0].detail.i).toBe(5);
    expect(dump.entries[199].detail.i).toBe(204);
  });
});
