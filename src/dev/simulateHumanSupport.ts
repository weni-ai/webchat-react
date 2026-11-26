import type {
  HumanSupportMessage,
  HumanSupportState,
  ShopperMessageStatus,
  TypingAuthor,
} from '@/utils/humanSupportStatus';

export interface DevHumanSupportWebChatHandle {
  open: () => Promise<void> | void;
}

export interface DevHumanSupportServiceState {
  messages?: HumanSupportMessage[];
  connection?: { status: string; nextAttemptAt?: number | null };
  isTyping?: boolean;
  isThinking?: boolean;
  thinkingText?: string | null;
  features?: { humanSupportStatus?: boolean; [key: string]: unknown };
  humanSupport?: HumanSupportState;
  typingAuthor?: TypingAuthor | null;
  [key: string]: unknown;
}

export interface DevHumanSupportServiceHandle {
  getState?: () => DevHumanSupportServiceState;
  emit?: (event: string, ...args: unknown[]) => void;
}

export interface DevHumanSupportRunContext {
  runId: string;
  baseTime: number;
  applyState: (
    updater: (prev: DevHumanSupportServiceState) => DevHumanSupportServiceState,
  ) => void;
}

export interface HumanSupportScenarioStep {
  delayMs: number;
  apply: (ctx: DevHumanSupportRunContext) => Promise<void> | void;
}

export interface HumanSupportScenario {
  id: string;
  buttonId: string;
  label: string;
  steps: HumanSupportScenarioStep[];
}

const AGENT_JULIA_ID = 'ha_5f0c3a9e1b7d4c2a8e6f0b1d3c5a7e9f';
const AGENT_PEDRO_ID = 'ha_0a1b2c3d4e5f60718293a4b5c6d7e8f9';
const START_UUID_1 = '6f1d2c3b-4a59-5e6f-8a7b-9c0d1e2f3a4b';
const END_UUID_1 = 'a2b3c4d5-e6f7-5a8b-9c0d-1e2f3a4b5c6d';

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeMessage(
  partial: Partial<HumanSupportMessage> & { id: string; timestamp: number },
): HumanSupportMessage {
  return {
    type: 'text',
    direction: 'incoming',
    text: '',
    ...partial,
  };
}

function makeMilestone(
  eventId: string,
  event: 'started' | 'ended',
  occurredAt: number,
  orderKey: number,
): HumanSupportMessage {
  return {
    id: `hs_${eventId}_${orderKey}`,
    type: 'human_support_event',
    direction: 'incoming',
    timestamp: occurredAt,
    orderKey,
    humanSupportEvent: { eventId, event, occurredAt },
  };
}

function updateStatuses(
  messages: HumanSupportMessage[] | undefined,
  ids: string[],
  status: ShopperMessageStatus,
): HumanSupportMessage[] {
  const target = new Set(ids);
  return (messages ?? []).map((msg) =>
    msg.id && target.has(msg.id) ? { ...msg, status } : msg,
  );
}

function resetState(
  prev: DevHumanSupportServiceState,
  overrides: Partial<DevHumanSupportServiceState> = {},
): DevHumanSupportServiceState {
  return {
    ...prev,
    connection: { status: 'connected', nextAttemptAt: null },
    isTyping: false,
    isThinking: false,
    thinkingText: null,
    typingAuthor: null,
    features: { ...(prev.features ?? {}), humanSupportStatus: true },
    humanSupport: { active: false },
    messages: [],
    ...overrides,
  };
}

export const HUMAN_SUPPORT_SCENARIOS: HumanSupportScenario[] = [
  {
    id: 'hs-transfer-and-close',
    buttonId: 'simulate-hs-transfer-and-close',
    label: 'HS: Transfer & close (US1)',
    steps: [
      {
        delayMs: 0,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) =>
            resetState(prev, {
              messages: [
                makeMessage({
                  id: `${runId}-ai-1`,
                  text: "I'm transferring you to a human agent now.",
                  timestamp: baseTime - 120_000,
                  orderKey: baseTime - 120_000,
                  author: { type: 'ai_agent' },
                }),
              ],
            }),
          );
        },
      },
      {
        delayMs: 800,
        apply: ({ baseTime, applyState }) => {
          applyState((prev) => ({
            ...prev,
            humanSupport: { active: true },
            messages: [
              ...(prev.messages ?? []),
              makeMilestone(
                START_UUID_1,
                'started',
                baseTime - 60_000,
                baseTime - 60_000,
              ),
            ],
          }));
        },
      },
      {
        delayMs: 900,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) => ({
            ...prev,
            messages: [
              ...(prev.messages ?? []),
              makeMessage({
                id: `${runId}-ag-1`,
                text: "Hi! I'm Julia and I've opened your exchange request.",
                timestamp: baseTime - 30_000,
                orderKey: baseTime - 30_000,
                author: {
                  type: 'human_agent',
                  id: AGENT_JULIA_ID,
                  name: 'Julia',
                },
              }),
              makeMessage({
                id: `${runId}-u-1`,
                direction: 'outgoing',
                text: 'Thanks, Julia!',
                timestamp: baseTime - 15_000,
                orderKey: baseTime - 15_000,
                status: 'read',
                author: { type: 'contact' },
              }),
            ],
          }));
        },
      },
      {
        delayMs: 1000,
        apply: ({ baseTime, applyState }) => {
          applyState((prev) => ({
            ...prev,
            humanSupport: { active: false },
            messages: [
              ...(prev.messages ?? []),
              makeMilestone(END_UUID_1, 'ended', baseTime, baseTime),
            ],
          }));
        },
      },
    ],
  },
  {
    id: 'hs-queue-and-bulk-read',
    buttonId: 'simulate-hs-queue-and-bulk-read',
    label: 'HS: Queue & bulk read (US2)',
    steps: [
      {
        delayMs: 0,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) =>
            resetState(prev, {
              humanSupport: { active: true },
              messages: [
                makeMilestone(
                  START_UUID_1,
                  'started',
                  baseTime - 180_000,
                  baseTime - 180_000,
                ),
                makeMessage({
                  id: `${runId}-u-1`,
                  direction: 'outgoing',
                  text: 'Hello? Is anyone there?',
                  timestamp: baseTime - 120_000,
                  orderKey: baseTime - 120_000,
                  status: 'delivered',
                  author: { type: 'contact' },
                }),
                makeMessage({
                  id: `${runId}-u-2`,
                  direction: 'outgoing',
                  text: 'I already have photos of the sole',
                  timestamp: baseTime - 60_000,
                  orderKey: baseTime - 60_000,
                  status: 'sent',
                  author: { type: 'contact' },
                }),
                makeMessage({
                  id: `${runId}-u-3`,
                  direction: 'outgoing',
                  text: 'Can I send them here?',
                  timestamp: baseTime,
                  orderKey: baseTime,
                  status: 'pending',
                  author: { type: 'contact' },
                }),
              ],
            }),
          );
        },
      },
      {
        delayMs: 900,
        apply: ({ runId, applyState }) => {
          applyState((prev) => ({
            ...prev,
            messages: updateStatuses(
              prev.messages,
              [`${runId}-u-2`, `${runId}-u-3`],
              'delivered',
            ),
          }));
        },
      },
      {
        delayMs: 1100,
        apply: ({ runId, applyState }) => {
          applyState((prev) => ({
            ...prev,
            messages: updateStatuses(
              prev.messages,
              [`${runId}-u-1`, `${runId}-u-2`, `${runId}-u-3`],
              'read',
            ),
          }));
        },
      },
    ],
  },
  {
    id: 'hs-read-confirmation-off',
    buttonId: 'simulate-hs-read-confirmation-off',
    label: 'HS: Read confirm OFF (US2)',
    steps: [
      {
        delayMs: 0,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) =>
            resetState(prev, {
              humanSupport: { active: true },
              messages: [
                makeMilestone(
                  START_UUID_1,
                  'started',
                  baseTime - 120_000,
                  baseTime - 120_000,
                ),
                makeMessage({
                  id: `${runId}-u-1`,
                  direction: 'outgoing',
                  text: 'Checking on my order #9482',
                  timestamp: baseTime - 60_000,
                  orderKey: baseTime - 60_000,
                  status: 'delivered',
                  author: { type: 'contact' },
                }),
                makeMessage({
                  id: `${runId}-ag-1`,
                  text: 'Got it! Looking up your order right now.',
                  timestamp: baseTime,
                  orderKey: baseTime,
                  author: {
                    type: 'human_agent',
                    id: AGENT_JULIA_ID,
                    name: 'Julia',
                  },
                }),
              ],
            }),
          );
        },
      },
    ],
  },
  {
    id: 'hs-send-failure',
    buttonId: 'simulate-hs-send-failure',
    label: 'HS: Send failure (US2)',
    steps: [
      {
        delayMs: 0,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) =>
            resetState(prev, {
              humanSupport: { active: true },
              messages: [
                makeMilestone(
                  START_UUID_1,
                  'started',
                  baseTime - 120_000,
                  baseTime - 120_000,
                ),
                makeMessage({
                  id: `${runId}-u-1`,
                  direction: 'outgoing',
                  text: 'Here they are',
                  timestamp: baseTime - 60_000,
                  orderKey: baseTime - 60_000,
                  status: 'read',
                  author: { type: 'contact' },
                }),
                makeMessage({
                  id: `${runId}-u-2`,
                  direction: 'outgoing',
                  text: 'And one more angle of the sole',
                  timestamp: baseTime,
                  status: 'error',
                  author: { type: 'contact' },
                }),
              ],
            }),
          );
        },
      },
    ],
  },
  {
    id: 'hs-agent-typing-and-handoff',
    buttonId: 'simulate-hs-agent-typing-and-handoff',
    label: 'HS: Agent typing & handoff (US3)',
    steps: [
      {
        delayMs: 0,
        apply: ({ baseTime, applyState }) => {
          applyState((prev) =>
            resetState(prev, {
              humanSupport: { active: true },
              isThinking: true,
              isTyping: true,
              typingAuthor: { type: 'human_agent', name: 'Julia' },
              messages: [
                makeMilestone(
                  START_UUID_1,
                  'started',
                  baseTime - 120_000,
                  baseTime - 120_000,
                ),
              ],
            }),
          );
        },
      },
      {
        delayMs: 1200,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) => ({
            ...prev,
            isTyping: false,
            typingAuthor: null,
            messages: [
              ...(prev.messages ?? []),
              makeMessage({
                id: `${runId}-j-1`,
                text: "Good afternoon! I'm Julia.",
                timestamp: baseTime,
                orderKey: baseTime,
                author: {
                  type: 'human_agent',
                  id: AGENT_JULIA_ID,
                  name: 'Julia',
                },
              }),
              makeMessage({
                id: `${runId}-j-2`,
                text: 'Could you send photos showing the damage?',
                timestamp: baseTime + 5_000,
                orderKey: baseTime + 5_000,
                author: {
                  type: 'human_agent',
                  id: AGENT_JULIA_ID,
                  name: 'Julia',
                },
              }),
            ],
          }));
        },
      },
      {
        delayMs: 1100,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) => ({
            ...prev,
            messages: [
              ...(prev.messages ?? []),
              makeMessage({
                id: `${runId}-p-1`,
                text: 'Hi, taking over from Julia to finalize your label.',
                timestamp: baseTime + 65_000,
                orderKey: baseTime + 65_000,
                author: {
                  type: 'human_agent',
                  id: AGENT_PEDRO_ID,
                  name: 'MaximilianAlexanderBartholomewTheThirdLongFirstName',
                },
              }),
            ],
          }));
        },
      },
    ],
  },
  {
    id: 'hs-unnamed-agent',
    buttonId: 'simulate-hs-unnamed-agent',
    label: 'HS: Unnamed agent & system (US3)',
    steps: [
      {
        delayMs: 0,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) =>
            resetState(prev, {
              humanSupport: { active: true },
              isTyping: true,
              typingAuthor: { type: 'human_agent' },
              messages: [
                makeMilestone(
                  START_UUID_1,
                  'started',
                  baseTime - 60_000,
                  baseTime - 60_000,
                ),
                makeMessage({
                  id: `${runId}-sys-1`,
                  text: 'Good afternoon! How can we assist you today?',
                  timestamp: baseTime,
                  orderKey: baseTime,
                  author: { type: 'human_agent' },
                }),
              ],
            }),
          );
        },
      },
    ],
  },
  {
    id: 'hs-timestamps-grouping-streaming',
    buttonId: 'simulate-hs-timestamps-grouping-streaming',
    label: 'HS: Timestamps, grouping & stream (US4)',
    steps: [
      {
        delayMs: 0,
        apply: ({ runId, baseTime, applyState }) => {
          const yesterday = baseTime - 86_400_000;
          applyState((prev) =>
            resetState(prev, {
              messages: [
                makeMessage({
                  id: `${runId}-y-ai`,
                  text: "Hi! I'm your shopping assistant.",
                  timestamp: yesterday,
                  orderKey: yesterday,
                  author: { type: 'ai_agent' },
                }),
                makeMessage({
                  id: `${runId}-u-1`,
                  direction: 'outgoing',
                  text: 'Hi again! The sneakers arrived today.',
                  timestamp: baseTime,
                  orderKey: baseTime,
                  author: { type: 'contact' },
                }),
                makeMessage({
                  id: `${runId}-u-2`,
                  direction: 'outgoing',
                  text: 'Can you help me with an exchange?',
                  timestamp: baseTime + 5_000,
                  orderKey: baseTime + 5_000,
                  author: { type: 'contact' },
                }),
                makeMessage({
                  id: `${runId}-cart`,
                  type: 'conversation_status',
                  text: 'Running shoe added to cart',
                  timestamp: baseTime + 6_000,
                  orderKey: baseTime + 6_000,
                }),
                makeMessage({
                  id: `${runId}-ai-stream`,
                  text: 'Of course! Let me check your order details...',
                  timestamp: baseTime + 7_000,
                  orderKey: baseTime + 7_000,
                  status: 'streaming',
                  author: { type: 'ai_agent' },
                }),
              ],
            }),
          );
        },
      },
      {
        delayMs: 1400,
        apply: ({ runId, applyState }) => {
          applyState((prev) => ({
            ...prev,
            messages: (prev.messages ?? []).map((msg) =>
              msg.id === `${runId}-ai-stream`
                ? { ...msg, status: 'delivered' }
                : msg,
            ),
          }));
        },
      },
    ],
  },
  {
    id: 'hs-offline-and-reconnect-close',
    buttonId: 'simulate-hs-offline-and-reconnect-close',
    label: 'HS: Offline & reconnect close (US5)',
    steps: [
      {
        delayMs: 0,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) =>
            resetState(prev, {
              humanSupport: { active: true },
              connection: {
                status: 'reconnecting',
                nextAttemptAt: baseTime + 8_000,
              },
              messages: [
                makeMilestone(
                  START_UUID_1,
                  'started',
                  baseTime - 180_000,
                  baseTime - 180_000,
                ),
                makeMessage({
                  id: `${runId}-u-off`,
                  direction: 'outgoing',
                  text: 'Will it take long?',
                  timestamp: baseTime - 60_000,
                  status: 'pending',
                  author: { type: 'contact' },
                }),
              ],
            }),
          );
        },
      },
      {
        delayMs: 1500,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) => ({
            ...prev,
            connection: { status: 'connected', nextAttemptAt: null },
            humanSupport: { active: false },
            messages: [
              ...updateStatuses(prev.messages, [`${runId}-u-off`], 'delivered'),
              makeMilestone(END_UUID_1, 'ended', baseTime - 30_000, baseTime),
            ],
          }));
        },
      },
    ],
  },
  {
    id: 'hs-feature-off-prelaunch',
    buttonId: 'simulate-hs-feature-off-prelaunch',
    label: 'HS: Feature OFF / pre-launch',
    steps: [
      {
        delayMs: 0,
        apply: ({ runId, baseTime, applyState }) => {
          applyState((prev) =>
            resetState(prev, {
              features: { ...(prev.features ?? {}), humanSupportStatus: false },
              humanSupport: { active: true },
              messages: [
                makeMessage({
                  id: `${runId}-old-ai`,
                  text: 'Legacy message from before launch (no timestamp or name).',
                  timestamp: baseTime - 60_000,
                }),
                makeMessage({
                  id: `${runId}-old-u`,
                  direction: 'outgoing',
                  text: 'Legacy shopper message (no ticks).',
                  timestamp: baseTime,
                }),
              ],
            }),
          );
        },
      },
    ],
  },
];

const SCENARIOS_BY_ID: Record<string, HumanSupportScenario> =
  HUMAN_SUPPORT_SCENARIOS.reduce<Record<string, HumanSupportScenario>>(
    (acc, scenario) => {
      acc[scenario.id] = scenario;
      return acc;
    },
    {},
  );

export async function runHumanSupportScenario(
  scenarioId: string,
  webChat: DevHumanSupportWebChatHandle,
  getService?: () => DevHumanSupportServiceHandle | undefined,
  delayFn: (ms: number) => Promise<void> = waitMs,
): Promise<string | null> {
  const scenario = SCENARIOS_BY_ID[scenarioId];
  if (!scenario) {
    return null;
  }

  await webChat.open();
  const baseTime = Date.now();
  const runId = `demo-hs-${scenario.id}-${baseTime}`;

  const service = getService?.();
  let currentState: DevHumanSupportServiceState = service?.getState?.() ?? {};

  const applyState = (
    updater: (prev: DevHumanSupportServiceState) => DevHumanSupportServiceState,
  ): void => {
    currentState = updater(currentState);
    service?.emit?.('state:changed', currentState);
  };

  for (const step of scenario.steps) {
    if (step.delayMs > 0) {
      await delayFn(step.delayMs);
    }
    await step.apply({ runId, baseTime, applyState });
  }

  return runId;
}
