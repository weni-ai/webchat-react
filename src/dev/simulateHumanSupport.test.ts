import {
  HUMAN_SUPPORT_SCENARIOS,
  runHumanSupportScenario,
  type DevHumanSupportServiceState,
} from './simulateHumanSupport';

describe('simulateHumanSupport (dev-only visual debug scenarios)', () => {
  it('defines 9 unique scenarios covering US1–US5 and feature OFF', () => {
    expect(HUMAN_SUPPORT_SCENARIOS).toHaveLength(9);

    const ids = new Set(HUMAN_SUPPORT_SCENARIOS.map((s) => s.id));
    const buttonIds = new Set(HUMAN_SUPPORT_SCENARIOS.map((s) => s.buttonId));
    const labels = new Set(HUMAN_SUPPORT_SCENARIOS.map((s) => s.label));

    expect(ids.size).toBe(9);
    expect(buttonIds.size).toBe(9);
    expect(labels.size).toBe(9);
  });

  it('returns null for an unknown scenario id without opening chat', async () => {
    const webChat = { open: jest.fn() };
    const result = await runHumanSupportScenario('does-not-exist', webChat);
    expect(result).toBeNull();
    expect(webChat.open).not.toHaveBeenCalled();
  });

  it('replays every scenario cleanly and emits state:changed transitions', async () => {
    const instantDelay = jest.fn(async () => {});

    for (const scenario of HUMAN_SUPPORT_SCENARIOS) {
      let state: DevHumanSupportServiceState = { messages: [] };
      const emit = jest.fn(
        (event: string, next: DevHumanSupportServiceState) => {
          if (event === 'state:changed') {
            state = next;
          }
        },
      );
      const webChat = { open: jest.fn() };
      const service = {
        getState: () => state,
        emit,
      };

      const runId = await runHumanSupportScenario(
        scenario.id,
        webChat,
        () => service,
        instantDelay,
      );

      expect(runId).toContain(scenario.id);
      expect(webChat.open).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalled();
      expect((state.messages ?? []).length).toBeGreaterThan(0);
    }
  });

  it('handles missing service handle gracefully without throwing', async () => {
    const webChat = { open: jest.fn() };
    const runId = await runHumanSupportScenario(
      'hs-read-confirmation-off',
      webChat,
      undefined,
      async () => {},
    );
    expect(runId).toContain('hs-read-confirmation-off');
    expect(webChat.open).toHaveBeenCalledTimes(1);
  });
});
