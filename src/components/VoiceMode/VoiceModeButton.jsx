import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';

export function VoiceModeButton({ onClick }) {
  const { t } = useTranslation();

  return (
    <Button
      variant="primary"
      size="large"
      icon="graphic_eq"
      onClick={onClick}
      aria-label={t('voice_mode.aria_enter')}
      rounded
    />
  );
}

VoiceModeButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default VoiceModeButton;
