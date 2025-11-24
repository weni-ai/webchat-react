import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';
import Icon from '@/components/common/Icon';
import Button from '@/components/common/Button';

import './ListMessage.scss';
export function ListMessage({ buttonText = '', items, disabled = false }) {
  const { setCurrentPage } = useWeniChat();

  return (
    <section className="weni-list-message">
      <Button
        key={buttonText}
        variant="secondary"
        disabled={disabled}
        onClick={() =>
          setCurrentPage({
            view: 'list-message',
            title: buttonText,
            props: {
              options: items.map((item) => item.title),
            },
          })
        }
      >
        <Icon
          name="list"
          size="medium"
        />
        {buttonText}
      </Button>
    </section>
  );
}

ListMessage.propTypes = {
  buttonText: PropTypes.string,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
    }),
  ).isRequired,
  disabled: PropTypes.bool,
};
