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
  getSkuIdFromRawProduct,
} from '@/utils/vtex';
import { createNavigationMonitor } from '@/utils/navigationMonitor';
import { sendVtexUtm, UTM_SOURCES } from '@/utils/sendVtexUtm';

const MOBILE_BREAKPOINT = '(max-width: 768px)';
const MOBILE_AUTO_HIDE_MS = 5000;
const NAVIGATION_DEBOUNCE_MS = 300;
const NAVIGATION_URL_SETTLE_MS = 200;

function parseCouponPercent(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return null;
}

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
  const [hasShownCompactStarters, setHasShownCompactStarters] = useState(false);
  const [isWhatsappOffersOptIn, setIsWhatsappOffersOptIn] = useState(false);
  const [isOptInBalloonVisible, setIsOptInBalloonVisible] = useState(false);
  const [couponPercent, setCouponPercent] = useState(null);

  const pendingStarterRef = useRef(null);
  const pendingWhatsappOffersRef = useRef(false);
  const currentFingerprintRef = useRef(null);
  const sourceRef = useRef(source);
  const couponPercentRef = useRef(couponPercent);
  const mobileTimerRef = useRef(null);
  const deferredProductDataRef = useRef(null);
  const navigationDebounceRef = useRef(null);
  const navigationRetryRef = useRef(null);
  const lastHandledPathnameRef = useRef(null);
  const fetchGenerationRef = useRef(0);
  const isConnectedRef = useRef(isConnected);
  const prevIsChatOpenRef = useRef(isChatOpen);
  const isPdpEnabledRef = useRef(config?.conversationStarters?.pdp === true);
  const isWhatsappOffersNotifyEnabledRef = useRef(
    config?.whatsappOffersNotify === true,
  );

  sourceRef.current = source;
  couponPercentRef.current = couponPercent;
  isConnectedRef.current = isConnected;
  isPdpEnabledRef.current = config?.conversationStarters?.pdp === true;
  isWhatsappOffersNotifyEnabledRef.current =
    config?.whatsappOffersNotify === true;

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
    setIsWhatsappOffersOptIn(false);
    setIsOptInBalloonVisible(false);
    setCouponPercent(null);
    clearMobileTimer();
    currentFingerprintRef.current = null;
    deferredProductDataRef.current = null;
    pendingWhatsappOffersRef.current = false;
  }, [clearMobileTimer]);

  const getWhatsappOffersFormTitle = useCallback(
    (percent) => {
      if (percent != null) {
        return t('whatsapp_offers_opt_in.coupon_form_title', { percent });
      }
      return t('whatsapp_offers_opt_in.form_title');
    },
    [t],
  );

  const showWhatsappOffersOptIn = useCallback((percent) => {
    setQuestions([]);
    setIsCompactVisible(false);
    setIsHiding(false);
    setCouponPercent(percent);
    setIsWhatsappOffersOptIn(true);
    setIsOptInBalloonVisible(true);
    setIsInChatStartersDismissed(false);
    setIsLoading(false);
  }, []);

  const openWhatsappOffersPage = useCallback(
    (percent) => {
      if (!setCurrentPage) return;
      const resolvedPercent =
        percent != null ? percent : couponPercentRef.current;
      setCurrentPage({
        view: 'whatsapp-offers-opt-in',
        title: getWhatsappOffersFormTitle(resolvedPercent),
        props: { couponPercent: resolvedPercent },
      });
    },
    [getWhatsappOffersFormTitle, setCurrentPage],
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

    requestStarters(result.productData);

    const selectedSkuId =
      getSelectedSkuId() ||
      getSkuIdFromRawProduct(result.rawProduct, result.source);
    const normalized = normalizeForContext(result.rawProduct, result.source);
    const contextString = buildProductContextString(normalized, selectedSkuId);
    if (contextString && service) {
      service.setContext(contextString);
    }
  }, [requestStarters, service]);

  const applyNavigationChange = useCallback(() => {
    const pathname = window.location.pathname;
    if (pathname === lastHandledPathnameRef.current) {
      return false;
    }

    lastHandledPathnameRef.current = pathname;
    fetchGenerationRef.current += 1;
    setHasShownCompactStarters(false);

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

  const handleWhatsappOffersClick = useCallback(() => {
    setIsOptInBalloonVisible(false);

    if (isChatOpen) {
      openWhatsappOffersPage(couponPercentRef.current);
      setIsWhatsappOffersOptIn(false);
    } else {
      pendingWhatsappOffersRef.current = true;
      setIsChatOpen(true);
    }
  }, [isChatOpen, openWhatsappOffersPage, setIsChatOpen]);

  const dismissWhatsappOffersBalloon = useCallback(() => {
    setIsOptInBalloonVisible(false);
    setIsWhatsappOffersOptIn(false);
    setCouponPercent(null);
    pendingWhatsappOffersRef.current = false;
  }, []);

  const handleFullStarterClick = useCallback(
    (question) => {
      clearMobileTimer();
      removeQuestionFromList(question);
      setIsInChatStartersDismissed(true);
      void sendVtexUtm(service, UTM_SOURCES.CONV_STARTER, { silent: true });
      if (isChatOpen) {
        sendMessage(question, {
          skipUtm: true,
          fromConversationStarter: true,
        });
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
    ],
  );

  const handleCompactStarterClick = useCallback(
    (question) => {
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

    if (pendingWhatsappOffersRef.current) {
      pendingWhatsappOffersRef.current = false;
      openWhatsappOffersPage(couponPercentRef.current);
      setIsWhatsappOffersOptIn(false);
      return;
    }

    if (!pendingStarterRef.current) return;

    if (isConnected) {
      void sendVtexUtm(service, UTM_SOURCES.CONV_STARTER, { silent: true });
      sendMessage(pendingStarterRef.current, {
        skipUtm: true,
        fromConversationStarter: true,
      });
      pendingStarterRef.current = null;
    }
  }, [
    isChatOpen,
    isConnected,
    sendMessage,
    service,
    openWhatsappOffersPage,
  ]);

  useEffect(() => {
    const wasOpen = prevIsChatOpenRef.current;
    prevIsChatOpenRef.current = isChatOpen;

    if (wasOpen && !isChatOpen && questions.length > 0) {
      setIsCompactVisible(true);
      setIsHiding(false);
      startMobileAutoHide();
    }

    if (wasOpen && !isChatOpen && isWhatsappOffersOptIn) {
      setIsOptInBalloonVisible(true);
    }
  }, [
    isChatOpen,
    questions.length,
    startMobileAutoHide,
    isWhatsappOffersOptIn,
  ]);

  useEffect(() => {
    if (!service) return;

    const handleStartersReceived = (data) => {
      const hasValidFingerprint = currentFingerprintRef.current;
      const isPdpSource = sourceRef.current === 'pdp';
      const shouldAccept = !isPdpSource || hasValidFingerprint;

      if (shouldAccept) {
        setIsWhatsappOffersOptIn(false);
        setIsOptInBalloonVisible(false);
        setCouponPercent(null);
        const nextQuestions = data.questions?.slice(0, 3) || [];
        setQuestions(nextQuestions);
        setIsCompactVisible(true);
        setIsInChatStartersDismissed(false);
        setIsLoading(false);
        if (nextQuestions.length > 0) {
          setHasShownCompactStarters(true);
        }
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
      setIsWhatsappOffersOptIn(false);
      setIsOptInBalloonVisible(false);
      setCouponPercent(null);
      const nextQuestions = manualQuestions.slice(0, 3);
      setQuestions(nextQuestions);
      setSource('manual');
      setFingerprint(null);
      setIsCompactVisible(true);
      setIsInChatStartersDismissed(false);
      setIsLoading(false);
      currentFingerprintRef.current = null;
      if (nextQuestions.length > 0) {
        setHasShownCompactStarters(true);
      }
      startMobileAutoHide();
    };

    const handleSimulateWhatsappOffers = (payload = {}) => {
      if (!isWhatsappOffersNotifyEnabledRef.current) return;

      setSource('manual');
      setFingerprint(null);
      currentFingerprintRef.current = null;
      showWhatsappOffersOptIn(parseCouponPercent(payload?.couponPercent));
    };

    const handleStartersClear = () => {
      resetStartersState();
      service.clearStarters();
      service.setContext('');
    };

    service.on('starters:received', handleStartersReceived);
    service.on('starters:error', handleStartersError);
    service.on('connected', handleConnected);
    service.on('starters:set-manual', handleManualStarters);
    service.on(
      'starters:simulate-whatsapp-offers',
      handleSimulateWhatsappOffers,
    );
    service.on('starters:clear', handleStartersClear);

    if (isConnected) {
      handleConnected();
    }

    return () => {
      service.off('starters:received', handleStartersReceived);
      service.off('starters:error', handleStartersError);
      service.off('connected', handleConnected);
      service.off('starters:set-manual', handleManualStarters);
      service.off(
        'starters:simulate-whatsapp-offers',
        handleSimulateWhatsappOffers,
      );
      service.off('starters:clear', handleStartersClear);
    };
  }, [
    service,
    isConnected,
    startMobileAutoHide,
    showWhatsappOffersOptIn,
    resetStartersState,
  ]);

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
    hasShownCompactStarters,
    isWhatsappOffersOptIn,
    isOptInBalloonVisible,
    couponPercent,
    handleCompactStarterClick,
    handleFullStarterClick,
    handleWhatsappOffersClick,
    dismissWhatsappOffersBalloon,
    clearStarters,
  };
}

export default useConversationStartersCore;
