import { renderHook, act } from '@testing-library/react';
import { useConversationStarters } from '@/hooks/useConversationStarters';
import { useChatContext } from '@/contexts/ChatContext';
import {
  isVtexPdpPage,
  extractSlugFromUrl,
  getVtexAccount,
  fetchProductData,
  selectProduct,
  extractProductData,
  getSelectedSku,
  buildSkuContextString,
} from '@/utils/vtex';
import { createNavigationMonitor } from '@/utils/navigationMonitor';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('@/utils/vtex', () => ({
  isVtexPdpPage: jest.fn(),
  extractSlugFromUrl: jest.fn(),
  getVtexAccount: jest.fn(),
  fetchProductData: jest.fn(),
  selectProduct: jest.fn(),
  extractProductData: jest.fn(),
  getSelectedSku: jest.fn(),
  buildSkuContextString: jest.fn(),
}));

jest.mock('@/utils/navigationMonitor', () => ({
  createNavigationMonitor: jest.fn(),
}));

const mockMonitor = { start: jest.fn(), stop: jest.fn() };

const mockService = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  isConnected: jest.fn(() => true),
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
    ...overrides,
  };
}

function getEventHandler(eventName) {
  const call = mockService.on.mock.calls.find(([name]) => name === eventName);
  return call ? call[1] : undefined;
}

describe('useConversationStarters', () => {
  let ctx;

  beforeEach(() => {
    jest.clearAllMocks();
    isVtexPdpPage.mockReturnValue(false);
    createNavigationMonitor.mockReturnValue(mockMonitor);
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    ctx = buildContext();
    useChatContext.mockReturnValue(ctx);
  });

  describe('Initialization', () => {
    it('returns initial state with empty questions, no loading, not dismissed', () => {
      const { result } = renderHook(() => useConversationStarters());

      expect(result.current.questions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isDismissed).toBe(false);
      expect(result.current.isCompactVisible).toBe(false);
      expect(result.current.isHiding).toBe(false);
      expect(result.current.source).toBeNull();
      expect(result.current.fingerprint).toBeNull();
      expect(typeof result.current.handleStarterClick).toBe('function');
      expect(typeof result.current.clearStarters).toBe('function');
    });
  });

  describe('PDP detection disabled', () => {
    it('does not call isVtexPdpPage when pdp config is falsy', () => {
      ctx = buildContext({ config: { conversationStarters: { pdp: false } } });
      useChatContext.mockReturnValue(ctx);
      isVtexPdpPage.mockClear();

      renderHook(() => useConversationStarters());

      expect(isVtexPdpPage).not.toHaveBeenCalled();
    });

    it('does not call isVtexPdpPage when conversationStarters is undefined', () => {
      ctx = buildContext({ config: {} });
      useChatContext.mockReturnValue(ctx);
      isVtexPdpPage.mockClear();

      renderHook(() => useConversationStarters());

      expect(isVtexPdpPage).not.toHaveBeenCalled();
    });
  });

  describe('PDP detection and fetch', () => {
    const fakeProduct = {
      linkText: 'cool-shoe',
      productName: 'Cool Shoe',
      description: 'A shoe',
      brand: 'Brand',
      properties: [],
      items: [{ itemId: '1', name: 'SKU 1' }],
    };

    beforeEach(() => {
      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('cool-shoe');
      getVtexAccount.mockReturnValue('mystore');
      fetchProductData.mockResolvedValue({ products: [fakeProduct] });
      selectProduct.mockReturnValue(fakeProduct);
      extractProductData.mockReturnValue({ account: 'mystore', linkText: 'cool-shoe' });
      getSelectedSku.mockReturnValue({ itemId: '1', name: 'SKU 1' });
      buildSkuContextString.mockReturnValue('Product: Cool Shoe');
    });

    it('fetches product data and calls getStarters on a PDP page', async () => {
      await act(async () => {
        renderHook(() => useConversationStarters());
      });

      expect(isVtexPdpPage).toHaveBeenCalled();
      expect(extractSlugFromUrl).toHaveBeenCalled();
      expect(fetchProductData).toHaveBeenCalledWith('cool-shoe');
      expect(selectProduct).toHaveBeenCalledWith([fakeProduct], 'cool-shoe');
      expect(mockService.getStarters).toHaveBeenCalledWith({
        account: 'mystore',
        linkText: 'cool-shoe',
      });
      expect(mockService.setContext).toHaveBeenCalledWith('Product: Cool Shoe');
    });

    it('sets source to pdp and fingerprint during PDP fetch', async () => {
      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStarters());
        hookResult = result;
      });

      expect(hookResult.current.source).toBe('pdp');
      expect(hookResult.current.fingerprint).toBe('mystore:cool-shoe');
    });

    it('stops loading when fetchProductData returns no products', async () => {
      fetchProductData.mockResolvedValue(null);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStarters());
        hookResult = result;
      });

      expect(hookResult.current.isLoading).toBe(false);
      expect(mockService.getStarters).not.toHaveBeenCalled();
    });

    it('stops loading when selectProduct returns null', async () => {
      selectProduct.mockReturnValue(null);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStarters());
        hookResult = result;
      });

      expect(hookResult.current.isLoading).toBe(false);
      expect(mockService.getStarters).not.toHaveBeenCalled();
    });

    it('returns early when extractSlugFromUrl returns null', async () => {
      extractSlugFromUrl.mockReturnValue(null);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStarters());
        hookResult = result;
      });

      expect(fetchProductData).not.toHaveBeenCalled();
      expect(hookResult.current.isLoading).toBe(false);
    });

    it('defers getStarters when service is not connected', async () => {
      mockService.isConnected.mockReturnValue(false);

      await act(async () => {
        renderHook(() => useConversationStarters());
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();
    });
  });

  describe('starters:received event', () => {
    it('updates questions when starters:received fires', () => {
      const { result } = renderHook(() => useConversationStarters());

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
      const { result } = renderHook(() => useConversationStarters());

      const handler = getEventHandler('starters:received');

      act(() => {
        handler({ questions: ['A?', 'B?', 'C?', 'D?'] });
      });

      expect(result.current.questions).toEqual(['A?', 'B?', 'C?']);
    });

    it('defaults to empty array when questions is undefined', () => {
      const { result } = renderHook(() => useConversationStarters());

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
      const product = { linkText: 'product-x', items: [] };
      fetchProductData.mockResolvedValue({ products: [product] });
      selectProduct.mockReturnValue(product);
      extractProductData.mockReturnValue({ account: 'store' });
      getSelectedSku.mockReturnValue(null);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStarters());
        hookResult = result;
      });

      expect(hookResult.current.source).toBe('pdp');

      mockService.on.mockClear();
      const { result, rerender } = renderHook(() => useConversationStarters());

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
      const { result } = renderHook(() => useConversationStarters());

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
      const { result } = renderHook(() => useConversationStarters());

      const handler = getEventHandler('starters:set-manual');
      expect(handler).toBeDefined();

      act(() => {
        handler(['Manual Q1?', 'Manual Q2?']);
      });

      expect(result.current.questions).toEqual(['Manual Q1?', 'Manual Q2?']);
      expect(result.current.source).toBe('manual');
      expect(result.current.fingerprint).toBeNull();
      expect(result.current.isCompactVisible).toBe(true);
      expect(result.current.isDismissed).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('slices manual questions to 3', () => {
      const { result } = renderHook(() => useConversationStarters());

      const handler = getEventHandler('starters:set-manual');

      act(() => {
        handler(['A?', 'B?', 'C?', 'D?', 'E?']);
      });

      expect(result.current.questions).toEqual(['A?', 'B?', 'C?']);
    });
  });

  describe('connected event with deferred product data', () => {
    it('sends deferred product data on connected event', async () => {
      mockService.isConnected.mockReturnValue(false);
      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('shoe');
      getVtexAccount.mockReturnValue('store');
      const product = { linkText: 'shoe', items: [{ itemId: '1' }] };
      fetchProductData.mockResolvedValue({ products: [product] });
      selectProduct.mockReturnValue(product);
      extractProductData.mockReturnValue({ account: 'store', linkText: 'shoe' });
      getSelectedSku.mockReturnValue({ itemId: '1' });
      buildSkuContextString.mockReturnValue('ctx');

      await act(async () => {
        renderHook(() => useConversationStarters());
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
      renderHook(() => useConversationStarters());

      const connectedHandler = getEventHandler('connected');

      act(() => {
        connectedHandler();
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();
    });
  });

  describe('handleStarterClick when chat is open', () => {
    it('calls sendMessage with the question', () => {
      ctx = buildContext({ isChatOpen: true, isConnected: true });
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStarters());

      act(() => {
        result.current.handleStarterClick('Q1?');
      });

      expect(ctx.sendMessage).toHaveBeenCalledWith('Q1?');
      expect(result.current.isDismissed).toBe(true);
      expect(result.current.isCompactVisible).toBe(false);
    });
  });

  describe('handleStarterClick when chat is closed', () => {
    it('calls setIsChatOpen(true) without sending message', () => {
      ctx = buildContext({ isChatOpen: false, isConnected: true });
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStarters());

      act(() => {
        result.current.handleStarterClick('Q1?');
      });

      expect(ctx.setIsChatOpen).toHaveBeenCalledWith(true);
      expect(ctx.sendMessage).not.toHaveBeenCalled();
      expect(result.current.isDismissed).toBe(true);
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

      const { result, rerender } = renderHook(() => useConversationStarters());

      act(() => {
        result.current.handleStarterClick('Pending Q?');
      });

      expect(setIsChatOpen).toHaveBeenCalledWith(true);
      expect(sendMessage).not.toHaveBeenCalled();

      const openCtx = buildContext({
        isChatOpen: true,
        isConnected: true,
        sendMessage,
        setIsChatOpen,
      });
      useChatContext.mockReturnValue(openCtx);

      rerender();

      expect(sendMessage).toHaveBeenCalledWith('Pending Q?');
    });
  });

  describe('clearStarters', () => {
    it('resets state and calls service.clearStarters', () => {
      const { result } = renderHook(() => useConversationStarters());

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
      expect(result.current.isDismissed).toBe(false);
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

      const { result } = renderHook(() => useConversationStarters());

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

      const { result } = renderHook(() => useConversationStarters());

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
      const { unmount } = renderHook(() => useConversationStarters());

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
      const { unmount } = renderHook(() => useConversationStarters());

      expect(createNavigationMonitor).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(mockMonitor.start).toHaveBeenCalled();

      unmount();

      expect(mockMonitor.stop).toHaveBeenCalled();
    });

    it('resets starters and clears context when navigation occurs', () => {
      renderHook(() => useConversationStarters());

      const onNavigate = createNavigationMonitor.mock.calls[0][0];

      act(() => {
        onNavigate();
      });

      expect(mockService.clearStarters).toHaveBeenCalled();
      expect(mockService.setContext).toHaveBeenCalledWith('');
    });
  });

  describe('No service', () => {
    it('handles missing service gracefully', () => {
      ctx = buildContext({ service: null });
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStarters());

      expect(result.current.questions).toEqual([]);

      act(() => {
        result.current.clearStarters();
      });

      expect(result.current.questions).toEqual([]);
    });
  });
});
