import { renderHook, act } from '@testing-library/react';
import { useConversationStartersCore } from '@/hooks/useConversationStarters';
import { useChatContext } from '@/contexts/ChatContext';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('@/utils/vtex', () => ({
  isVtexPdpPage: jest.fn(),
  extractSlugFromUrl: jest.fn(),
  extractProductPathFromUrl: jest.fn(),
  getVtexAccount: jest.fn(),
  resolveProductData: jest.fn(),
  normalizeForContext: jest.fn(),
  buildProductContextString: jest.fn(),
  getSelectedSkuId: jest.fn(),
  isSelectedSkuAvailable: jest.fn(),
}));

jest.mock('@/utils/navigationMonitor', () => ({
  createNavigationMonitor: jest.fn(),
}));

jest.mock('@/utils/sendVtexUtm', () => ({
  sendVtexUtm: jest.fn(),
  UTM_SOURCES: {
    CONV_STARTER: 'cx_shopping_assistant_conv_starter',
    ASSISTANT: 'cx_shopping_assistant',
    CART: 'cx_shopping_assistant_cart',
  },
}));

import {
  isVtexPdpPage,
  extractSlugFromUrl,
  extractProductPathFromUrl,
  getVtexAccount,
  resolveProductData,
  normalizeForContext,
  buildProductContextString,
  getSelectedSkuId,
  isSelectedSkuAvailable,
} from '@/utils/vtex';
import { createNavigationMonitor } from '@/utils/navigationMonitor';
import { sendVtexUtm, UTM_SOURCES } from '@/utils/sendVtexUtm';

const mockMonitor = { start: jest.fn(), stop: jest.fn() };

const mockService = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  isConnected: jest.fn(() => true),
  connect: jest.fn(),
  getStarters: jest.fn(),
  clearStarters: jest.fn(),
  setContext: jest.fn(),
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

function buildUnavailableNotifyContext(overrides = {}) {
  return buildContext({
    config: {
      conversationStarters: { pdp: true },
      unavailableProductNotify: true,
    },
    ...overrides,
  });
}

function getEventHandler(eventName) {
  const call = mockService.on.mock.calls.find(([name]) => name === eventName);
  return call ? call[1] : undefined;
}

describe('useConversationStartersCore', () => {
  let ctx;

  beforeEach(() => {
    jest.clearAllMocks();
    isVtexPdpPage.mockReturnValue(false);
    isSelectedSkuAvailable.mockReturnValue(true);
    createNavigationMonitor.mockReturnValue(mockMonitor);
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    ctx = buildContext();
    useChatContext.mockReturnValue(ctx);
  });

  describe('Initialization', () => {
    it('returns initial state with empty questions, no loading, not dismissed', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      expect(result.current.questions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInChatStartersDismissed).toBe(false);
      expect(result.current.isCompactVisible).toBe(false);
      expect(result.current.isHiding).toBe(false);
      expect(result.current.source).toBeNull();
      expect(result.current.fingerprint).toBeNull();
      expect(typeof result.current.handleCompactStarterClick).toBe('function');
      expect(typeof result.current.handleFullStarterClick).toBe('function');
      expect(typeof result.current.clearStarters).toBe('function');
    });
  });

  describe('PDP detection disabled', () => {
    it('does not call isVtexPdpPage when pdp config is falsy', () => {
      ctx = buildContext({ config: { conversationStarters: { pdp: false } } });
      useChatContext.mockReturnValue(ctx);
      isVtexPdpPage.mockClear();

      renderHook(() => useConversationStartersCore());

      expect(isVtexPdpPage).not.toHaveBeenCalled();
    });

    it('does not call isVtexPdpPage when conversationStarters is undefined', () => {
      ctx = buildContext({ config: {} });
      useChatContext.mockReturnValue(ctx);
      isVtexPdpPage.mockClear();

      renderHook(() => useConversationStartersCore());

      expect(isVtexPdpPage).not.toHaveBeenCalled();
    });
  });

  describe('PDP detection and fetch', () => {
    const fakeRawProduct = {
      productName: 'Cool Shoe',
      brand: 'Brand',
      description: 'A shoe',
      properties: [],
      items: [{ itemId: '1', name: 'SKU 1' }],
    };

    const fakeProductData = {
      account: 'mystore',
      linkText: 'cool-shoe',
      productPath: '/en/cool-shoe/p',
      productName: 'Cool Shoe',
      description: 'A shoe',
      brand: 'Brand',
      attributes: {},
    };

    beforeEach(() => {
      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('cool-shoe');
      extractProductPathFromUrl.mockReturnValue('/en/cool-shoe/p');
      getVtexAccount.mockReturnValue('mystore');
      resolveProductData.mockResolvedValue({
        productData: fakeProductData,
        rawProduct: fakeRawProduct,
        source: 'ld+json',
      });
      normalizeForContext.mockReturnValue(fakeRawProduct);
      buildProductContextString.mockReturnValue('Product: Cool Shoe');
      getSelectedSkuId.mockReturnValue('SKU-001');
    });

    it('resolves product data and calls getStarters on a PDP page', async () => {
      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(isVtexPdpPage).toHaveBeenCalled();
      expect(extractSlugFromUrl).toHaveBeenCalled();
      expect(resolveProductData).toHaveBeenCalledWith('cool-shoe', 'mystore');
      expect(mockService.getStarters).toHaveBeenCalledWith(fakeProductData);
      expect(getSelectedSkuId).toHaveBeenCalled();
      expect(normalizeForContext).toHaveBeenCalledWith(
        fakeRawProduct,
        'ld+json',
      );
      expect(buildProductContextString).toHaveBeenCalledWith(
        fakeRawProduct,
        'SKU-001',
      );
      expect(mockService.setContext).toHaveBeenCalledWith('Product: Cool Shoe');
    });

    it('passes null selectedSkuId when no SKU source is available', async () => {
      getSelectedSkuId.mockReturnValue(null);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(buildProductContextString).toHaveBeenCalledWith(
        fakeRawProduct,
        null,
      );
    });

    it('sets source to pdp and fingerprint during PDP fetch', async () => {
      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(hookResult.current.source).toBe('pdp');
      expect(hookResult.current.fingerprint).toBe('mystore:/en/cool-shoe/p');
    });

    it('stops loading when resolveProductData returns null', async () => {
      resolveProductData.mockResolvedValue(null);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(hookResult.current.isLoading).toBe(false);
      expect(mockService.getStarters).not.toHaveBeenCalled();
    });

    it('returns early when extractSlugFromUrl returns null', async () => {
      extractSlugFromUrl.mockReturnValue(null);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(resolveProductData).not.toHaveBeenCalled();
      expect(hookResult.current.isLoading).toBe(false);
    });

    it('returns early when getVtexAccount returns undefined', async () => {
      getVtexAccount.mockReturnValue(undefined);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(resolveProductData).not.toHaveBeenCalled();
      expect(hookResult.current.isLoading).toBe(false);
    });

    it('defers getStarters when service is not connected', async () => {
      useChatContext.mockReturnValue(buildContext({ isConnected: false }));

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();
    });

    it('calls getStarters directly when connection establishes during fetch', async () => {
      let resolveWaterfall;
      resolveProductData.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveWaterfall = resolve;
          }),
      );
      normalizeForContext.mockReturnValue(fakeRawProduct);
      buildProductContextString.mockReturnValue('ctx');

      useChatContext.mockReturnValue(buildContext({ isConnected: false }));
      const { rerender } = renderHook(() => useConversationStartersCore());

      useChatContext.mockReturnValue(buildContext({ isConnected: true }));
      rerender();

      await act(async () => {
        resolveWaterfall({
          productData: { account: 'store', linkText: 'shoe' },
          rawProduct: fakeRawProduct,
          source: 'intelligent-search',
        });
      });

      expect(mockService.getStarters).toHaveBeenCalledWith({
        account: 'store',
        linkText: 'shoe',
      });
    });
  });

  describe('starters:received event', () => {
    it('updates questions when starters:received fires', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');
      expect(handler).toBeDefined();

      act(() => {
        handler({ questions: ['Q1?', 'Q2?'] });
      });

      expect(result.current.questions).toEqual(['Q1?', 'Q2?']);
      expect(result.current.isCompactVisible).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('slices questions to a maximum of 3', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');

      act(() => {
        handler({ questions: ['A?', 'B?', 'C?', 'D?'] });
      });

      expect(result.current.questions).toEqual(['A?', 'B?', 'C?']);
    });

    it('defaults to empty array when questions is undefined', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');

      act(() => {
        handler({});
      });

      expect(result.current.questions).toEqual([]);
    });

    it('updates questions in PDP source when fingerprint is set', async () => {
      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('product-x');
      getVtexAccount.mockReturnValue('store');
      resolveProductData.mockResolvedValue({
        productData: { account: 'store', linkText: 'product-x' },
        rawProduct: { productName: 'X' },
        source: 'ld+json',
      });
      normalizeForContext.mockReturnValue({
        productName: 'X',
        properties: [],
        items: [],
      });
      buildProductContextString.mockReturnValue('ctx');

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(hookResult.current.source).toBe('pdp');

      mockService.on.mockClear();
      renderHook(() => useConversationStartersCore());

      const receivedHandler = getEventHandler('starters:received');
      if (receivedHandler) {
        act(() => {
          receivedHandler({ questions: ['PDP Q1?', 'PDP Q2?'] });
        });
      }
    });
  });

  describe('starters:error event', () => {
    it('sets loading to false and keeps questions empty', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      const errorHandler = getEventHandler('starters:error');
      expect(errorHandler).toBeDefined();

      act(() => {
        errorHandler();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.questions).toEqual([]);
    });
  });

  describe('starters:set-manual event', () => {
    it('sets manual questions, source, and visibility', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:set-manual');
      expect(handler).toBeDefined();

      act(() => {
        handler(['Manual Q1?', 'Manual Q2?']);
      });

      expect(result.current.questions).toEqual(['Manual Q1?', 'Manual Q2?']);
      expect(result.current.source).toBe('manual');
      expect(result.current.fingerprint).toBeNull();
      expect(result.current.isCompactVisible).toBe(true);
      expect(result.current.isInChatStartersDismissed).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('slices manual questions to 3', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:set-manual');

      act(() => {
        handler(['A?', 'B?', 'C?', 'D?', 'E?']);
      });

      expect(result.current.questions).toEqual(['A?', 'B?', 'C?']);
    });
  });

  describe('connected event with deferred product data', () => {
    it('sends deferred product data on connected event', async () => {
      useChatContext.mockReturnValue(buildContext({ isConnected: false }));
      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('shoe');
      getVtexAccount.mockReturnValue('store');
      resolveProductData.mockResolvedValue({
        productData: { account: 'store', linkText: 'shoe' },
        rawProduct: { productName: 'Shoe' },
        source: 'next-data',
      });
      normalizeForContext.mockReturnValue({
        productName: 'Shoe',
        properties: [],
        items: [],
      });
      buildProductContextString.mockReturnValue('ctx');

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();

      const connectedHandler = getEventHandler('connected');
      expect(connectedHandler).toBeDefined();

      act(() => {
        connectedHandler();
      });

      expect(mockService.getStarters).toHaveBeenCalledWith({
        account: 'store',
        linkText: 'shoe',
      });
    });

    it('does nothing on connected when no deferred data', () => {
      renderHook(() => useConversationStartersCore());

      const connectedHandler = getEventHandler('connected');

      act(() => {
        connectedHandler();
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();
    });
  });

  describe('connectOn: demand on PDP', () => {
    const pdpMocks = () => {
      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('shoe');
      getVtexAccount.mockReturnValue('store');
      resolveProductData.mockResolvedValue({
        productData: { account: 'store', linkText: 'shoe' },
        rawProduct: { productName: 'Shoe' },
        source: 'next-data',
      });
      normalizeForContext.mockReturnValue({
        productName: 'Shoe',
        properties: [],
        items: [],
      });
      buildProductContextString.mockReturnValue('ctx');
    };

    it('calls service.connect() when deferred on a PDP with connectOn demand', async () => {
      pdpMocks();
      useChatContext.mockReturnValue(
        buildContext({
          isConnected: false,
          isChatOpen: false,
          config: {
            connectOn: 'demand',
            conversationStarters: { pdp: true },
          },
        }),
      );

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.connect).toHaveBeenCalled();
      expect(mockService.getStarters).not.toHaveBeenCalled();
    });

    it('does not call service.connect() when connectOn is mount', async () => {
      pdpMocks();
      useChatContext.mockReturnValue(
        buildContext({
          isConnected: false,
          config: {
            connectOn: 'mount',
            conversationStarters: { pdp: true },
          },
        }),
      );

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.connect).not.toHaveBeenCalled();
      expect(mockService.getStarters).not.toHaveBeenCalled();
    });
  });

  describe('handleFullStarterClick when chat is open', () => {
    it('calls sendMessage, dismisses in-chat starters, removes question, keeps compact visibility flag', () => {
      ctx = buildContext({ isChatOpen: true, isConnected: true });
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');
      act(() => {
        handler({ questions: ['Q1?', 'Q2?'] });
      });

      act(() => {
        result.current.handleFullStarterClick('Q1?');
      });

      expect(ctx.sendMessage).toHaveBeenCalledWith('Q1?', { skipUtm: true });
      expect(sendVtexUtm).toHaveBeenCalledWith(
        mockService,
        UTM_SOURCES.CONV_STARTER,
        { silent: true },
      );
      expect(result.current.isInChatStartersDismissed).toBe(true);
      expect(result.current.isCompactVisible).toBe(true);
      expect(result.current.questions).toEqual(['Q2?']);
    });
  });

  describe('handleCompactStarterClick when chat is closed', () => {
    it('opens chat, removes clicked question, hides in-chat starters row, keeps compact state for outside', () => {
      ctx = buildContext({ isChatOpen: false, isConnected: true });
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');
      act(() => {
        handler({ questions: ['Q1?', 'Q2?', 'Q3?'] });
      });

      act(() => {
        result.current.handleCompactStarterClick('Q1?');
      });

      expect(ctx.setIsChatOpen).toHaveBeenCalledWith(true);
      expect(ctx.sendMessage).not.toHaveBeenCalled();
      expect(result.current.isInChatStartersDismissed).toBe(true);
      expect(result.current.isCompactVisible).toBe(true);
      expect(result.current.questions).toEqual(['Q2?', 'Q3?']);
    });

    it('handleFullStarterClick while chat closed dismisses in-chat row (close animation)', () => {
      ctx = buildContext({ isChatOpen: false, isConnected: true });
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');
      act(() => {
        handler({ questions: ['Q1?', 'Q2?'] });
      });

      act(() => {
        result.current.handleFullStarterClick('Q1?');
      });

      expect(result.current.isInChatStartersDismissed).toBe(true);
      expect(result.current.isCompactVisible).toBe(true);
      expect(result.current.questions).toEqual(['Q2?']);
      expect(ctx.setIsChatOpen).toHaveBeenCalledWith(true);
      expect(ctx.sendMessage).not.toHaveBeenCalled();
    });

    it('sends pending starter when chat opens and connects', () => {
      const sendMessage = jest.fn();
      const setIsChatOpen = jest.fn();
      ctx = buildContext({
        isChatOpen: false,
        isConnected: true,
        sendMessage,
        setIsChatOpen,
      });
      useChatContext.mockReturnValue(ctx);

      const { result, rerender } = renderHook(() =>
        useConversationStartersCore(),
      );

      const handler = getEventHandler('starters:received');
      act(() => {
        handler({ questions: ['Pending Q?', 'Other Q?'] });
      });

      act(() => {
        result.current.handleCompactStarterClick('Pending Q?');
      });

      expect(setIsChatOpen).toHaveBeenCalledWith(true);
      expect(sendMessage).not.toHaveBeenCalled();
      expect(result.current.questions).toEqual(['Other Q?']);

      const openCtx = buildContext({
        isChatOpen: true,
        isConnected: true,
        sendMessage,
        setIsChatOpen,
      });
      useChatContext.mockReturnValue(openCtx);

      rerender();

      expect(sendMessage).toHaveBeenCalledWith('Pending Q?', { skipUtm: true });
      expect(sendVtexUtm).toHaveBeenCalledWith(
        mockService,
        UTM_SOURCES.CONV_STARTER,
        { silent: true },
      );
    });
  });

  describe('clearStarters', () => {
    it('resets state and calls service.clearStarters', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');
      act(() => {
        handler({ questions: ['Q1?'] });
      });
      expect(result.current.questions).toEqual(['Q1?']);

      act(() => {
        result.current.clearStarters();
      });

      expect(result.current.questions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isCompactVisible).toBe(false);
      expect(result.current.isInChatStartersDismissed).toBe(false);
      expect(mockService.clearStarters).toHaveBeenCalled();
      expect(mockService.setContext).toHaveBeenCalledWith('');
    });
  });

  describe('Mobile auto-hide', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('starts auto-hide timer on mobile when starters are received', () => {
      window.matchMedia = jest.fn().mockReturnValue({ matches: true });

      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');

      act(() => {
        handler({ questions: ['Q1?'] });
      });

      expect(result.current.isCompactVisible).toBe(true);
      expect(result.current.isHiding).toBe(false);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.isHiding).toBe(true);

      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(result.current.isCompactVisible).toBe(false);
      expect(result.current.isHiding).toBe(false);
    });

    it('does not auto-hide on desktop', () => {
      window.matchMedia = jest.fn().mockReturnValue({ matches: false });

      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');

      act(() => {
        handler({ questions: ['Q1?'] });
      });

      act(() => {
        jest.advanceTimersByTime(6000);
      });

      expect(result.current.isCompactVisible).toBe(true);
      expect(result.current.isHiding).toBe(false);
    });
  });

  describe('Event listener cleanup', () => {
    it('unregisters listeners on unmount', () => {
      const { unmount } = renderHook(() => useConversationStartersCore());

      unmount();

      expect(mockService.off).toHaveBeenCalledWith(
        'starters:received',
        expect.any(Function),
      );
      expect(mockService.off).toHaveBeenCalledWith(
        'starters:error',
        expect.any(Function),
      );
      expect(mockService.off).toHaveBeenCalledWith(
        'connected',
        expect.any(Function),
      );
      expect(mockService.off).toHaveBeenCalledWith(
        'starters:set-manual',
        expect.any(Function),
      );
    });
  });

  describe('Navigation monitor', () => {
    it('starts the monitor on mount and stops on unmount', () => {
      const { unmount } = renderHook(() => useConversationStartersCore());

      expect(createNavigationMonitor).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(mockMonitor.start).toHaveBeenCalled();

      unmount();

      expect(mockMonitor.stop).toHaveBeenCalled();
    });

    it('debounces navigation events before clearing starters', () => {
      jest.useFakeTimers();
      renderHook(() => useConversationStartersCore());

      const onNavigate = createNavigationMonitor.mock.calls[0][0];

      act(() => {
        onNavigate();
        onNavigate();
        onNavigate();
      });

      expect(mockService.clearStarters).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockService.clearStarters).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('skips navigation reset when pathname is unchanged', () => {
      jest.useFakeTimers();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, pathname: '/product/p' },
      });

      renderHook(() => useConversationStartersCore());
      mockService.clearStarters.mockClear();

      const onNavigate = createNavigationMonitor.mock.calls[0][0];

      act(() => {
        onNavigate();
      });

      act(() => {
        jest.advanceTimersByTime(300 + 200);
      });

      expect(mockService.clearStarters).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('clears starters when pathname changes after navigation', () => {
      jest.useFakeTimers();
      let pathname = '/product-a/p';
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...window.location,
          get pathname() {
            return pathname;
          },
        },
      });

      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('product-a');
      getVtexAccount.mockReturnValue('store');
      resolveProductData.mockResolvedValue({
        productData: { account: 'store', linkText: 'product-a' },
        rawProduct: { productName: 'A' },
        source: 'ld+json',
      });
      normalizeForContext.mockReturnValue({ productName: 'A', properties: [] });
      buildProductContextString.mockReturnValue('ctx');

      renderHook(() => useConversationStartersCore());
      mockService.clearStarters.mockClear();

      pathname = '/product-b/p';
      extractSlugFromUrl.mockReturnValue('product-b');

      const onNavigate = createNavigationMonitor.mock.calls[0][0];

      act(() => {
        onNavigate();
      });

      act(() => {
        jest.advanceTimersByTime(300 + 200);
      });

      expect(mockService.clearStarters).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });

  describe('Compact visibility on chat close', () => {
    it('shows compact starters when chat closes and questions exist', () => {
      ctx = buildContext({ isChatOpen: true, isConnected: true });
      useChatContext.mockReturnValue(ctx);

      const { result, rerender } = renderHook(() =>
        useConversationStartersCore(),
      );

      const handler = getEventHandler('starters:received');
      act(() => {
        handler({ questions: ['Q1?', 'Q2?'] });
      });

      expect(result.current.isCompactVisible).toBe(true);

      ctx = buildContext({ isChatOpen: false, isConnected: true });
      useChatContext.mockReturnValue(ctx);
      rerender();

      expect(result.current.isCompactVisible).toBe(true);
      expect(result.current.questions).toEqual(['Q1?', 'Q2?']);
    });
  });

  describe('back-in-stock notify', () => {
    const fakeProductData = {
      account: 'mystore',
      linkText: 'cool-shoe',
      productName: 'Cool Shoe',
      description: 'A cool shoe',
      brand: 'Nike',
      attributes: {},
    };
    const fakeRawProduct = { productName: 'Cool Shoe', items: [] };
    const unavailableNormalized = {
      productName: 'Cool Shoe',
      items: [
        {
          itemId: 'SKU-001',
          sellers: [{ commertialOffer: { AvailableQuantity: 0 } }],
        },
      ],
    };

    beforeEach(() => {
      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('cool-shoe');
      extractProductPathFromUrl.mockReturnValue('/en/cool-shoe/p');
      getVtexAccount.mockReturnValue('mystore');
      resolveProductData.mockResolvedValue({
        productData: fakeProductData,
        rawProduct: fakeRawProduct,
        source: 'ld+json',
      });
      normalizeForContext.mockReturnValue(unavailableNormalized);
      buildProductContextString.mockReturnValue('Product: Cool Shoe');
      getSelectedSkuId.mockReturnValue('SKU-001');
      ctx = buildUnavailableNotifyContext();
      useChatContext.mockReturnValue(ctx);
    });

    it('skips getStarters and shows notify CTA when SKU is unavailable', async () => {
      isSelectedSkuAvailable.mockReturnValue(false);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();
      expect(mockService.setContext).toHaveBeenCalledWith('Product: Cool Shoe');
      expect(hookResult.current.isBackInStockNotify).toBe(true);
      expect(hookResult.current.productName).toBe('Cool Shoe');
      expect(hookResult.current.questions).toEqual([
        'Notify me when back in stock',
      ]);
      expect(hookResult.current.isCompactVisible).toBe(true);
      expect(hookResult.current.isLoading).toBe(false);
    });

    it('requests starters when feature is disabled even if SKU is unavailable', async () => {
      isSelectedSkuAvailable.mockReturnValue(false);
      ctx = buildContext({
        config: {
          conversationStarters: { pdp: true },
          unavailableProductNotify: false,
        },
      });
      useChatContext.mockReturnValue(ctx);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(mockService.getStarters).toHaveBeenCalledWith(fakeProductData);
      expect(hookResult.current.isBackInStockNotify).toBe(false);
    });

    it('still requests starters when SKU is available', async () => {
      isSelectedSkuAvailable.mockReturnValue(true);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.getStarters).toHaveBeenCalledWith(fakeProductData);
    });

    it('opens back-in-stock page on CTA click when chat is open', async () => {
      isSelectedSkuAvailable.mockReturnValue(false);
      ctx = buildUnavailableNotifyContext({ isChatOpen: true });
      useChatContext.mockReturnValue(ctx);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      act(() => {
        hookResult.current.handleFullStarterClick(
          'Notify me when back in stock',
        );
      });

      expect(ctx.sendMessage).not.toHaveBeenCalled();
      expect(ctx.setCurrentPage).toHaveBeenCalledWith({
        view: 'back-in-stock-notify',
        title: "Get notified when it's back in stock",
        props: { productName: 'Cool Shoe' },
      });
      expect(hookResult.current.isInChatStartersDismissed).toBe(true);
    });

    it('opens chat then page when CTA is clicked while chat is closed', async () => {
      isSelectedSkuAvailable.mockReturnValue(false);

      let hookResult;
      let rerender;
      await act(async () => {
        const rendered = renderHook(() => useConversationStartersCore());
        hookResult = rendered.result;
        rerender = rendered.rerender;
      });

      act(() => {
        hookResult.current.handleFullStarterClick(
          'Notify me when back in stock',
        );
      });

      expect(ctx.setIsChatOpen).toHaveBeenCalledWith(true);
      expect(ctx.setCurrentPage).not.toHaveBeenCalled();

      ctx = buildUnavailableNotifyContext({
        isChatOpen: true,
        setCurrentPage: ctx.setCurrentPage,
      });
      useChatContext.mockReturnValue(ctx);
      rerender();

      expect(ctx.setCurrentPage).toHaveBeenCalledWith({
        view: 'back-in-stock-notify',
        title: "Get notified when it's back in stock",
        props: { productName: 'Cool Shoe' },
      });
    });

    it('forces notify mode on starters:simulate-unavailable', () => {
      const { result } = renderHook(() => useConversationStartersCore());
      const handler = getEventHandler('starters:simulate-unavailable');
      expect(handler).toBeDefined();

      act(() => {
        handler({ productName: 'Oculus Quest' });
      });

      expect(result.current.isBackInStockNotify).toBe(true);
      expect(result.current.productName).toBe('Oculus Quest');
      expect(result.current.questions).toEqual([
        'Notify me when back in stock',
      ]);
      expect(result.current.isCompactVisible).toBe(true);
    });

    it('uses Sample Product when simulate payload has no name', () => {
      const { result } = renderHook(() => useConversationStartersCore());
      const handler = getEventHandler('starters:simulate-unavailable');

      act(() => {
        handler({});
      });

      expect(result.current.productName).toBe('Sample Product');
    });
  });

  describe('No service', () => {
    it('handles missing service gracefully', () => {
      ctx = buildContext({ service: null });
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStartersCore());

      expect(result.current.questions).toEqual([]);

      act(() => {
        result.current.clearStarters();
      });

      expect(result.current.questions).toEqual([]);
    });
  });
});
