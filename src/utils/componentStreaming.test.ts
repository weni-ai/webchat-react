import {
  COMPONENT_DISPLAY_ORDER,
  COMPONENT_ENTER_DURATION_MS,
  COMPONENT_MAX_SEQUENCE_MS,
  StreamedMessage,
  buildActivationAnnouncements,
  buildComponentSchedule,
  computeComponentStaggerMs,
  computeListItemStaggerMs,
  computeSequenceDurationMs,
  isValidCtaUrl,
  normalizeQuickReplies,
  sanitizeComponentHints,
} from './componentStreaming';

function baseMessage(
  overrides: Partial<StreamedMessage> = {},
): StreamedMessage {
  return {
    id: 'msg-1',
    type: 'text',
    text: 'Hello',
    timestamp: 1000,
    direction: 'incoming',
    status: 'delivered',
    ...overrides,
  };
}

describe('componentStreaming timing formulas', () => {
  it('computes component stagger intervals capped at 300ms total', () => {
    expect(computeComponentStaggerMs(0)).toBe(0);
    expect(computeComponentStaggerMs(1)).toBe(0);
    expect(computeComponentStaggerMs(2)).toBe(70);
    expect(computeComponentStaggerMs(3)).toBe(60);
    expect(computeComponentStaggerMs(6)).toBe(24);

    for (const count of [1, 2, 3, 6, 9, 20]) {
      const stagger = computeComponentStaggerMs(count);
      const total = computeSequenceDurationMs(count, stagger);
      expect(total).toBeLessThanOrEqual(COMPONENT_MAX_SEQUENCE_MS);
    }

    expect(computeSequenceDurationMs(0, 0)).toBe(0);
    expect(computeSequenceDurationMs(1, 0)).toBe(COMPONENT_ENTER_DURATION_MS);
    expect(computeSequenceDurationMs(2, 70)).toBe(250);
    expect(computeSequenceDurationMs(3, 60)).toBe(300);
    expect(computeSequenceDurationMs(6, 24)).toBe(300);
  });

  it('computes list item stagger intervals capped at 40ms and 300ms total', () => {
    expect(computeListItemStaggerMs(1)).toBe(0);
    expect(computeListItemStaggerMs(2)).toBe(40);
    expect(computeListItemStaggerMs(9)).toBe(15);
    expect(computeSequenceDurationMs(9, computeListItemStaggerMs(9))).toBe(300);
    expect(
      computeSequenceDurationMs(25, computeListItemStaggerMs(25)),
    ).toBeLessThanOrEqual(COMPONENT_MAX_SEQUENCE_MS);
  });
});

describe('isValidCtaUrl', () => {
  it('accepts complete http and https URLs', () => {
    expect(isValidCtaUrl('https://store.example/orders/48213')).toBe(true);
    expect(isValidCtaUrl('http://store.example/track?id=1')).toBe(true);
  });

  it('rejects partial, non-http, and malformed URLs', () => {
    expect(isValidCtaUrl('')).toBe(false);
    expect(isValidCtaUrl('https://')).toBe(false);
    expect(isValidCtaUrl('javascript:alert(1)')).toBe(false);
    expect(isValidCtaUrl('data:text/html,<h1>x</h1>')).toBe(false);
    expect(isValidCtaUrl('/relative/path')).toBe(false);
    expect(isValidCtaUrl(null)).toBe(false);
    expect(isValidCtaUrl(undefined)).toBe(false);
  });
});

describe('normalizeQuickReplies', () => {
  it('normalizes string and object entries while keeping duplicate labels distinct', () => {
    expect(
      normalizeQuickReplies([
        'Express',
        { title: 'Standard', payload: 'std' },
        'Express',
        '',
        '   ',
      ]),
    ).toEqual([
      { label: 'Express', key: '0-Express' },
      { label: 'Standard', key: '1-Standard' },
      { label: 'Express', key: '2-Express' },
    ]);
  });

  it('returns empty array for missing or non-array input', () => {
    expect(normalizeQuickReplies(undefined)).toEqual([]);
    expect(normalizeQuickReplies(null)).toEqual([]);
  });
});

describe('sanitizeComponentHints', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('orders hints in fixed display order, deduplicates by type, and scopes itemCount to list_message', () => {
    const result = sanitizeComponentHints([
      {
        componentType: 'quick_replies',
        labels: ['A', 'B'],
        itemCount: 9,
      },
      {
        componentType: 'cta_message',
        labels: ['Track order'],
        count: 1,
      },
      {
        componentType: 'list_message',
        labels: ['See 9 deals'],
        count: 1,
        itemCount: 9,
      },
      {
        componentType: 'quick_replies',
        labels: ['A', 'B', 'C'],
        count: 3,
      },
    ]);

    expect(result.map((h) => h.componentType)).toEqual(COMPONENT_DISPLAY_ORDER);
    expect(result[0]).toEqual({
      componentType: 'list_message',
      labels: ['See 9 deals'],
      count: 1,
      itemCount: 9,
    });
    expect(result[2]).toEqual({
      componentType: 'quick_replies',
      labels: ['A', 'B', 'C'],
      count: 3,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('discards malformed or unknown hints with PII-free structured warning', () => {
    const result = sanitizeComponentHints(
      [
        null,
        { componentType: 'unknown_widget', labels: ['Secret label'] },
        { componentType: 'quick_replies', labels: ['Valid'] },
      ],
      {
        channelUuid: 'ch-1',
        sessionId: 'sess-1',
        messageId: 'msg-99',
      },
    );

    expect(result).toEqual([
      { componentType: 'quick_replies', labels: ['Valid'] },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    const serializedArgs = JSON.stringify(warnSpy.mock.calls);
    expect(serializedArgs).toContain('[WebChat:ComponentStreaming]');
    expect(serializedArgs).toContain('msg-99');
    expect(serializedArgs).toContain('invalid_hint');
    expect(serializedArgs).not.toContain('Secret label');
  });
});

describe('buildComponentSchedule', () => {
  it('calculates unified offsets across list, CTA, and quick replies', () => {
    const message = baseMessage({
      list_message: {
        button_text: 'See deals',
        list_items: [{ uuid: '1', title: 'Coffee' }],
      },
      cta_message: {
        display_text: 'Track order',
        url: 'https://store.example/track/1',
      },
      quick_replies: ['Option 1', 'Option 2', 'Option 3'],
    });

    const schedule = buildComponentSchedule(message, false);
    expect(schedule).toEqual({
      totalButtonCount: 5,
      durationMs: 180,
      staggerMs: 30,
      totalSequenceMs: 300,
      offsets: {
        list_message: 0,
        cta_message: 1,
        quick_replies: 2,
      },
    });
  });

  it('collapses timing to 0ms under reduced motion', () => {
    const message = baseMessage({ quick_replies: ['Yes', 'No'] });
    const schedule = buildComponentSchedule(message, true);
    expect(schedule.durationMs).toBe(0);
    expect(schedule.staggerMs).toBe(0);
    expect(schedule.totalSequenceMs).toBe(0);
  });
});

describe('buildActivationAnnouncements', () => {
  const t = (key: string, options?: Record<string, string | number>) => {
    const map: Record<string, string> = {
      'streaming_components.list_available_with_count': `List with ${options?.count} options available`,
      'streaming_components.list_available': 'List of options available',
      'streaming_components.cta_available': `${options?.label} link available`,
      'streaming_components.quick_replies_available': `${options?.count} options available`,
    };
    return map[key] ?? key;
  };

  it('builds ordered announcements using item_count only when present and never exposes CTA URL', () => {
    const message = baseMessage({
      list_message: {
        button_text: 'See 9 deals',
        item_count: 9,
        list_items: [{ uuid: '1', title: 'Coffee' }],
      },
      cta_message: {
        display_text: 'Track order',
        url: 'https://store.example/secret-token',
      },
      quick_replies: ['A', 'B', 'C'],
    });

    const announcements = buildActivationAnnouncements(message, t);
    expect(announcements).toEqual([
      'List with 9 options available',
      'Track order link available',
      '3 options available',
    ]);
    expect(announcements.join(' ')).not.toContain('secret-token');
  });

  it('uses generic list announcement when item_count is absent', () => {
    const message = baseMessage({
      list_message: {
        button_text: 'See recipes',
        list_items: [
          { uuid: '1', title: 'Recipe 1' },
          { uuid: '2', title: 'Recipe 2' },
        ],
      },
    });

    expect(buildActivationAnnouncements(message, t)).toEqual([
      'List of options available',
    ]);
  });
});
