import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatContext } from '@/contexts/ChatContext';
import {
  isVtexPdpPage,
  extractSlugFromUrl,
  getVtexAccount,
  resolveProductData,
  normalizeForContext,
  buildProductContextString,
  getSelectedSkuIdFromLdJson,
} from '@/utils/vtex';
import { createNavigationMonitor } from '@/utils/navigationMonitor';

const MOBILE_BREAKPOINT = '(max-width: 768px)';
const MOBILE_AUTO_HIDE_MS = 5000;
const NAVIGATION_DEBOUNCE_MS = 300;

export function useConversationStartersCore() {
  const {
    service,
    isChatOpen,
    isConnected,
    sendMessage,
    config,
    setIsChatOpen,
  } = useChatContext();

  const [questions, setQuestions] = useState([]);
  const [source, setSource] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompactVisible, setIsCompactVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isInChatStartersDismissed, setIsInChatStartersDismissed] =
    useState(false);

  const pendingStarterRef = useRef(null);
  const currentFingerprintRef = useRef(null);
  const mobileTimerRef = useRef(null);
  const deferredProductDataRef = useRef(null);
  const navigationDebounceRef = useRef(null);
  const isConnectedRef = useRef(isConnected);
  const prevIsChatOpenRef = useRef(isChatOpen);
  isConnectedRef.current = isConnected;

  const isPdpEnabled = config?.conversationStarters?.pdp === true;

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
    clearMobileTimer();
    currentFingerprintRef.current = null;
    deferredProductDataRef.current = null;
  }, [clearMobileTimer]);

  const requestStarters = useCallback(
    (productData) => {
      if (!service) return;

      try {
        if (isConnectedRef.current) {
          service.getStarters(productData);
        } else {
          deferredProductDataRef.current = productData;
        }
      } catch {
        setIsLoading(false);
      }
    },
    [service],
  );

  const detectAndFetchPdp = useCallback(async () => {
    if (!isPdpEnabled || !isVtexPdpPage()) return;

    const slug = extractSlugFromUrl();
    if (!slug) return;

    const account = getVtexAccount();
    if (!account) return;

    const newFingerprint = `${account}:${slug}`;

    currentFingerprintRef.current = newFingerprint;
    setFingerprint(newFingerprint);
    setIsLoading(true);
    setSource('pdp');

    const result = await resolveProductData(slug, account);
    if (!result) {
      setIsLoading(false);
      return;
    }

    requestStarters(result.productData);

    const selectedSkuId = getSelectedSkuIdFromLdJson();
    const normalized = normalizeForContext(result.rawProduct, result.source);
    const contextString = buildProductContextString(normalized, selectedSkuId);
    if (contextString && service) {
      service.setContext(contextString);
    }
  }, [isPdpEnabled, requestStarters, service]);

  const removeQuestionFromList = useCallback((question) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q === question);
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleFullStarterClick = useCallback(
    (question) => {
      clearMobileTimer();
      removeQuestionFromList(question);
      setIsInChatStartersDismissed(true);
      if (isChatOpen) {
        sendMessage(question);
      } else {
        pendingStarterRef.current = question;
        setIsChatOpen(true);
      }
    },
    [
      isChatOpen,
      sendMessage,
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
    if (!isChatOpen || !pendingStarterRef.current) return;

    if (isConnected) {
      sendMessage(pendingStarterRef.current);
      pendingStarterRef.current = null;
    }
  }, [isChatOpen, isConnected, sendMessage]);

  useEffect(() => {
    const wasOpen = prevIsChatOpenRef.current;
    prevIsChatOpenRef.current = isChatOpen;
    if (wasOpen && !isChatOpen && questions.length > 0 && isCompactVisible) {
      startMobileAutoHide();
    }
  }, [isChatOpen, questions.length, isCompactVisible, startMobileAutoHide]);

  useEffect(() => {
    if (!service) return;

    const handleStartersReceived = (data) => {
      const hasValidFingerprint = currentFingerprintRef.current;
      const shouldAcceptPdpResponse = source === 'pdp' && hasValidFingerprint;
      const shouldAcceptNonPdpResponse = source !== 'pdp';

      if (shouldAcceptPdpResponse || shouldAcceptNonPdpResponse) {
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
      setQuestions(manualQuestions.slice(0, 3));
      setSource('manual');
      setFingerprint(null);
      setIsCompactVisible(true);
      setIsInChatStartersDismissed(false);
      setIsLoading(false);
      currentFingerprintRef.current = null;
      startMobileAutoHide();
    };

    service.on('starters:received', handleStartersReceived);
    service.on('starters:error', handleStartersError);
    service.on('connected', handleConnected);
    service.on('starters:set-manual', handleManualStarters);

    if (isConnected) {
      handleConnected();
    }

    return () => {
      service.off('starters:received', handleStartersReceived);
      service.off('starters:error', handleStartersError);
      service.off('connected', handleConnected);
      service.off('starters:set-manual', handleManualStarters);
    };
  }, [service, source, startMobileAutoHide]);

  useEffect(() => {
    if (!service) return;

    detectAndFetchPdp();

    const monitor = createNavigationMonitor(() => {
      clearTimeout(navigationDebounceRef.current);
      navigationDebounceRef.current = setTimeout(() => {
        service.clearStarters();
        service.setContext('');
        resetStartersState();
        if (isPdpEnabled) {
          detectAndFetchPdp();
        }
      }, NAVIGATION_DEBOUNCE_MS);
    });

    monitor.start();

    return () => {
      monitor.stop();
      clearTimeout(navigationDebounceRef.current);
      clearMobileTimer();
    };
  }, [service]);

  return {
    questions,
    source,
    fingerprint,
    isLoading,
    isCompactVisible,
    isHiding,
    isInChatStartersDismissed,
    handleCompactStarterClick,
    handleFullStarterClick,
    clearStarters,
  };
}

export default useConversationStartersCore;
