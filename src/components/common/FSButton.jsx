import PropTypes from 'prop-types';

import './FSButton.scss';
import { Icon } from './Icon';

export function FSButton({
  children,
  className = '',
  variant = 'primary',
  icon = '',
  ...props
}) {
  return (
    <button className={`weni-fs-button weni-fs-button--${variant} ${className}`} {...props}>
      {icon && (
        <Icon name={icon} size="medium" />
      )}

      {children}
    </button>
  );
}

FSButton.propTypes = {
  children: PropTypes.node.isRequired,
};
