import PropTypes from 'prop-types';

import './FSBadge.scss';

export function FSBadge({
  children,
  type,
  className = '',
  ...props
}) {
  return (
    <span className={`weni-fs-badge weni-fs-badge--${type} ${className}`} {...props}>
      {children}
    </span>
  );
}

FSBadge.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['success']).isRequired,
  className: PropTypes.string,
};
