import fs from 'fs';
import path from 'path';
import { renderHook, act } from '@testing-library/react';
import { useConversationStartersCore } from '@/hooks/useConversationStarters';
import { useChatContext } from '@/contexts/ChatContext';
import { UTM_SOURCES } from '@weni/webchat-service';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
  sendStorefrontUtm: jest.fn(),
}));

const { sendStorefrontUtm } = jest.requireMock('@/contexts/ChatContext');

const mockService = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  getStarters: jest.fn(),
  clearStarters: jest.fn(),
  setContext: jest.fn(),
  sendUtm: jest.fn(),
  getStorefrontSnapshot: jest.fn(() => ({ account: 'store' })),
};

function buildContext(overrides = {}) {
  return {
    service: mockService,
    isChatOpen: false,
    isConnected: true,
    sendMessage: jest.fn(),
    config: { conversationStarters: { pdp: true } },
    setIsChatOpen: jest.fn(),
    setCurrentPage: jest.fn(),
    ...overrides,
  };
}

function getEventHandler(eventName) {
  const call = mockService.on.mock.calls.find(([name]) => name === eventName);
  return call ? call[1] : undefined;
}

const productSnapshot = {
  account: 'store',
  productPath: '/shoes/p',
  skuId: 'sku-1',
  sellerId: '1',
  available: true,
  isProductPage: true,
  isCheckout: false,
  isFastStore: false,
};

describe('useConversationStartersCore', () => {
  let ctx;

  beforeEach(() => {
    jest.clearAllMocks();
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    ctx = buildContext();
    useChatContext.mockReturnValue(ctx);
  });

  it('does not import storefront readers or the navigation monitor', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, './useConversationStarters.js'),
      'utf8',
    );
    expect(source).not.toMatch(/@\/utils\/vtex/);
    expect(source).not.toMatch(/@\/utils\/navigationMonitor/);
  });

  it('renders questions from a product snapshot and starters:received', () => {
    const { result } = renderHook(() => useConversationStartersCore());
    act(() => {
      getEventHandler('storefront:changed')(productSnapshot);
    });
    act(() => {
      getEventHandler('starters:received')({
        questions: ['Is this waterproof?'],
      });
    });

    expect(result.current.questions).toEqual(['Is this waterproof?']);
    expect(result.current.fingerprint).toBe('store:/shoes/p');
    expect(mockService.getStarters).not.toHaveBeenCalled();
  });

  it('renders no starters for a non-product snapshot', () => {
    const { result } = renderHook(() => useConversationStartersCore());
    act(() => {
      getEventHandler('storefront:changed')(productSnapshot);
      getEventHandler('starters:received')({ questions: ['Keep me?'] });
    });
    act(() => {
      getEventHandler('storefront:changed')({
        ...productSnapshot,
        isProductPage: false,
        account: null,
        productPath: null,
      });
    });

    expect(result.current.questions).toEqual([]);
    expect(result.current.isCompactVisible).toBe(false);
  });

  it('shows the notify call to action when the snapshot is unavailable', () => {
    useChatContext.mockReturnValue(
      buildContext({
        config: {
          conversationStarters: { pdp: true },
          unavailableProductNotify: true,
        },
      }),
    );
    const { result } = renderHook(() => useConversationStartersCore());
    act(() => {
      getEventHandler('storefront:changed')({
        ...productSnapshot,
        available: false,
      });
    });

    expect(result.current.isBackInStockNotify).toBe(true);
    expect(result.current.questions.length).toBe(1);
    expect(mockService.getStarters).not.toHaveBeenCalled();
  });

  it('sends the clicked question and the starter attribution', () => {
    ctx.isChatOpen = true;
    const { result } = renderHook(() => useConversationStartersCore());
    act(() => {
      getEventHandler('starters:received')({ questions: ['Ship today?'] });
    });
    act(() => {
      result.current.handleFullStarterClick('Ship today?');
    });

    expect(ctx.sendMessage).toHaveBeenCalledWith('Ship today?', {
      skipUtm: true,
      fromConversationStarter: true,
    });
    expect(sendStorefrontUtm).toHaveBeenCalledWith(
      mockService,
      UTM_SOURCES.CONV_STARTER,
    );
  });

  it('keeps manual starters and the mobile auto-hide timer', () => {
    jest.useFakeTimers();
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    const { result } = renderHook(() => useConversationStartersCore());
    act(() => {
      getEventHandler('starters:set-manual')(['One', 'Two']);
    });
    expect(result.current.source).toBe('manual');
    expect(result.current.isCompactVisible).toBe(true);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.isHiding).toBe(true);
    jest.useRealTimers();
  });

  it('shows compact starters again when the chat closes', () => {
    const rendered = renderHook(() => useConversationStartersCore());
    act(() => {
      getEventHandler('starters:received')({ questions: ['One'] });
    });
    useChatContext.mockReturnValue(buildContext({ isChatOpen: true }));
    rendered.rerender();
    useChatContext.mockReturnValue(buildContext({ isChatOpen: false }));
    rendered.rerender();
    expect(rendered.result.current.isCompactVisible).toBe(true);
  });
});
