import Button from '@/components/common/Button';
import { useWeniChat } from '@/hooks/useWeniChat';
import { useTranslation } from 'react-i18next';
import './AlreadyInUse.scss';

export function AlreadyInUse() {
  const { t } = useTranslation();
  const { toggleChat, connect } = useWeniChat();

  return (
    <section className="weni-already-in-use">
      <h3 className="weni-already-in-use__title">{t('already_in_use.title')}</h3>
      <p className="weni-already-in-use__description">{t('already_in_use.description')}</p>

      <section className="weni-already-in-use__actions">
        <Button variant="secondary" onClick={toggleChat}>{t('already_in_use.actions.close')}</Button>
        <Button variant="primary" onClick={connect}>{t('already_in_use.actions.use_here')}</Button>
      </section>
    </section>
  );
}
