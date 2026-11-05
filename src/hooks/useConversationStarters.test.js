import { renderHook, act } from '@testing-library/react';
import { useConversationStartersCore } from '@/hooks/useConversationStarters';
import { useChatContext } from '@/contexts/ChatContext';
import {
  isVtexPdpPage,
  extractSlugFromUrl,
  extractProductPathFromUrl,
  getVtexAccount,
  resolveProductData,
  normalizeForContext,
  buildProductContextString,
  getSelectedSkuId,
  getSkuIdFromRawProduct,
} from '@/utils/vtex';
import { createNavigationMonitor } from '@/utils/navigationMonitor';
import { sendVtexUtm, UTM_SOURCES } from '@/utils/sendVtexUtm';
import {
  clearConversationStartersLog,
  getConversationStartersLog,
} from '@/utils/conversationStartersLog';

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
  getSkuIdFromRawProduct: jest.fn(),
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
  evaluateBackInStockOffer: jest.fn(() => ({
    isUnavailable: false,
    skuId: '',
    seller: '1',
  })),
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

function buildWhatsappOffersContext(overrides = {}) {
  return buildContext({
    config: {
      conversationStarters: { pdp: true },
      whatsappOffersNotify: true,
    },
    ...overrides,
  });
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

function buildNotifyOnlyContext(overrides = {}) {
  return buildContext({
    config: {
      conversationStarters: { pdp: false },
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
    clearConversationStartersLog();
    isVtexPdpPage.mockReturnValue(false);
    getSkuIdFromRawProduct.mockReturnValue(null);
    mockService.evaluateBackInStockOffer.mockReturnValue({
      isUnavailable: false,
      skuId: '',
      seller: '1',
    });
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
      expect(result.current.hasShownCompactStarters).toBe(false);
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
      getSkuIdFromRawProduct.mockReturnValue(null);
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
      getSkuIdFromRawProduct.mockReturnValue(null);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(buildProductContextString).toHaveBeenCalledWith(
        fakeRawProduct,
        null,
      );
    });

    it('falls back to raw product SKU when getSelectedSkuId returns null', async () => {
      getSelectedSkuId.mockReturnValue(null);
      getSkuIdFromRawProduct.mockReturnValue('000310122646');

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(getSkuIdFromRawProduct).toHaveBeenCalledWith(
        fakeRawProduct,
        'ld+json',
      );
      expect(buildProductContextString).toHaveBeenCalledWith(
        fakeRawProduct,
        '000310122646',
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

    it('fetches PDP starters when the VTEX account is detected after mount', async () => {
      getVtexAccount.mockReturnValue(undefined);
      useChatContext.mockReturnValue(
        buildContext({ isInsideVTEXStore: false }),
      );

      let rerender;
      await act(async () => {
        ({ rerender } = renderHook(() => useConversationStartersCore()));
      });
      expect(resolveProductData).not.toHaveBeenCalled();

      getVtexAccount.mockReturnValue('mystore');
      useChatContext.mockReturnValue(buildContext({ isInsideVTEXStore: true }));
      await act(async () => {
        rerender();
      });

      expect(resolveProductData).toHaveBeenCalledTimes(1);
      expect(resolveProductData).toHaveBeenCalledWith('cool-shoe', 'mystore');
      expect(mockService.getStarters).toHaveBeenCalledWith(fakeProductData);
    });

    it('does not refetch PDP starters when the account was known at mount', async () => {
      useChatContext.mockReturnValue(buildContext({ isInsideVTEXStore: true }));

      let rerender;
      await act(async () => {
        ({ rerender } = renderHook(() => useConversationStartersCore()));
      });
      await act(async () => {
        rerender();
      });

      expect(resolveProductData).toHaveBeenCalledTimes(1);
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
      expect(result.current.hasShownCompactStarters).toBe(true);
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

    it('does not set hasShownCompactStarters when received questions are empty', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');

      act(() => {
        handler({});
      });

      expect(result.current.hasShownCompactStarters).toBe(false);
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
      expect(result.current.hasShownCompactStarters).toBe(true);
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

  describe('starters:clear event', () => {
    it('resets state and calls service.clearStarters and setContext', () => {
      const { result } = renderHook(() => useConversationStartersCore());

      const setManual = getEventHandler('starters:set-manual');
      act(() => {
        setManual(['Manual Q1?', 'Manual Q2?']);
      });

      expect(result.current.questions).toHaveLength(2);

      const clearHandler = getEventHandler('starters:clear');
      expect(clearHandler).toBeDefined();

      act(() => {
        clearHandler();
      });

      expect(result.current.questions).toEqual([]);
      expect(result.current.source).toBeNull();
      expect(result.current.isCompactVisible).toBe(false);
      expect(result.current.hasShownCompactStarters).toBe(true);
      expect(mockService.clearStarters).toHaveBeenCalled();
      expect(mockService.setContext).toHaveBeenCalledWith('');
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

      expect(ctx.sendMessage).toHaveBeenCalledWith('Q1?', {
        skipUtm: true,
        fromConversationStarter: true,
      });
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

      expect(sendMessage).toHaveBeenCalledWith('Pending Q?', {
        skipUtm: true,
        fromConversationStarter: true,
      });
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
      expect(result.current.hasShownCompactStarters).toBe(true);
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
      expect(result.current.hasShownCompactStarters).toBe(true);
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
      expect(mockService.off).toHaveBeenCalledWith(
        'starters:clear',
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

    it('resets hasShownCompactStarters when pathname changes after navigation', () => {
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

      const { result } = renderHook(() => useConversationStartersCore());

      const handler = getEventHandler('starters:received');
      act(() => {
        handler({ questions: ['Q1?'] });
      });
      expect(result.current.hasShownCompactStarters).toBe(true);

      pathname = '/home';
      const onNavigate = createNavigationMonitor.mock.calls[0][0];

      act(() => {
        onNavigate();
      });

      act(() => {
        jest.advanceTimersByTime(300 + 200);
      });

      expect(result.current.hasShownCompactStarters).toBe(false);
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

  describe('whatsapp offers opt-in', () => {
    it('ignores simulate when the feature is disabled', () => {
      const { result } = renderHook(() => useConversationStartersCore());
      const handler = getEventHandler('starters:simulate-whatsapp-offers');
      expect(handler).toBeDefined();

      act(() => {
        handler({});
      });

      expect(result.current.isWhatsappOffersOptIn).toBe(false);
      expect(result.current.isOptInBalloonVisible).toBe(false);
    });

    it('shows the balloon on simulate when the feature is enabled', () => {
      ctx = buildWhatsappOffersContext();
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStartersCore());
      const handler = getEventHandler('starters:simulate-whatsapp-offers');

      act(() => {
        handler({});
      });

      expect(result.current.isWhatsappOffersOptIn).toBe(true);
      expect(result.current.isOptInBalloonVisible).toBe(true);
      expect(result.current.couponPercent).toBeNull();
      expect(result.current.questions).toEqual([]);
    });

    it('stores couponPercent from the simulate payload', () => {
      ctx = buildWhatsappOffersContext();
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStartersCore());
      const handler = getEventHandler('starters:simulate-whatsapp-offers');

      act(() => {
        handler({ couponPercent: 20 });
      });

      expect(result.current.couponPercent).toBe(20);
    });

    it('opens the opt-in page on balloon click when chat is open', () => {
      ctx = buildWhatsappOffersContext({ isChatOpen: true });
      useChatContext.mockReturnValue(ctx);

      const { result } = renderHook(() => useConversationStartersCore());
      const handler = getEventHandler('starters:simulate-whatsapp-offers');

      act(() => {
        handler({ couponPercent: 20 });
      });

      act(() => {
        result.current.handleWhatsappOffersClick();
      });

      expect(ctx.setCurrentPage).toHaveBeenCalledWith({
        view: 'whatsapp-offers-opt-in',
        title: 'Get a 20% discount coupon on WhatsApp',
        props: { couponPercent: 20 },
      });
      expect(result.current.isOptInBalloonVisible).toBe(false);
    });

    it('opens chat then page when balloon is clicked while chat is closed', () => {
      ctx = buildWhatsappOffersContext();
      useChatContext.mockReturnValue(ctx);

      let hookResult;
      let rerender;
      const rendered = renderHook(() => useConversationStartersCore());
      hookResult = rendered.result;
      rerender = rendered.rerender;

      const handler = getEventHandler('starters:simulate-whatsapp-offers');
      act(() => {
        handler({});
      });

      act(() => {
        hookResult.current.handleWhatsappOffersClick();
      });

      expect(ctx.setIsChatOpen).toHaveBeenCalledWith(true);
      expect(ctx.setCurrentPage).not.toHaveBeenCalled();

      ctx = buildWhatsappOffersContext({
        isChatOpen: true,
        setCurrentPage: ctx.setCurrentPage,
      });
      useChatContext.mockReturnValue(ctx);
      rerender();

      expect(ctx.setCurrentPage).toHaveBeenCalledWith({
        view: 'whatsapp-offers-opt-in',
        title: 'Get offers and news on WhatsApp',
        props: { couponPercent: null },
      });
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
      mockService.evaluateBackInStockOffer.mockImplementation((input) => ({
        isUnavailable: true,
        skuId: input?.selectedSkuId || '',
        seller: '1',
      }));
      ctx = buildUnavailableNotifyContext();
      useChatContext.mockReturnValue(ctx);
    });

    it('skips getStarters and shows notify CTA when SKU is unavailable', async () => {
      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(mockService.evaluateBackInStockOffer).toHaveBeenCalledWith({
        product: unavailableNormalized,
        selectedSkuId: 'SKU-001',
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

    it('shows the notify offer when pdp starters are off', async () => {
      ctx = buildNotifyOnlyContext({ isChatOpen: true });
      useChatContext.mockReturnValue(ctx);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(
        getConversationStartersLog().entries.find(
          (entry) => entry.phase === 'init',
        )?.detail,
      ).toEqual(
        expect.objectContaining({
          pdpEnabled: false,
          unavailableProductNotify: true,
        }),
      );
      expect(hookResult.current.isBackInStockNotify).toBe(true);
      expect(hookResult.current.questions).toEqual([
        'Notify me when back in stock',
      ]);
      expect(mockService.setContext).toHaveBeenCalledWith('Product: Cool Shoe');

      act(() => {
        hookResult.current.handleFullStarterClick(
          'Notify me when back in stock',
        );
      });

      expect(ctx.setCurrentPage).toHaveBeenCalledWith(
        expect.objectContaining({
          view: 'back-in-stock-notify',
          props: expect.objectContaining({
            productName: 'Cool Shoe',
            skuId: 'SKU-001',
          }),
        }),
      );
    });

    it('shows the notify offer when conversationStarters is omitted', async () => {
      ctx = buildContext({
        config: { unavailableProductNotify: true },
      });
      useChatContext.mockReturnValue(ctx);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(hookResult.current.isBackInStockNotify).toBe(true);
      expect(mockService.getStarters).not.toHaveBeenCalled();
    });

    it('does not request starters when pdp is off and the SKU is available', async () => {
      mockService.evaluateBackInStockOffer.mockReturnValue({
        isUnavailable: false,
        skuId: 'SKU-001',
        seller: '1',
      });
      ctx = buildNotifyOnlyContext();
      useChatContext.mockReturnValue(ctx);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();
      expect(mockService.setContext).toHaveBeenCalledWith('Product: Cool Shoe');
      expect(
        getConversationStartersLog().entries.find(
          (entry) => entry.phase === 'skip',
        )?.detail,
      ).toEqual({
        reason: 'starters_disabled',
        fingerprint: 'mystore:/en/cool-shoe/p',
      });
    });

    it('does not flush starters on connect when pdp is off', async () => {
      mockService.evaluateBackInStockOffer.mockReturnValue({
        isUnavailable: false,
        skuId: 'SKU-001',
        seller: '1',
      });
      ctx = buildNotifyOnlyContext({ isConnected: false });
      useChatContext.mockReturnValue(ctx);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      const connected = getEventHandler('connected');
      act(() => {
        connected();
      });
      expect(mockService.getStarters).not.toHaveBeenCalled();
    });

    it('does not request starters when the evaluator throws and pdp is off', async () => {
      mockService.evaluateBackInStockOffer.mockImplementation(() => {
        throw new Error('bad product');
      });
      ctx = buildNotifyOnlyContext();
      useChatContext.mockReturnValue(ctx);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();
      expect(
        getConversationStartersLog().entries.find(
          (entry) => entry.phase === 'back_in_stock_evaluate_error',
        ),
      ).toBeTruthy();
      expect(
        getConversationStartersLog().entries.find(
          (entry) => entry.detail?.reason === 'starters_disabled',
        ),
      ).toBeTruthy();
    });

    it('re-evaluates the offer on navigation when pdp is off', async () => {
      jest.useFakeTimers();
      let pathname = '/cool-shoe/p';
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...window.location,
          get pathname() {
            return pathname;
          },
        },
      });
      ctx = buildNotifyOnlyContext({ isChatOpen: true });
      useChatContext.mockReturnValue(ctx);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      pathname = '/other-shoe/p';
      extractSlugFromUrl.mockReturnValue('other-shoe');
      mockService.evaluateBackInStockOffer.mockClear();
      const onNavigate = createNavigationMonitor.mock.calls.at(-1)[0];

      await act(async () => {
        onNavigate();
        jest.advanceTimersByTime(500);
      });

      expect(mockService.evaluateBackInStockOffer).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('requests starters when feature is disabled even if SKU is unavailable', async () => {
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

      expect(mockService.evaluateBackInStockOffer).not.toHaveBeenCalled();
      expect(mockService.getStarters).toHaveBeenCalledWith(fakeProductData);
      expect(hookResult.current.isBackInStockNotify).toBe(false);
    });

    it('requests starters when the offer evaluator throws', async () => {
      mockService.evaluateBackInStockOffer.mockImplementation(() => {
        throw new Error('bad product');
      });

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.getStarters).toHaveBeenCalledWith(fakeProductData);
      expect(
        getConversationStartersLog().entries.find(
          (entry) => entry.phase === 'back_in_stock_evaluate_error',
        ),
      ).toEqual(
        expect.objectContaining({
          level: 'warn',
          detail: { skuId: 'SKU-001' },
        }),
      );
    });

    it('still requests starters when SKU is available', async () => {
      mockService.evaluateBackInStockOffer.mockReturnValue({
        isUnavailable: false,
        skuId: 'SKU-001',
        seller: '1',
      });

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.getStarters).toHaveBeenCalledWith(fakeProductData);
    });

    it('does not request starters when the shopping assistant is disabled', async () => {
      mockService.evaluateBackInStockOffer.mockReturnValue({
        isUnavailable: false,
        skuId: 'SKU-001',
        seller: '1',
      });
      ctx = buildUnavailableNotifyContext({
        config: {
          conversationStarters: { pdp: true },
          unavailableProductNotify: true,
          shoppingAssistantDisabled: true,
        },
      });
      useChatContext.mockReturnValue(ctx);

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();
      expect(hookResult.current.isBackInStockNotify).toBe(false);

      const connected = getEventHandler('connected');
      act(() => {
        connected();
      });
      expect(mockService.getStarters).not.toHaveBeenCalled();
    });

    it('does not request starters when the evaluator throws and the assistant is disabled', async () => {
      mockService.evaluateBackInStockOffer.mockImplementation(() => {
        throw new Error('bad product');
      });
      ctx = buildUnavailableNotifyContext({
        config: {
          conversationStarters: { pdp: true },
          unavailableProductNotify: true,
          shoppingAssistantDisabled: true,
        },
      });
      useChatContext.mockReturnValue(ctx);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(mockService.getStarters).not.toHaveBeenCalled();
      expect(
        getConversationStartersLog().entries.find(
          (entry) => entry.phase === 'back_in_stock_evaluate_error',
        )?.detail,
      ).toEqual({ skuId: 'SKU-001' });
    });

    it('closes the chat when it opens with no offer', async () => {
      const setIsChatOpen = jest.fn();
      ctx = buildContext({
        isChatOpen: true,
        currentPage: null,
        setIsChatOpen,
        config: {
          conversationStarters: { pdp: false },
          shoppingAssistantDisabled: true,
        },
      });
      useChatContext.mockReturnValue(ctx);
      isVtexPdpPage.mockReturnValue(false);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(setIsChatOpen).toHaveBeenCalledWith(false);
    });

    it('lands on the notify page when the chat opens with the offer', async () => {
      const setIsChatOpen = jest.fn();
      const setCurrentPage = jest.fn();
      ctx = buildUnavailableNotifyContext({
        config: {
          conversationStarters: { pdp: true },
          unavailableProductNotify: true,
          shoppingAssistantDisabled: true,
        },
        setIsChatOpen,
        setCurrentPage,
      });
      useChatContext.mockReturnValue(ctx);

      let view;
      await act(async () => {
        view = renderHook(() => useConversationStartersCore());
      });

      expect(view.result.current.isBackInStockNotify).toBe(true);

      ctx = {
        ...ctx,
        isChatOpen: true,
      };
      useChatContext.mockReturnValue(ctx);
      act(() => {
        view.rerender();
      });

      expect(setCurrentPage).toHaveBeenCalledWith(
        expect.objectContaining({ view: 'back-in-stock-notify' }),
      );
      expect(setIsChatOpen).not.toHaveBeenCalledWith(false);
    });

    it('closes an open chat when the pathname changes', async () => {
      jest.useFakeTimers();
      const setIsChatOpen = jest.fn();
      const clearPageHistory = jest.fn();
      let pathname = '/cool-shoe/p';
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...window.location,
          get pathname() {
            return pathname;
          },
        },
      });
      ctx = buildUnavailableNotifyContext({
        isChatOpen: true,
        setIsChatOpen,
        clearPageHistory,
        config: {
          conversationStarters: { pdp: true },
          unavailableProductNotify: true,
          shoppingAssistantDisabled: true,
          connectOn: 'manual',
        },
      });
      useChatContext.mockReturnValue(ctx);

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      expect(
        getConversationStartersLog().entries.find(
          (entry) => entry.phase === 'init',
        )?.detail.shoppingAssistantDisabled,
      ).toBe(true);

      pathname = '/other-shoe/p';
      extractSlugFromUrl.mockReturnValue('other-shoe');
      mockService.evaluateBackInStockOffer.mockReturnValue({
        isUnavailable: true,
        skuId: 'SKU-002',
        seller: '1',
      });
      const onNavigate = createNavigationMonitor.mock.calls.at(-1)[0];

      await act(async () => {
        onNavigate();
        jest.advanceTimersByTime(500);
      });

      expect(setIsChatOpen).toHaveBeenCalledWith(false);
      expect(clearPageHistory).toHaveBeenCalled();
      expect(mockService.evaluateBackInStockOffer).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('opens back-in-stock page on CTA click when chat is open', async () => {
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
        props: { productName: 'Cool Shoe', skuId: 'SKU-001', seller: '1' },
      });
      expect(hookResult.current.isInChatStartersDismissed).toBe(true);
    });

    it('opens the back-in-stock page when the chat opens while the offer is active', async () => {
      let hookResult;
      let rerender;
      await act(async () => {
        const rendered = renderHook(() => useConversationStartersCore());
        hookResult = rendered.result;
        rerender = rendered.rerender;
      });

      expect(hookResult.current.isBackInStockNotify).toBe(true);
      expect(ctx.setCurrentPage).not.toHaveBeenCalled();

      const setCurrentPage = ctx.setCurrentPage;
      const setIsChatOpen = ctx.setIsChatOpen;
      const openChat = () => {
        ctx = buildUnavailableNotifyContext({
          isChatOpen: true,
          setCurrentPage,
          setIsChatOpen,
        });
        useChatContext.mockReturnValue(ctx);
        rerender();
      };

      openChat();

      const notifyPage = {
        view: 'back-in-stock-notify',
        title: "Get notified when it's back in stock",
        props: { productName: 'Cool Shoe', skuId: 'SKU-001', seller: '1' },
      };
      expect(setCurrentPage).toHaveBeenCalledTimes(1);
      expect(setCurrentPage).toHaveBeenCalledWith(notifyPage);

      rerender();
      expect(setCurrentPage).toHaveBeenCalledTimes(1);

      ctx = buildUnavailableNotifyContext({
        isChatOpen: false,
        setCurrentPage,
        setIsChatOpen,
      });
      useChatContext.mockReturnValue(ctx);
      rerender();

      openChat();
      expect(setCurrentPage).toHaveBeenCalledTimes(2);
      expect(setCurrentPage).toHaveBeenLastCalledWith(notifyPage);
    });

    it('stays on the conversation when the chat opens without the notify offer', async () => {
      mockService.evaluateBackInStockOffer.mockReturnValue({
        isUnavailable: false,
        skuId: 'SKU-001',
        seller: '1',
      });

      let rerender;
      await act(async () => {
        const rendered = renderHook(() => useConversationStartersCore());
        rerender = rendered.rerender;
      });

      const setCurrentPage = ctx.setCurrentPage;
      ctx = buildContext({
        isChatOpen: true,
        setCurrentPage,
        setIsChatOpen: ctx.setIsChatOpen,
      });
      useChatContext.mockReturnValue(ctx);
      rerender();

      expect(setCurrentPage).not.toHaveBeenCalled();
    });

    it('opens chat then page when CTA is clicked while chat is closed', async () => {
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
        props: { productName: 'Cool Shoe', skuId: 'SKU-001', seller: '1' },
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

    it('opens the back-in-stock page on starters:simulate-back-in-stock-page', () => {
      const { result } = renderHook(() => useConversationStartersCore());
      const handler = getEventHandler('starters:simulate-back-in-stock-page');
      expect(handler).toBeDefined();

      act(() => {
        handler({
          productName: 'Oculus Quest',
          skuId: '1276545',
          seller: '1',
        });
      });

      expect(ctx.setCurrentPage).toHaveBeenCalledWith({
        view: 'back-in-stock-notify',
        title: "Get notified when it's back in stock",
        props: {
          productName: 'Oculus Quest',
          skuId: '1276545',
          seller: '1',
        },
      });
      expect(result.current.productName).toBe('Oculus Quest');
    });
  });

  describe('conversation starters debug log', () => {
    it('records skip when PDP is disabled', () => {
      ctx = buildContext({
        config: {
          conversationStarters: { pdp: false },
          unavailableProductNotify: false,
        },
      });
      useChatContext.mockReturnValue(ctx);

      renderHook(() => useConversationStartersCore());

      const phases = getConversationStartersLog().entries.map((e) => e.phase);
      expect(phases).toContain('init');
      expect(phases).toContain('skip');
      expect(
        getConversationStartersLog().entries.find((e) => e.phase === 'skip')
          .detail.reason,
      ).toBe('pdp_disabled');
      expect(resolveProductData).not.toHaveBeenCalled();
    });

    it('records skip when the page is not a PDP', () => {
      isVtexPdpPage.mockReturnValue(false);

      renderHook(() => useConversationStartersCore());

      expect(
        getConversationStartersLog().entries.find((e) => e.phase === 'skip')
          .detail.reason,
      ).toBe('not_pdp');
    });

    it('records ws_success when starters arrive', async () => {
      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('cool-shoe');
      extractProductPathFromUrl.mockReturnValue('/en/cool-shoe/p');
      getVtexAccount.mockReturnValue('mystore');
      resolveProductData.mockResolvedValue({
        productData: {
          account: 'mystore',
          linkText: 'cool-shoe',
          productPath: '/en/cool-shoe/p',
          productName: 'Cool Shoe',
        },
        rawProduct: { productName: 'Cool Shoe' },
        source: 'ld+json',
      });
      normalizeForContext.mockReturnValue({ productName: 'Cool Shoe' });
      buildProductContextString.mockReturnValue('ctx');

      await act(async () => {
        renderHook(() => useConversationStartersCore());
      });

      const receivedHandler = getEventHandler('starters:received');
      act(() => {
        receivedHandler({ questions: ['Q1?', 'Q2?'], status: 'empty' });
      });

      const success = getConversationStartersLog().entries.find(
        (e) => e.phase === 'ws_success',
      );
      expect(success.detail.questionCount).toBe(2);
    });

    it('records ws_error and keeps loading for STARTERS_IN_FLIGHT', async () => {
      isVtexPdpPage.mockReturnValue(true);
      extractSlugFromUrl.mockReturnValue('cool-shoe');
      extractProductPathFromUrl.mockReturnValue('/en/cool-shoe/p');
      getVtexAccount.mockReturnValue('mystore');
      resolveProductData.mockImplementation(
        () =>
          new Promise(() => {
            /* hang so loading stays true */
          }),
      );

      let hookResult;
      await act(async () => {
        const { result } = renderHook(() => useConversationStartersCore());
        hookResult = result;
      });

      expect(hookResult.current.isLoading).toBe(true);

      const errorHandler = getEventHandler('starters:error');
      act(() => {
        errorHandler({
          error: 'get pdp starters: request already in flight',
          data: { code: 'STARTERS_IN_FLIGHT' },
        });
      });

      expect(hookResult.current.isLoading).toBe(true);
      const errorEntry = getConversationStartersLog().entries.find(
        (e) => e.phase === 'ws_error',
      );
      expect(errorEntry.detail.code).toBe('STARTERS_IN_FLIGHT');
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
