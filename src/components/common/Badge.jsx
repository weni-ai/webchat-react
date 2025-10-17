import PropTypes from 'prop-types';

/**
 * Badge - Notification badge component
 * TODO: Display notification count
 * TODO: Handle large numbers (99+)
 * TODO: Add animations for updates
 * TODO: Support different badge colors/variants
 */
export function Badge({ count, max = 99, variant = 'primary' }) {
  // TODO: Format count (show "99+" for large numbers)
  const displayCount = count > max ? `${max}+` : count;
  
  if (count === 0) {
    return null;
  }
  
  return (
    <span className={`weni-badge weni-badge-${variant}`}>
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

