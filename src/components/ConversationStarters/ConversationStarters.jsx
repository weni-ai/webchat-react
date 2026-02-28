import PropTypes from 'prop-types';

import './ConversationStarters.scss';

export function ConversationStarters({
  starters,
  onStarterClick,
  variant = 'full',
}) {
  if (!starters || starters.length === 0) return null;

  return (
    <div
      className={`weni-conversation-starters weni-conversation-starters--${variant}`}
    >
      {starters.slice(0, 3).map((starter, index) => (
        <button
          key={index}
          className="weni-conversation-starters__button"
          onClick={() => onStarterClick(starter)}
          title={starter}
        >
          <span className="weni-conversation-starters__text">{starter}</span>
        </button>
      ))}
    </div>
  );
}

ConversationStarters.propTypes = {
  starters: PropTypes.arrayOf(PropTypes.string),
  onStarterClick: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['full', 'compact']),
};

export default ConversationStarters;
