import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FSButton } from '../common/FSButton';
import './ConversationStarterButton.scss';

export function ConversationStarterButton({
  question,
  variant = 'full',
  onClick,
}) {
  const { t } = useTranslation();

  return (
    <FSButton
      className={`weni-starter-button weni-starter-button--${variant}`}
      variant="tertiary"
      size="small"
      onClick={() => onClick(question)}
      aria-label={t('conversation_starters.aria_label', { question })}
    >
      {question}
    </FSButton>
  );
}

ConversationStarterButton.propTypes = {
  question: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['compact', 'full']),
  onClick: PropTypes.func.isRequired,
};
