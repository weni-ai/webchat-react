import PropTypes from 'prop-types';
import Button from '@/components/common/Button';
import { useState, useMemo } from 'react';
import { useWeniChat } from '@/hooks/useWeniChat';
import { useTranslation } from 'react-i18next';

import './ListMessage.scss';

export function ListMessage({ options }) {
  const { t } = useTranslation();
  const { setCurrentPage, sendMessage } = useWeniChat();
  const [selectedOption, setSelectedOption] = useState(null);

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  const isTouchDevice = useMemo(
    () =>
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0,
    [],
  );

  return (
    <section className="weni-view-list-message">
      <section className="weni-view-list-message__options">
        {options.map((option) => (
          <Button
            key={option}
            variant="secondary"
            alignContent="start"
            onClick={() => handleOptionChange(option)}
            hoverState={selectedOption === option}
          >
            {option}
          </Button>
        ))}
      </section>

      {!selectedOption && isTouchDevice && (
        <section className="weni-view-list-message__instruction">
          {t('list_message.instruction')}
        </section>
      )}

      <footer className="weni-view-list-message__footer">
        <Button
          variant="tertiary"
          onClick={() => setCurrentPage(null)}
        >
          {t('list_message.actions.back')}
        </Button>

        <Button
          variant="primary"
          disabled={!selectedOption}
          onClick={() => {
            sendMessage(selectedOption);
            setCurrentPage(null);
          }}
        >
          {t('list_message.actions.send')}
        </Button>
      </footer>
    </section>
  );
}

ListMessage.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
};
