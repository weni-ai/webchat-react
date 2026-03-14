import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Button from '@/components/common/Button';
import './ConversationStarterButton.scss';

export function ConversationStarterButton({
  question,
  variant = 'full',
  onClick,
}) {
  const { t } = useTranslation();

  return (
    <Button
      className={`weni-starter-button weni-starter-button--${variant}`}
      variant="secondary"
      onClick={() => onClick(question)}
      aria-label={t('conversation_starters.aria_label', { question })}
    >
      <span className="weni-starter-button__text">{question}</span>
    </Button>
  );
}

ConversationStarterButton.propTypes = {
  question: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['compact', 'full']),
  onClick: PropTypes.func.isRequired,
};
