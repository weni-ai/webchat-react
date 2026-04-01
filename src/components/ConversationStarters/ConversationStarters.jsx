import PropTypes from 'prop-types';
import { ConversationStarterButton } from './ConversationStarterButton';
import './ConversationStarters.scss';

export function ConversationStartersCompact({
  questions,
  onStarterClick,
  isVisible,
  isHiding,
}) {
  if (!isVisible && !isHiding) return null;

  const containerClass = [
    'weni-starters-compact',
    isHiding && 'weni-starters-compact--hiding',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={containerClass}>
      {questions.map((question) => (
        <ConversationStarterButton
          key={question}
          question={question}
          variant="compact"
          onClick={onStarterClick}
        />
      ))}
    </section>
  );
}

ConversationStartersCompact.propTypes = {
  questions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onStarterClick: PropTypes.func.isRequired,
  isVisible: PropTypes.bool.isRequired,
  isHiding: PropTypes.bool,
};

export function ConversationStartersFull({ questions, onStarterClick }) {
  if (!questions?.length) return null;

  return (
    <section className="weni-starters-full">
      {questions.map((question) => (
        <ConversationStarterButton
          key={question}
          question={question}
          variant="full"
          onClick={onStarterClick}
        />
      ))}
    </section>
  );
}

ConversationStartersFull.propTypes = {
  questions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onStarterClick: PropTypes.func.isRequired,
};
