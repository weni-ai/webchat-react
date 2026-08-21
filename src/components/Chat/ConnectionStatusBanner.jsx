import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWeniChat } from '@/hooks/useWeniChat';

import './ConnectionStatusBanner.scss';

const RESTORED_DURATION_MS = 10_000;
const COUNTDOWN_TICK_MS = 250;
const DOTS_TICK_MS = 500;

function getWaitRemainingMs(nextAttemptAt) {
  if (!nextAttemptAt) {
    return 0;
  }
  return nextAttemptAt - Date.now();
}

export function ConnectionStatusBanner() {
  const { t } = useTranslation();
  const { connectionStatus, nextAttemptAt, reconnectNow, isConnectionClosed } =
    useWeniChat();
  const hadOutageRef = useRef(false);
  const [phase, setPhase] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    if (isConnectionClosed) {
      setPhase(null);
      return;
    }

    if (
      connectionStatus === 'disconnected' ||
      connectionStatus === 'reconnecting'
    ) {
      hadOutageRef.current = true;
      const remaining = getWaitRemainingMs(nextAttemptAt);
      setPhase(remaining > 0 ? 'wait' : 'active');
      return;
    }

    if (connectionStatus === 'connected' && hadOutageRef.current) {
      hadOutageRef.current = false;
      setPhase('restored');
    }
  }, [connectionStatus, nextAttemptAt, isConnectionClosed]);

  useEffect(() => {
    if (phase !== 'restored') {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setPhase(null);
    }, RESTORED_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'wait') {
      return undefined;
    }

    const tick = () => {
      if (
        connectionStatus !== 'disconnected' &&
        connectionStatus !== 'reconnecting'
      ) {
        return;
      }

      const remainingMs = getWaitRemainingMs(nextAttemptAt);
      setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
      if (remainingMs <= 0) {
        setPhase('active');
      }
    };

    tick();
    const intervalId = setInterval(tick, COUNTDOWN_TICK_MS);
    return () => clearInterval(intervalId);
  }, [phase, nextAttemptAt, connectionStatus]);

  useEffect(() => {
    if (phase !== 'active') {
      return undefined;
    }

    setDotCount(1);
    const intervalId = setInterval(() => {
      setDotCount((current) => (current === 3 ? 1 : current + 1));
    }, DOTS_TICK_MS);

    return () => clearInterval(intervalId);
  }, [phase]);

  if (!phase) {
    return null;
  }

  const isRestored = phase === 'restored';

  return (
    <div
      className={`weni-connection-status-banner ${
        isRestored
          ? 'weni-connection-status-banner--success'
          : 'weni-connection-status-banner--critical'
      }`}
      role="status"
    >
      {phase === 'wait' && (
        <>
          <span>
            {t('connection.reconnecting_in', { seconds: secondsLeft })}
          </span>{' '}
          <button
            type="button"
            className="weni-connection-status-banner__try-again"
            onClick={() => reconnectNow()}
          >
            {t('connection.try_again')}
          </button>
        </>
      )}
      {phase === 'active' && (
        <span>
          {t('connection.reconnecting')}
          {'.'.repeat(dotCount)}
        </span>
      )}
      {isRestored && <span>{t('connection.restored')}</span>}
    </div>
  );
}

export default ConnectionStatusBanner;
