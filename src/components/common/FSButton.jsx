import PropTypes from 'prop-types';

import './FSButton.scss';
import { Icon } from './Icon';

export function FSButton({
  children,
  className = '',
  variant = 'primary',
  icon = '',
  isLoading = false,
  disabled = false,
  ...props
}) {
  return (
    <button
      className={`weni-fs-button weni-fs-button--${variant} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <Icon
          name="progress_activity"
          size="medium"
          className="weni-fs-button__loading-spinner"
        />
      )}

      {icon && (
        <Icon name={icon} size="medium" />
      )}

      {children}
    </button>
  );
}

FSButton.propTypes = {
  children: PropTypes.node.isRequired,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
};
