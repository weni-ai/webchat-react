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
  ...props
}) {
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
        <Icon name={icon} size="medium" />
      );
    }

    return null;
  }, [isLoading, icon]);

  return (
    <button
      className={`weni-fs-button weni-fs-button--${variant} weni-fs-button--${size} ${className}`}
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
};
