import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  isSelectedSkuAvailable,
} from '@/utils/vtex';
import { createNavigationMonitor } from '@/utils/navigationMonitor';
import { sendVtexUtm, UTM_SOURCES } from '@/utils/sendVtexUtm';

const MOBILE_BREAKPOINT = '(max-width: 768px)';
const MOBILE_AUTO_HIDE_MS = 5000;
const NAVIGATION_DEBOUNCE_MS = 300;
const NAVIGATION_URL_SETTLE_MS = 200;

export function useConversationStartersCore() {
  const { t } = useTranslation();
  const {
    service,
    isChatOpen,
    isConnected,
    sendMessage,
    config,
    setIsChatOpen,
    setCurrentPage,
  } = useChatContext();

  const [questions, setQuestions] = useState([]);
  const [source, setSource] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompactVisible, setIsCompactVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isInChatStartersDismissed, setIsInChatStartersDismissed] =
    useState(false);
  const [isBackInStockNotify, setIsBackInStockNotify] = useState(false);
  const [productName, setProductName] = useState('');

  const pendingStarterRef = useRef(null);
  const pendingBackInStockRef = useRef(false);
  const currentFingerprintRef = useRef(null);
  const sourceRef = useRef(source);
  const isBackInStockNotifyRef = useRef(isBackInStockNotify);
  const productNameRef = useRef(productName);
  const mobileTimerRef = useRef(null);
  const deferredProductDataRef = useRef(null);
  const navigationDebounceRef = useRef(null);
  const navigationRetryRef = useRef(null);
  const lastHandledPathnameRef = useRef(null);
  const fetchGenerationRef = useRef(0);
  const isConnectedRef = useRef(isConnected);
  const prevIsChatOpenRef = useRef(isChatOpen);
  const isPdpEnabledRef = useRef(config?.conversationStarters?.pdp === true);
  const isUnavailableNotifyEnabledRef = useRef(
    config?.unavailableProductNotify === true,
  );

  sourceRef.current = source;
  isBackInStockNotifyRef.current = isBackInStockNotify;
  productNameRef.current = productName;
  isConnectedRef.current = isConnected;
  isPdpEnabledRef.current = config?.conversationStarters?.pdp === true;
  isUnavailableNotifyEnabledRef.current =
    config?.unavailableProductNotify === true;

  const clearMobileTimer = useCallback(() => {
    if (mobileTimerRef.current) {
      clearTimeout(mobileTimerRef.current);
      mobileTimerRef.current = null;
    }
  }, []);

  const startMobileAutoHide = useCallback(() => {
    clearMobileTimer();
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    if (!isMobile) return;

    mobileTimerRef.current = setTimeout(() => {
      setIsHiding(true);
      setTimeout(() => {
        setIsCompactVisible(false);
        setIsHiding(false);
      }, 250);
    }, MOBILE_AUTO_HIDE_MS);
  }, [clearMobileTimer]);

  const resetStartersState = useCallback(() => {
    setQuestions([]);
    setSource(null);
    setFingerprint(null);
    setIsLoading(false);
    setIsCompactVisible(false);
    setIsHiding(false);
    setIsInChatStartersDismissed(false);
    setIsBackInStockNotify(false);
    setProductName('');
    clearMobileTimer();
    currentFingerprintRef.current = null;
    deferredProductDataRef.current = null;
    pendingBackInStockRef.current = false;
  }, [clearMobileTimer]);

  const showBackInStockNotify = useCallback(
    (name) => {
      const resolvedName = name || '';
      setProductName(resolvedName);
      setIsBackInStockNotify(true);
      setQuestions([t('back_in_stock.notify_me_cta')]);
      setIsCompactVisible(true);
      setIsInChatStartersDismissed(false);
      setIsLoading(false);
      startMobileAutoHide();
    },
    [startMobileAutoHide, t],
  );

  const openBackInStockPage = useCallback(
    (name) => {
      if (!setCurrentPage) return;
      setCurrentPage({
        view: 'back-in-stock-notify',
        title: t('back_in_stock.form_title'),
        props: { productName: name || productNameRef.current || '' },
      });
    },
    [setCurrentPage, t],
  );

  const requestStarters = useCallback(
    (productData) => {
      if (!service) return;

      try {
        if (isConnectedRef.current) {
          service.getStarters(productData);
        } else {
          deferredProductDataRef.current = productData;
          if (config?.connectOn === 'demand') {
            service.connect();
          }
        }
      } catch {
        setIsLoading(false);
      }
    },
    [service, config?.connectOn],
  );

  const detectAndFetchPdp = useCallback(async () => {
    if (!isPdpEnabledRef.current || !isVtexPdpPage()) return;

    const slug = extractSlugFromUrl();
    if (!slug) return;

    const account = getVtexAccount();
    if (!account) return;

    const productPath = extractProductPathFromUrl();
    const newFingerprint = `${account}:${productPath || slug}`;
    const generation = ++fetchGenerationRef.current;

    currentFingerprintRef.current = newFingerprint;
    setFingerprint(newFingerprint);
    setIsLoading(true);
    setSource('pdp');

    const result = await resolveProductData(slug, account);
    if (generation !== fetchGenerationRef.current) return;

    if (!result) {
      setIsLoading(false);
      return;
    }

    if (currentFingerprintRef.current !== newFingerprint) return;

    const selectedSkuId = getSelectedSkuId();
    const normalized = normalizeForContext(result.rawProduct, result.source);
    const contextString = buildProductContextString(normalized, selectedSkuId);
    if (contextString && service) {
      service.setContext(contextString);
    }

    const resolvedProductName =
      normalized?.productName || result.productData?.productName || '';

    if (
      isUnavailableNotifyEnabledRef.current &&
      !isSelectedSkuAvailable(normalized, selectedSkuId)
    ) {
      showBackInStockNotify(resolvedProductName);
      return;
    }

    requestStarters(result.productData);
  }, [requestStarters, service, showBackInStockNotify]);

  const applyNavigationChange = useCallback(() => {
    const pathname = window.location.pathname;
    if (pathname === lastHandledPathnameRef.current) {
      return false;
    }

    lastHandledPathnameRef.current = pathname;
    fetchGenerationRef.current += 1;

    if (!service) return true;

    service.clearStarters();
    service.setContext('');
    resetStartersState();

    if (isPdpEnabledRef.current) {
      detectAndFetchPdp();
    }

    return true;
  }, [detectAndFetchPdp, resetStartersState, service]);

  const scheduleNavigationHandling = useCallback(() => {
    clearTimeout(navigationDebounceRef.current);
    clearTimeout(navigationRetryRef.current);

    navigationDebounceRef.current = setTimeout(() => {
      applyNavigationChange();

      navigationRetryRef.current = setTimeout(() => {
        applyNavigationChange();
      }, NAVIGATION_URL_SETTLE_MS);
    }, NAVIGATION_DEBOUNCE_MS);
  }, [applyNavigationChange]);

  const removeQuestionFromList = useCallback((question) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q === question);
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleBackInStockClick = useCallback(() => {
    clearMobileTimer();
    setIsInChatStartersDismissed(true);
    setIsCompactVisible(false);
    setQuestions([]);

    if (isChatOpen) {
      openBackInStockPage(productNameRef.current);
    } else {
      pendingBackInStockRef.current = true;
      setIsChatOpen(true);
    }
  }, [clearMobileTimer, isChatOpen, openBackInStockPage, setIsChatOpen]);

  const handleFullStarterClick = useCallback(
    (question) => {
      if (isBackInStockNotifyRef.current) {
        handleBackInStockClick();
        return;
      }

      clearMobileTimer();
      removeQuestionFromList(question);
      setIsInChatStartersDismissed(true);
      void sendVtexUtm(service, UTM_SOURCES.CONV_STARTER, { silent: true });
      if (isChatOpen) {
        sendMessage(question, { skipUtm: true });
      } else {
        pendingStarterRef.current = question;
        setIsChatOpen(true);
      }
    },
    [
      isChatOpen,
      sendMessage,
      service,
      setIsChatOpen,
      clearMobileTimer,
      removeQuestionFromList,
      handleBackInStockClick,
    ],
  );

  const handleCompactStarterClick = useCallback(
    (question) => {
      if (isBackInStockNotifyRef.current) {
        handleBackInStockClick();
        return;
      }

      clearMobileTimer();
      if (isChatOpen) {
        handleFullStarterClick(question);
        return;
      }
      removeQuestionFromList(question);
      setIsInChatStartersDismissed(true);
      pendingStarterRef.current = question;
      setIsChatOpen(true);
    },
    [
      isChatOpen,
      handleFullStarterClick,
      setIsChatOpen,
      clearMobileTimer,
      removeQuestionFromList,
      handleBackInStockClick,
    ],
  );

  const clearStarters = useCallback(() => {
    resetStartersState();
    if (service) {
      service.clearStarters();
      service.setContext('');
    }
  }, [resetStartersState, service]);

  useEffect(() => {
    if (!isChatOpen) return;

    if (pendingBackInStockRef.current) {
      pendingBackInStockRef.current = false;
      openBackInStockPage(productNameRef.current);
      return;
    }

    if (!pendingStarterRef.current) return;

    if (isConnected) {
      void sendVtexUtm(service, UTM_SOURCES.CONV_STARTER, { silent: true });
      sendMessage(pendingStarterRef.current, { skipUtm: true });
      pendingStarterRef.current = null;
    }
  }, [isChatOpen, isConnected, sendMessage, service, openBackInStockPage]);

  useEffect(() => {
    const wasOpen = prevIsChatOpenRef.current;
    prevIsChatOpenRef.current = isChatOpen;

    if (wasOpen && !isChatOpen && questions.length > 0) {
      setIsCompactVisible(true);
      setIsHiding(false);
      startMobileAutoHide();
    }
  }, [isChatOpen, questions.length, startMobileAutoHide]);

  useEffect(() => {
    if (!service) return;

    const handleStartersReceived = (data) => {
      const hasValidFingerprint = currentFingerprintRef.current;
      const isPdpSource = sourceRef.current === 'pdp';
      const shouldAccept = !isPdpSource || hasValidFingerprint;

      if (shouldAccept) {
        setIsBackInStockNotify(false);
        setQuestions(data.questions?.slice(0, 3) || []);
        setIsCompactVisible(true);
        setIsInChatStartersDismissed(false);
        setIsLoading(false);
        startMobileAutoHide();
      }
    };

    const handleStartersError = () => {
      setIsLoading(false);
    };

    const handleConnected = () => {
      if (deferredProductDataRef.current) {
        const productData = deferredProductDataRef.current;
        deferredProductDataRef.current = null;
        try {
          service.getStarters(productData);
        } catch {
          setIsLoading(false);
        }
      }
    };

    const handleManualStarters = (manualQuestions) => {
      setIsBackInStockNotify(false);
      setProductName('');
      setQuestions(manualQuestions.slice(0, 3));
      setSource('manual');
      setFingerprint(null);
      setIsCompactVisible(true);
      setIsInChatStartersDismissed(false);
      setIsLoading(false);
      currentFingerprintRef.current = null;
      startMobileAutoHide();
    };

    const handleSimulateUnavailable = (payload = {}) => {
      const name =
        typeof payload?.productName === 'string' && payload.productName.trim()
          ? payload.productName.trim()
          : 'Sample Product';
      setSource('manual');
      setFingerprint(null);
      currentFingerprintRef.current = null;
      showBackInStockNotify(name);
    };

    service.on('starters:received', handleStartersReceived);
    service.on('starters:error', handleStartersError);
    service.on('connected', handleConnected);
    service.on('starters:set-manual', handleManualStarters);
    service.on('starters:simulate-unavailable', handleSimulateUnavailable);

    if (isConnected) {
      handleConnected();
    }

    return () => {
      service.off('starters:received', handleStartersReceived);
      service.off('starters:error', handleStartersError);
      service.off('connected', handleConnected);
      service.off('starters:set-manual', handleManualStarters);
      service.off('starters:simulate-unavailable', handleSimulateUnavailable);
    };
  }, [service, isConnected, startMobileAutoHide, showBackInStockNotify]);

  useEffect(() => {
    if (!service) return;

    lastHandledPathnameRef.current = window.location.pathname;
    detectAndFetchPdp();

    const monitor = createNavigationMonitor(scheduleNavigationHandling);

    monitor.start();

    return () => {
      monitor.stop();
      clearTimeout(navigationDebounceRef.current);
      clearTimeout(navigationRetryRef.current);
      clearMobileTimer();
    };
  }, [
    service,
    detectAndFetchPdp,
    scheduleNavigationHandling,
    clearMobileTimer,
  ]);

  return {
    questions,
    source,
    fingerprint,
    isLoading,
    isCompactVisible,
    isHiding,
    isInChatStartersDismissed,
    isBackInStockNotify,
    productName,
    handleCompactStarterClick,
    handleFullStarterClick,
    clearStarters,
  };
}

export default useConversationStartersCore;
