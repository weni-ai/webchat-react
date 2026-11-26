import { renderHook } from '@testing-library/react';

jest.mock('@/contexts/ChatContext.jsx', () => ({
  useChatContext: jest.fn(),
}));

import { useChatContext } from '@/contexts/ChatContext.jsx';
import { useWeniChat } from './useWeniChat';

const AGENT_A_ID = 'ha_5f0c3a9e1b7d4c2a8e6f0b1d3c5a7e9f';
const AGENT_B_ID = 'ha_0a1b2c3d4e5f60718293a4b5c6d7e8f9';

function buildContext(overrides = {}) {
  return {
    messages: [],
    currentPage: null,
    isChatOpen: true,
    setIsChatOpen: jest.fn(),
    setUnreadCount: jest.fn(),
    isConnectionClosed: false,
    connect: jest.fn(),
    setCurrentPage: jest.fn(),
    goBack: jest.fn(),
    clearPageHistory: jest.fn(),
    isHumanSupportFeatureEnabled: false,
    isHumanSupportActive: false,
    typingAuthor: null,
    service: {
      config: { channelUuid: 'ch-1' },
      getSession: () => ({ sessionId: 'sess-1' }),
    },
    ...overrides,
  };
}

describe('useWeniChat — ordering and author grouping', () => {
  it('re-sorts by timestamp and groups by direction when humanSupportStatus is OFF', () => {
    useChatContext.mockReturnValue(
      buildContext({
        isHumanSupportFeatureEnabled: false,
        messages: [
          { id: 'm2', type: 'text', direction: 'incoming', timestamp: 2000 },
          { id: 'm1', type: 'text', direction: 'incoming', timestamp: 1000 },
          { id: 'm3', type: 'text', direction: 'outgoing', timestamp: 3000 },
        ],
      }),
    );

    const { result } = renderHook(() => useWeniChat());
    expect(result.current.sortedMessages.map((m) => m.id)).toEqual([
      'm1',
      'm2',
      'm3',
    ]);
    expect(result.current.messageGroups).toHaveLength(2);
    expect(result.current.messageGroups[0].messages.map((m) => m.id)).toEqual([
      'm1',
      'm2',
    ]);
  });

  it('preserves canonical service order (orderKey) when humanSupportStatus is ON', () => {
    // Start milestone occurredAt (1000) precedes AI handoff message timestamp (1500),
    // but server orderKey puts milestone AFTER the AI announcement (AD-002 item 4).
    const aiMsg = {
      id: 'ai-handoff',
      type: 'text',
      direction: 'incoming',
      timestamp: 1500,
      orderKey: 1500,
      author: { type: 'ai_agent' },
    };
    const startMilestone = {
      id: 'hs_start',
      type: 'human_support_event',
      direction: 'incoming',
      timestamp: 1000,
      orderKey: 1600,
      humanSupportEvent: {
        eventId: '6f1d2c3b-4a59-5e6f-8a7b-9c0d1e2f3a4b',
        event: 'started',
        occurredAt: 1000,
      },
    };
    const pendingOutgoing = {
      id: 'u-pending',
      type: 'text',
      direction: 'outgoing',
      timestamp: 900,
      status: 'pending',
      author: { type: 'contact' },
    };

    useChatContext.mockReturnValue(
      buildContext({
        isHumanSupportFeatureEnabled: true,
        isHumanSupportActive: true,
        messages: [aiMsg, startMilestone, pendingOutgoing],
      }),
    );

    const { result } = renderHook(() => useWeniChat());
    expect(result.current.sortedMessages.map((m) => m.id)).toEqual([
      'ai-handoff',
      'hs_start',
      'u-pending',
    ]);
    expect(result.current.messageGroups.map((g) => g.kind)).toEqual([
      'messages',
      'milestone',
      'messages',
    ]);
  });

  it('separates different agents with same first name and system messages into distinct groups', () => {
    const t = new Date(2026, 10, 3, 14, 35, 0).getTime();
    useChatContext.mockReturnValue(
      buildContext({
        isHumanSupportFeatureEnabled: true,
        messages: [
          {
            id: 'a1',
            type: 'text',
            direction: 'incoming',
            timestamp: t,
            author: { type: 'human_agent', id: AGENT_A_ID, name: 'Julia' },
          },
          {
            id: 'a2',
            type: 'text',
            direction: 'incoming',
            timestamp: t + 5000,
            author: { type: 'human_agent', id: AGENT_B_ID, name: 'Julia' },
          },
          {
            id: 'sys',
            type: 'text',
            direction: 'incoming',
            timestamp: t + 10000,
            author: { type: 'human_agent' },
          },
        ],
      }),
    );

    const { result } = renderHook(() => useWeniChat());
    expect(result.current.messageGroups).toHaveLength(3);
    expect(result.current.messageGroups[0].displayMeta[0].authorName).toBe(
      'Julia',
    );
    expect(result.current.messageGroups[1].displayMeta[0].authorName).toBe(
      'Julia',
    );
    expect(result.current.messageGroups[2].displayMeta[0].showAuthorName).toBe(
      false,
    );
  });
});
