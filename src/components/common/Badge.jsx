import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import './Badge.scss';

/**
 * Badge - Notification badge component
 * TODO: Add animations for updates
 * TODO: Support different badge colors/variants
 */
export function Badge({ count, max = 99, variant = 'primary', className, isVisible }) {
  const displayCount = count > max ? `${max}+` : count;

  let badgeEnteringAnimationTimeout = null;
  let badgeLeavingAnimationTimeout = null;
  let badgePulseAnimationTimeout = null;

  const [ignoreAnimation, setIgnoreAnimation] = useState(true);
  const [isBadgeEnteringAnimation, setIsBadgeEnteringAnimation] = useState(false);
  const [isBadgeLeavingAnimation, setIsBadgeLeavingAnimation] = useState(false);
  const [isBadgePulseAnimation, setIsBadgePulseAnimation] = useState(false);

  useEffect(() => {
    return () => {
      clearTimeout(badgeLeavingAnimationTimeout);
      clearTimeout(badgeEnteringAnimationTimeout);
      clearTimeout(badgePulseAnimationTimeout);
    };
  }, []);

  useEffect(() => {
    if (ignoreAnimation) {
      setIgnoreAnimation(false);
      return;
    }
    
    if (isVisible) {
      setIsBadgeEnteringAnimation(true);
      badgeEnteringAnimationTimeout = setTimeout(() => {
        setIsBadgeEnteringAnimation(false);
      }, 250);
    } else {
      setIsBadgeLeavingAnimation(true);
      badgeLeavingAnimationTimeout = setTimeout(() => {
        setIsBadgeLeavingAnimation(false);
      }, 250);
    }

    return () => {
      if (isVisible) {
        clearTimeout(badgeLeavingAnimationTimeout);
      } else {
        clearTimeout(badgeEnteringAnimationTimeout);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    setIsBadgePulseAnimation(true);
    badgePulseAnimationTimeout = setTimeout(() => {
      setIsBadgePulseAnimation(false);
    }, 250);

    return () => {
      clearTimeout(badgePulseAnimationTimeout);
    };
  }, [count]);

  if (!isVisible && !isBadgeLeavingAnimation) {
    return null;
  }
  
  return (
    <span
      className={[
        className,
        'weni-badge',
        `weni-badge--variant-${variant}`,
        isBadgeEnteringAnimation && 'weni-badge--entering',
        isBadgeLeavingAnimation && 'weni-badge--leaving',
        !(isBadgeEnteringAnimation || isBadgeLeavingAnimation) && isBadgePulseAnimation && 'weni-badge--pulse',
      ].filter(Boolean).join(' ')}
    >
      {displayCount}
    </span>
  );
}

Badge.propTypes = {
  count: PropTypes.number.isRequired,
  max: PropTypes.number,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error'])
};

export default Badge;
