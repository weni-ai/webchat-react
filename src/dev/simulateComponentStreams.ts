import {
  ComponentHint,
  ComponentType,
  CtaMessagePayload,
  ListMessagePayload,
  QuickReplyItem,
  StreamedMessage,
} from '@/utils/componentStreaming';

export interface SocketTypingStartFrame {
  type: 'typing_start';
  from: string;
}

export interface SocketStreamStartFrame {
  type: 'stream_start';
  id: string;
}

export interface SocketStreamDeltaFrame {
  v: string;
  seq: number;
}

export interface SocketStreamComponentHintFrame {
  type: 'stream_component_hint';
  id: string;
  component_type: ComponentType;
  labels?: string[];
  count?: number;
  item_count?: number;
}

export interface SocketStreamComponentFrame {
  type: 'stream_component';
  id: string;
  component_type: ComponentType;
  quick_replies?: QuickReplyItem[];
  list_message?: ListMessagePayload;
  cta_message?: CtaMessagePayload;
}

export interface SocketStreamTextEndFrame {
  type: 'stream_text_end';
  id: string;
  content: string;
}

export interface SocketStreamEndFrame {
  type: 'stream_end';
  id: string;
  content: string;
  quick_replies?: QuickReplyItem[];
  list_message?: ListMessagePayload;
  cta_message?: CtaMessagePayload;
}

export type SocketStreamFrame =
  | SocketTypingStartFrame
  | SocketStreamStartFrame
  | SocketStreamDeltaFrame
  | SocketStreamComponentHintFrame
  | SocketStreamComponentFrame
  | SocketStreamTextEndFrame
  | SocketStreamEndFrame;

export interface StreamScenarioStep {
  delayMs: number;
  frame: (id: string) => SocketStreamFrame;
}

export interface ComponentStreamScenario {
  id: string;
  buttonId: string;
  label: string;
  steps: StreamScenarioStep[];
}

export interface DevWebChatHandle {
  open: () => Promise<void> | void;
  simulateMessageReceived: (frame: SocketStreamFrame) => Promise<void> | void;
}

export interface DevStateManagerHandle {
  updateMessage?: (
    messageId: string,
    updates: Partial<StreamedMessage>,
  ) => void;
}

export interface DevServiceHandle {
  state?: DevStateManagerHandle;
  getState?: () => {
    messages?: StreamedMessage[];
    isThinking?: boolean;
    [key: string]: unknown;
  };
  emit?: (event: string, ...args: unknown[]) => void;
}

const DEALS_ITEMS = [
  { uuid: 'deal-1', title: 'Serra Alta coffee 500g', description: 'R$ 14.90' },
  {
    uuid: 'deal-2',
    title: 'Oliva Bela olive oil 500ml',
    description: '2 for R$ 49.90',
  },
  { uuid: 'deal-3', title: 'Grão Fino rice 5kg', description: 'R$ 22.90' },
  {
    uuid: 'deal-4',
    title: 'Campo Verde yogurt 6-pack',
    description: '30% off',
  },
  { uuid: 'deal-5', title: 'Trigal sliced bread', description: '2nd 50% off' },
  { uuid: 'deal-6', title: 'Brilho dish soap 500ml', description: 'R$ 2.49' },
  { uuid: 'deal-7', title: 'Banana, per kg', description: 'R$ 4.99' },
  { uuid: 'deal-8', title: 'Whole chicken, per kg', description: 'R$ 11.90' },
  {
    uuid: 'deal-9',
    title: 'Cacau Sul chocolate 90g',
    description: '3 for R$ 15',
  },
];

const RECIPE_ITEMS = [
  {
    uuid: 'rec-1',
    title: 'Kung pao chicken',
    description: '30 min · serves 4',
  },
  {
    uuid: 'rec-2',
    title: 'Chicken fricassee',
    description: '45 min · serves 6',
  },
  {
    uuid: 'rec-3',
    title: 'Roast chicken with potatoes',
    description: '1h10 · serves 4',
  },
  {
    uuid: 'rec-4',
    title: 'Chicken and mango salad',
    description: '15 min · serves 2',
  },
  {
    uuid: 'rec-5',
    title: 'Chicken stroganoff',
    description: '35 min · serves 4',
  },
];

function chunkTextSteps(
  text: string,
  chunkSize = 3,
  stepDelayMs = 220,
): StreamScenarioStep[] {
  const words = text.split(' ');
  const steps: StreamScenarioStep[] = [];
  let seq = 1;

  for (let i = 0; i < words.length; i += chunkSize) {
    const slice = words.slice(i, i + chunkSize).join(' ');
    const suffix = i + chunkSize < words.length ? ' ' : '';
    const currentSeq = seq;
    steps.push({
      delayMs: stepDelayMs,
      frame: () => ({ v: `${slice}${suffix}`, seq: currentSeq }),
    });
    seq += 1;
  }

  return steps;
}

export const COMPONENT_STREAM_SCENARIOS: readonly ComponentStreamScenario[] = [
  {
    id: 'qr-3',
    buttonId: 'simulate-stream-qr-3',
    label: 'Stream: QR (3 options)',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      {
        delayMs: 100,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'quick_replies',
          labels: [
            'Express · within 2h',
            'Scheduled · 6–8 PM',
            'Pick up in store',
          ],
          count: 3,
        }),
      },
      ...chunkTextSteps(
        'Good news: we can still deliver to your address today. Pick one of the delivery options below:',
      ),
      {
        delayMs: 250,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content:
            'Good news: we can still deliver to your address today. Pick one of the delivery options below:',
          quick_replies: [
            'Express · within 2h',
            'Scheduled · 6–8 PM',
            'Pick up in store',
          ],
        }),
      },
    ],
  },
  {
    id: 'qr-6',
    buttonId: 'simulate-stream-qr-6',
    label: 'Stream: QR (6 wrap)',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      {
        delayMs: 100,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'quick_replies',
          labels: ['Beans', 'Ground', 'Pods', 'Instant', 'Decaf', 'Organic'],
          count: 6,
        }),
      },
      ...chunkTextSteps(
        'We have plenty in the coffee aisle. Which format do you prefer?',
      ),
      {
        delayMs: 250,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content:
            'We have plenty in the coffee aisle. Which format do you prefer?',
          quick_replies: [
            'Beans',
            'Ground',
            'Pods',
            'Instant',
            'Decaf',
            'Organic',
          ],
        }),
      },
    ],
  },
  {
    id: 'list-known',
    buttonId: 'simulate-stream-list-known',
    label: 'Stream: List (9 deals)',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      {
        delayMs: 100,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'list_message',
          labels: ['See 9 deals'],
          count: 1,
          item_count: 9,
        }),
      },
      ...chunkTextSteps(
        'This week Clube Aurora has 9 active deals at your store. Open the list to pick one:',
      ),
      {
        delayMs: 250,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content:
            'This week Clube Aurora has 9 active deals at your store. Open the list to pick one:',
          list_message: {
            button_text: 'See 9 deals',
            item_count: 9,
            list_items: DEALS_ITEMS,
          },
        }),
      },
    ],
  },
  {
    id: 'list-unknown',
    buttonId: 'simulate-stream-list-unknown',
    label: 'Stream: List (no count)',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      {
        delayMs: 100,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'list_message',
          labels: ['See recipes'],
          count: 1,
        }),
      },
      ...chunkTextSteps(
        'I found a few chicken recipes you can make tonight. Open to pick one:',
      ),
      {
        delayMs: 250,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content:
            'I found a few chicken recipes you can make tonight. Open to pick one:',
          list_message: {
            button_text: 'See recipes',
            list_items: RECIPE_ITEMS,
          },
        }),
      },
    ],
  },
  {
    id: 'cta-ready',
    buttonId: 'simulate-stream-cta-ready',
    label: 'Stream: CTA (ready URL)',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      {
        delayMs: 100,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'cta_message',
          labels: ['Track order'],
          count: 1,
        }),
      },
      ...chunkTextSteps(
        'Your order #48213 left for delivery and you can follow the driver in real time:',
      ),
      {
        delayMs: 250,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content:
            'Your order #48213 left for delivery and you can follow the driver in real time:',
          cta_message: {
            display_text: 'Track order',
            url: 'https://loja-aurora.example/orders/48213/tracking',
          },
        }),
      },
    ],
  },
  {
    id: 'cta-delayed',
    buttonId: 'simulate-stream-cta-delayed',
    label: 'Stream: CTA (+1.5s URL)',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      {
        delayMs: 100,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'cta_message',
          labels: ['Open returns portal'],
          count: 1,
        }),
      },
      ...chunkTextSteps(
        'Exchanges are handled in the returns portal. Generating a secure link for your order:',
      ),
      {
        delayMs: 200,
        frame: (id) => ({
          type: 'stream_text_end',
          id,
          content:
            'Exchanges are handled in the returns portal. Generating a secure link for your order:',
        }),
      },
      {
        delayMs: 1500,
        frame: (id) => ({
          type: 'stream_component',
          id,
          component_type: 'cta_message',
          cta_message: {
            display_text: 'Open returns portal',
            url: 'https://loja-aurora.example/returns?order=48213',
          },
        }),
      },
      {
        delayMs: 100,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content:
            'Exchanges are handled in the returns portal. Generating a secure link for your order:',
          cta_message: {
            display_text: 'Open returns portal',
            url: 'https://loja-aurora.example/returns?order=48213',
          },
        }),
      },
    ],
  },
  {
    id: 'multi-component',
    buttonId: 'simulate-stream-multi',
    label: 'Stream: Multi-component',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      {
        delayMs: 80,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'list_message',
          labels: ['See 9 deals'],
          count: 1,
          item_count: 9,
        }),
      },
      {
        delayMs: 80,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'cta_message',
          labels: ['Track order'],
          count: 1,
        }),
      },
      {
        delayMs: 80,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'quick_replies',
          labels: ['Keep shopping', 'Talk to agent'],
          count: 2,
        }),
      },
      ...chunkTextSteps(
        'Here are the weekly deals, your tracking link, and quick next steps:',
      ),
      {
        delayMs: 250,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content:
            'Here are the weekly deals, your tracking link, and quick next steps:',
          list_message: {
            button_text: 'See 9 deals',
            item_count: 9,
            list_items: DEALS_ITEMS,
          },
          cta_message: {
            display_text: 'Track order',
            url: 'https://loja-aurora.example/orders/48213/tracking',
          },
          quick_replies: ['Keep shopping', 'Talk to agent'],
        }),
      },
    ],
  },
  {
    id: 'mid-hint',
    buttonId: 'simulate-stream-mid-hint',
    label: 'Stream: Mid-text hint',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      ...chunkTextSteps(
        'For pasta with red sauce, light reds work well.',
        3,
        220,
      ),
      {
        delayMs: 120,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'quick_replies',
          labels: ['Up to R$ 40', 'R$ 40 to R$ 80', 'Over R$ 80'],
          count: 3,
        }),
      },
      {
        delayMs: 220,
        frame: () => ({ v: ' Which price range works best?', seq: 4 }),
      },
      {
        delayMs: 250,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content:
            'For pasta with red sauce, light reds work well. Which price range works best?',
          quick_replies: ['Up to R$ 40', 'R$ 40 to R$ 80', 'Over R$ 80'],
        }),
      },
    ],
  },
  {
    id: 'labelless-hint',
    buttonId: 'simulate-stream-labelless',
    label: 'Stream: Labelless hint',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      {
        delayMs: 100,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'quick_replies',
          count: 3,
        }),
      },
      ...chunkTextSteps('Pick a delivery preference below:'),
      {
        delayMs: 250,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content: 'Pick a delivery preference below:',
          quick_replies: ['Morning', 'Afternoon', 'Evening'],
        }),
      },
    ],
  },
  {
    id: 'no-hint',
    buttonId: 'simulate-stream-no-hint',
    label: 'Stream: No hint (BD-008)',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      ...chunkTextSteps('Can I help with anything else today?'),
      {
        delayMs: 250,
        frame: (id) => ({
          type: 'stream_end',
          id,
          content: 'Can I help with anything else today?',
          quick_replies: ['Yes', 'No, that is all'],
        }),
      },
    ],
  },
  {
    id: 'timeout-undelivered',
    buttonId: 'simulate-stream-timeout',
    label: 'Stream: 10s timeout',
    steps: [
      {
        delayMs: 0,
        frame: () => ({ type: 'typing_start', from: 'ai-assistant' }),
      },
      { delayMs: 400, frame: (id) => ({ type: 'stream_start', id }) },
      {
        delayMs: 100,
        frame: (id) => ({
          type: 'stream_component_hint',
          id,
          component_type: 'cta_message',
          labels: ['Open returns portal'],
          count: 1,
        }),
      },
      ...chunkTextSteps(
        'Generating your link (this scenario simulates a 10s timeout):',
      ),
      {
        delayMs: 200,
        frame: (id) => ({
          type: 'stream_text_end',
          id,
          content:
            'Generating your link (this scenario simulates a 10s timeout):',
        }),
      },
    ],
  },
];

const SCENARIOS_BY_ID: Readonly<Record<string, ComponentStreamScenario>> =
  Object.fromEntries(COMPONENT_STREAM_SCENARIOS.map((s) => [s.id, s]));

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function upsertHint(
  existing: ComponentHint[] | undefined,
  frame: SocketStreamComponentHintFrame,
): ComponentHint[] {
  const nextHint: ComponentHint = {
    componentType: frame.component_type,
    ...(frame.labels ? { labels: frame.labels } : {}),
    ...(frame.count !== undefined ? { count: frame.count } : {}),
    ...(frame.item_count !== undefined ? { itemCount: frame.item_count } : {}),
  };
  const filtered = (existing ?? []).filter(
    (h) => h.componentType !== frame.component_type,
  );
  return [...filtered, nextHint];
}

interface FallbackOverlay {
  hints: ComponentHint[];
  streamPhase?: 'streaming_text' | 'awaiting_components' | 'completed';
  quick_replies?: QuickReplyItem[];
  list_message?: ListMessagePayload;
  cta_message?: CtaMessagePayload;
  ended: boolean;
}

const WEBCHAT_SERVICE_MESSAGE_PREFIX = 'msg_';

function updateOverlayFromFrame(
  overlay: FallbackOverlay,
  frame: SocketStreamFrame,
): void {
  if (!('type' in frame)) return;

  if (frame.type === 'stream_component_hint') {
    overlay.hints = upsertHint(overlay.hints, frame);
    if (!overlay.streamPhase) {
      overlay.streamPhase = 'streaming_text';
    }
    return;
  }

  if (frame.type === 'stream_text_end') {
    overlay.streamPhase = 'awaiting_components';
    return;
  }

  if (frame.type === 'stream_component') {
    if (frame.quick_replies) overlay.quick_replies = frame.quick_replies;
    if (frame.list_message) overlay.list_message = frame.list_message;
    if (frame.cta_message) overlay.cta_message = frame.cta_message;
    return;
  }

  if (frame.type === 'stream_end') {
    overlay.ended = true;
    overlay.streamPhase = 'completed';
    if (frame.quick_replies) overlay.quick_replies = frame.quick_replies;
    if (frame.list_message) overlay.list_message = frame.list_message;
    if (frame.cta_message) overlay.cta_message = frame.cta_message;
  }
}

function patchServiceMessage(
  service: DevServiceHandle,
  resolvedId: string,
  patch: Partial<StreamedMessage>,
): void {
  if (typeof service.state?.updateMessage === 'function') {
    service.state.updateMessage(resolvedId, patch);
    return;
  }

  if (!service.getState || !service.emit) return;
  const state = service.getState();
  const messages = Array.isArray(state?.messages)
    ? state.messages.map((msg) =>
        msg.id === resolvedId ? { ...msg, ...patch } : msg,
      )
    : [];
  service.emit('state:changed', { ...state, messages });
}

/**
 * Fallback AD-005 state projection used ONLY in local dev when running against
 * @weni/webchat-service 1.21.0 (before 1.22.0 natively handles the new frames).
 *
 * MessageProcessor in 1.21.0 prefixes streamed IDs with `msg_` and creates the
 * message in StateManager on the first delta; we mirror the overlay into
 * `service.state.updateMessage(...)` so skeletons survive every text delta and
 * transition cleanly on stream_text_end / stream_component / stream_end.
 */
function syncFallbackOverlay(
  service: DevServiceHandle | undefined,
  streamId: string,
  frame: SocketStreamFrame,
  overlay: FallbackOverlay,
): void {
  updateOverlayFromFrame(overlay, frame);

  if (!service?.getState || !service?.emit) return;

  const prefixedId = `${WEBCHAT_SERVICE_MESSAGE_PREFIX}${streamId}`;
  const state = service.getState();
  const messages = Array.isArray(state?.messages) ? [...state.messages] : [];
  const idx = messages.findIndex(
    (m) => m.id === streamId || m.id === prefixedId,
  );

  // Before the first delta arrives, emit a transient preview with the exact
  // `msg_` ID that MessageProcessor will adopt on delta #1 so React keeps the
  // same StreamedMessageItem mounted without duplicating the StateManager entry.
  if (idx < 0) {
    if (overlay.hints.length === 0) return;

    const preview: StreamedMessage = {
      id: prefixedId,
      type: 'text',
      text: '',
      timestamp: Date.now(),
      direction: 'incoming',
      status: 'streaming',
      streamPhase: overlay.streamPhase ?? 'streaming_text',
      componentHints: overlay.hints,
    };
    service.emit('state:changed', {
      ...state,
      isThinking: false,
      messages: [...messages, preview],
    });
    return;
  }

  const current = messages[idx];
  const resolvedId = current.id;
  const patch: Partial<StreamedMessage> = {};
  let needsPatch = false;

  if (!overlay.ended) {
    if (overlay.hints.length > 0) {
      const existingTypes = (current.componentHints ?? [])
        .map((h) => h.componentType)
        .join(',');
      const expectedTypes = overlay.hints.map((h) => h.componentType).join(',');
      if (existingTypes !== expectedTypes) {
        patch.componentHints = overlay.hints;
        needsPatch = true;
      }
    }

    if (overlay.streamPhase && current.streamPhase !== overlay.streamPhase) {
      patch.streamPhase = overlay.streamPhase;
      needsPatch = true;
    }

    if ('type' in frame && frame.type === 'stream_text_end') {
      patch.text = frame.content;
      patch.status = 'streaming';
      patch.streamPhase = 'awaiting_components';
      needsPatch = true;
    }
  } else {
    const hasMissingComponents =
      (overlay.quick_replies && !current.quick_replies) ||
      (overlay.list_message && !current.list_message) ||
      (overlay.cta_message && !current.cta_message) ||
      current.streamPhase !== 'completed' ||
      current.componentHints !== undefined ||
      current.status !== 'delivered';

    if (hasMissingComponents) {
      patch.status = 'delivered';
      patch.streamPhase = 'completed';
      patch.componentHints = undefined;
      if ('type' in frame && frame.type === 'stream_end') {
        patch.text = frame.content;
      }
      needsPatch = true;
    }
  }

  if (overlay.quick_replies && !current.quick_replies) {
    patch.quick_replies = overlay.quick_replies;
    needsPatch = true;
  }
  if (overlay.list_message && !current.list_message) {
    patch.list_message = overlay.list_message;
    needsPatch = true;
  }
  if (overlay.cta_message && !current.cta_message) {
    patch.cta_message = overlay.cta_message;
    needsPatch = true;
  }

  if (needsPatch) {
    patchServiceMessage(service, resolvedId, patch);
  }
}

export async function runComponentStreamScenario(
  scenarioId: string,
  webChat: DevWebChatHandle,
  getService?: () => DevServiceHandle | undefined,
  delayFn: (ms: number) => Promise<void> = waitMs,
): Promise<string | null> {
  const scenario = SCENARIOS_BY_ID[scenarioId];
  if (!scenario) return null;

  await webChat.open();
  const streamId = `demo-comp-${scenario.id}-${Date.now()}`;
  const overlay: FallbackOverlay = {
    hints: [],
    ended: false,
  };

  for (const step of scenario.steps) {
    if (step.delayMs > 0) {
      await delayFn(step.delayMs);
    }
    const frame = step.frame(streamId);
    await webChat.simulateMessageReceived(frame);
    syncFallbackOverlay(getService?.(), streamId, frame, overlay);
  }

  return streamId;
}
