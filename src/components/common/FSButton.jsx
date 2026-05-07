import PropTypes from 'prop-types';

import './FSButton.scss';
import { Icon } from './Icon';
import { useMemo } from 'react';

export function FSButton({
  children,
  className = '',
  variant = 'primary',
  size = 'medium',
  icon = '',
  isLoading = false,
  disabled = false,
  rounded = false,
  hoverState = false,
  onlyIcon = false,
  ...props
}) {
  const iconSize = onlyIcon ? 'medium' : size;

  const IconComponent = useMemo(() => {
    if (isLoading) {
      return (
        <Icon
          name="progress_activity"
          size="medium"
          className="weni-fs-button__loading-spinner"
        />
      );
    }

    if (icon) {
      return (
        <Icon
          name={icon}
          size={iconSize}
        />
      );
    }

    return null;
  }, [isLoading, icon]);

  return (
    <button
      className={`weni-fs-button weni-fs-button--${variant} weni-fs-button--${size} weni-fs-button--${rounded ? 'rounded' : ''} ${hoverState ? 'weni-fs-button--hover-state' : ''} ${onlyIcon ? 'weni-fs-button--only-icon' : ''} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {IconComponent}

      {children}
    </button>
  );
}

FSButton.propTypes = {
  children: PropTypes.node.isRequired,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary', 'tertiary']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  icon: PropTypes.string,
  className: PropTypes.string,
  rounded: PropTypes.bool,
  hoverState: PropTypes.bool,
  onlyIcon: PropTypes.bool,
};
