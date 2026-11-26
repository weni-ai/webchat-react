import {
  computeMessageDisplayMetadata,
  formatMessageTimestamp,
  getAuthorKey,
  getLocalMinuteKey,
  groupMessagesByAuthor,
  MILESTONE_CONFIG_MAP,
  normalizeLocale,
  STATUS_META_MAP,
  validateAuthor,
  validateHumanSupportEvent,
  validateShopperStatus,
  type HumanSupportMessage,
} from './humanSupportStatus';

const AGENT_JULIA_ID = 'ha_5f0c3a9e1b7d4c2a8e6f0b1d3c5a7e9f';
const AGENT_JULIA_2_ID = 'ha_0a1b2c3d4e5f60718293a4b5c6d7e8f9';
const START_EVENT_ID = '6f1d2c3b-4a59-5e6f-8a7b-9c0d1e2f3a4b';

describe('humanSupportStatus utilities', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('normalizeLocale & formatMessageTimestamp', () => {
    const today = new Date(2026, 10, 3, 15, 0, 0); // Nov 3, 2026 15:00 local

    it('normalizes supported and fallback locales', () => {
      expect(normalizeLocale('pt-BR')).toBe('pt');
      expect(normalizeLocale('es_ES')).toBe('es');
      expect(normalizeLocale('en-US')).toBe('en');
      expect(normalizeLocale('ro')).toBe('en');
      expect(normalizeLocale(undefined)).toBe('en');
      expect(normalizeLocale('')).toBe('en');
    });

    it('formats same-day times as 12h in en and 24h in pt/es', () => {
      const afternoon = new Date(2026, 10, 3, 14, 32, 0).getTime();
      const midnight = new Date(2026, 10, 3, 0, 5, 0).getTime();
      const noon = new Date(2026, 10, 3, 12, 0, 0).getTime();

      expect(formatMessageTimestamp(afternoon, 'en', today)).toBe('2:32 PM');
      expect(formatMessageTimestamp(midnight, 'en', today)).toBe('12:05 AM');
      expect(formatMessageTimestamp(noon, 'en', today)).toBe('12:00 PM');

      expect(formatMessageTimestamp(afternoon, 'pt', today)).toBe('14:32');
      expect(formatMessageTimestamp(midnight, 'pt-BR', today)).toBe('00:05');
      expect(formatMessageTimestamp(afternoon, 'es', today)).toBe('14:32');
      expect(formatMessageTimestamp(afternoon, 'ro', today)).toBe('2:32 PM');
    });

    it('formats other-day timestamps with MM/DD in en and DD/MM in pt/es', () => {
      const yesterday = new Date(2026, 10, 2, 14, 32, 0).getTime();
      expect(formatMessageTimestamp(yesterday, 'en', today)).toBe(
        '11/02 · 2:32 PM',
      );
      expect(formatMessageTimestamp(yesterday, 'pt', today)).toBe(
        '02/11 · 14:32',
      );
      expect(formatMessageTimestamp(yesterday, 'es', today)).toBe(
        '02/11 · 14:32',
      );
    });

    it('returns empty string for invalid timestamps', () => {
      expect(formatMessageTimestamp(0, 'en', today)).toBe('');
      expect(formatMessageTimestamp(-10, 'en', today)).toBe('');
      expect(formatMessageTimestamp(Number.NaN, 'en', today)).toBe('');
      expect(formatMessageTimestamp(undefined, 'en', today)).toBe('');
      expect(getLocalMinuteKey(0)).toBeNull();
    });
  });

  describe('validators & PII-free warnings', () => {
    it('accepts valid authors including Live Desk system messages without warning', () => {
      expect(validateAuthor(undefined)).toBeUndefined();
      expect(validateAuthor({ type: 'contact' })).toEqual({ type: 'contact' });
      expect(validateAuthor({ type: 'ai_agent' })).toEqual({
        type: 'ai_agent',
      });
      expect(
        validateAuthor({
          type: 'human_agent',
          id: AGENT_JULIA_ID,
          name: ' Julia ',
        }),
      ).toEqual({
        type: 'human_agent',
        id: AGENT_JULIA_ID,
        name: 'Julia',
      });
      expect(
        validateAuthor({ type: 'human_agent', id: AGENT_JULIA_ID }),
      ).toEqual({ type: 'human_agent', id: AGENT_JULIA_ID });
      // AD-005 item 3: Live Desk system message without id or name is valid.
      expect(validateAuthor({ type: 'human_agent' })).toEqual({
        type: 'human_agent',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('logs PII-free warning on malformed author payloads', () => {
      const ctx = { channelUuid: 'ch-1', sessionId: 'sess-1', messageId: 'm1' };

      expect(validateAuthor('invalid', ctx)).toBeUndefined();
      expect(validateAuthor({ type: 'unknown' }, ctx)).toBeUndefined();
      expect(
        validateAuthor(
          { type: 'human_agent', id: 'bad-id', name: 'Julia' },
          ctx,
        ),
      ).toBeUndefined();
      // Name without id falls back to system message without name and logs warning
      expect(
        validateAuthor({ type: 'human_agent', name: 'Julia' }, ctx),
      ).toEqual({ type: 'human_agent' });
      expect(
        validateAuthor(
          { type: 'human_agent', id: AGENT_JULIA_ID, name: 123 },
          ctx,
        ),
      ).toEqual({ type: 'human_agent', id: AGENT_JULIA_ID });
      expect(
        validateAuthor(
          { type: 'human_agent', id: AGENT_JULIA_ID, name: '   ' },
          ctx,
        ),
      ).toEqual({ type: 'human_agent', id: AGENT_JULIA_ID });

      expect(warnSpy).toHaveBeenCalledTimes(6);
      const serialized = JSON.stringify(warnSpy.mock.calls);
      expect(serialized).toContain('[WebChat:HumanSupportStatus]');
      expect(serialized).toContain('invalid_author');
      expect(serialized).not.toContain('Julia');
    });

    it('validates human support events and rejects invalid ones with PII-free warning', () => {
      const valid = {
        eventId: START_EVENT_ID,
        event: 'started' as const,
        occurredAt: 1793727245120,
      };
      expect(validateHumanSupportEvent(valid)).toEqual(valid);
      expect(warnSpy).not.toHaveBeenCalled();

      expect(validateHumanSupportEvent(null)).toBeNull();
      expect(
        validateHumanSupportEvent({
          eventId: 'not-a-uuid',
          event: 'started',
          occurredAt: 1793727245120,
        }),
      ).toBeNull();
      expect(
        validateHumanSupportEvent({
          eventId: START_EVENT_ID,
          event: 'transferred',
          occurredAt: 1793727245120,
        }),
      ).toBeNull();
      expect(
        validateHumanSupportEvent({
          eventId: START_EVENT_ID,
          event: 'ended',
          occurredAt: -1,
        }),
      ).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(4);
    });

    it('validates shopper statuses and ignores unexpected values with warning', () => {
      expect(validateShopperStatus(undefined)).toBeNull();
      expect(validateShopperStatus('streaming')).toBeNull();
      expect(validateShopperStatus('pending')).toBe('pending');
      expect(validateShopperStatus('sent')).toBe('sent');
      expect(validateShopperStatus('delivered')).toBe('delivered');
      expect(validateShopperStatus('read')).toBe('read');
      expect(validateShopperStatus('error')).toBe('error');
      expect(warnSpy).not.toHaveBeenCalled();

      expect(validateShopperStatus('queued')).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebChat:HumanSupportStatus]'),
        expect.objectContaining({ status: 'queued', reason: 'invalid_status' }),
      );
    });
  });

  describe('getAuthorKey, groupMessagesByAuthor & computeMessageDisplayMetadata', () => {
    const t1435a = new Date(2026, 10, 3, 14, 35, 10).getTime();
    const t1435b = new Date(2026, 10, 3, 14, 35, 45).getTime();
    const t1436 = new Date(2026, 10, 3, 14, 36, 5).getTime();

    it('distinguishes contact, ai_agent, two agents with same first name, system, and legacy', () => {
      expect(getAuthorKey({ type: 'contact' }, 'outgoing')).toBe('contact');
      expect(getAuthorKey({ type: 'ai_agent' }, 'incoming')).toBe('ai_agent');
      expect(
        getAuthorKey(
          { type: 'human_agent', id: AGENT_JULIA_ID, name: 'Julia' },
          'incoming',
        ),
      ).toBe(`human_agent:${AGENT_JULIA_ID}`);
      expect(
        getAuthorKey(
          { type: 'human_agent', id: AGENT_JULIA_2_ID, name: 'Julia' },
          'incoming',
        ),
      ).toBe(`human_agent:${AGENT_JULIA_2_ID}`);
      expect(getAuthorKey({ type: 'human_agent' }, 'incoming')).toBe(
        'human_agent:system',
      );
      expect(getAuthorKey(undefined, 'incoming')).toBe('legacy:incoming');
    });

    it('groups by author, isolates milestones and cart notices, and computes display metadata', () => {
      const messages: HumanSupportMessage[] = [
        {
          id: 'ai-1',
          type: 'text',
          direction: 'incoming',
          timestamp: t1435a,
          author: { type: 'ai_agent' },
        },
        {
          id: 'cart-1',
          type: 'conversation_status',
          direction: 'incoming',
          timestamp: t1435a,
          text: 'Sneakers added to cart',
        },
        {
          id: 'hs-1',
          type: 'human_support_event',
          direction: 'incoming',
          timestamp: t1435a,
          humanSupportEvent: {
            eventId: START_EVENT_ID,
            event: 'started',
            occurredAt: t1435a,
          },
        },
        {
          id: 'cart-2',
          type: 'conversation_status',
          direction: 'incoming',
          timestamp: t1435a,
          text: 'Socks added to cart',
        },
        {
          id: 'ag-1',
          type: 'text',
          direction: 'incoming',
          timestamp: t1435a,
          author: { type: 'human_agent', id: AGENT_JULIA_ID, name: 'Julia' },
        },
        {
          id: 'ag-2',
          type: 'text',
          direction: 'incoming',
          timestamp: t1435b,
          author: { type: 'human_agent', id: AGENT_JULIA_ID, name: 'Julia' },
        },
        {
          id: 'ag-3',
          type: 'text',
          direction: 'incoming',
          timestamp: t1436,
          author: { type: 'human_agent', id: AGENT_JULIA_ID, name: 'Julia' },
        },
        {
          id: 'ag-4',
          type: 'text',
          direction: 'incoming',
          timestamp: t1436,
          author: { type: 'human_agent', id: AGENT_JULIA_2_ID, name: 'Julia' },
        },
      ];

      const groups = groupMessagesByAuthor(messages);
      expect(groups.map((g) => g.kind)).toEqual([
        'messages',
        'conversation_status',
        'milestone',
        'conversation_status',
        'messages',
        'messages',
      ]);

      // First Julia group: 3 messages (2 in 14:35, 1 in 14:36)
      const julia1Meta = groups[4].displayMeta!;
      expect(julia1Meta).toEqual([
        {
          showAuthorName: true,
          authorName: 'Julia',
          showTimestamp: false,
          visibleStatus: null,
        },
        {
          showAuthorName: false,
          authorName: undefined,
          showTimestamp: true,
          visibleStatus: null,
        },
        {
          showAuthorName: false,
          authorName: undefined,
          showTimestamp: true,
          visibleStatus: null,
        },
      ]);

      // Second Julia (different HMAC id) starts a new group with her name shown
      expect(groups[5].displayMeta).toEqual([
        {
          showAuthorName: true,
          authorName: 'Julia',
          showTimestamp: true,
          visibleStatus: null,
        },
      ]);
    });

    it('keeps error status visible inside same-minute shopper groups and hides timestamp on streaming/legacy', () => {
      const meta = computeMessageDisplayMetadata([
        {
          id: 'u1',
          type: 'text',
          direction: 'outgoing',
          timestamp: t1435a,
          status: 'error',
          author: { type: 'contact' },
        },
        {
          id: 'u2',
          type: 'text',
          direction: 'outgoing',
          timestamp: t1435b,
          status: 'delivered',
          author: { type: 'contact' },
        },
      ]);

      expect(meta[0]).toMatchObject({
        showTimestamp: true,
        visibleStatus: 'error',
      });
      expect(meta[1]).toMatchObject({
        showTimestamp: true,
        visibleStatus: 'delivered',
      });

      const streamingMeta = computeMessageDisplayMetadata([
        {
          id: 'ai-done',
          type: 'text',
          direction: 'incoming',
          timestamp: t1435a,
          status: 'delivered',
          author: { type: 'ai_agent' },
        },
        {
          id: 'ai-stream',
          type: 'text',
          direction: 'incoming',
          timestamp: t1435b,
          status: 'streaming',
          author: { type: 'ai_agent' },
        },
      ]);
      expect(streamingMeta[0].showTimestamp).toBe(true);
      expect(streamingMeta[1].showTimestamp).toBe(false);

      const legacyMeta = computeMessageDisplayMetadata([
        {
          id: 'old-1',
          type: 'text',
          direction: 'outgoing',
          timestamp: t1435a,
          status: 'delivered',
        },
      ]);
      expect(legacyMeta[0]).toEqual({
        showAuthorName: false,
        authorName: undefined,
        showTimestamp: false,
        visibleStatus: null,
      });
    });

    it('exports expected status and milestone config maps', () => {
      expect(STATUS_META_MAP.read.color).toBe('sl-color-blue-10');
      expect(MILESTONE_CONFIG_MAP.started.badgeType).toBe('success');
      expect(MILESTONE_CONFIG_MAP.ended.badgeType).toBe('neutral');
    });
  });
});
