import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';
import Icon from '@/components/common/Icon';
import Button from '@/components/common/Button';
import { COMPONENT_ENTER_DURATION_MS } from '@/utils/componentStreaming';

import './ListMessage.scss';

export function ListMessage({
  buttonText = '',
  items,
  disabled = false,
  animate = false,
  staggerOffset = 0,
  staggerMs = 0,
  durationMs = COMPONENT_ENTER_DURATION_MS,
}) {
  const { setCurrentPage } = useWeniChat();
  const shouldAnimateButton = animate && durationMs > 0;
  const enterStyle = shouldAnimateButton
    ? {
        '--weni-enter-duration': `${durationMs}ms`,
        '--weni-enter-delay': `${Math.round(staggerOffset * staggerMs)}ms`,
      }
    : undefined;

  const handleOpen = () => {
    if (disabled) return;
    setCurrentPage({
      view: 'list-message',
      title: buttonText,
      props: {
        options: items.map((item) => item.title),
        animateEntrance: true,
      },
    });
  };

  return (
    <section className="weni-list-message">
      <Button
        key={buttonText}
        className={`weni-list-message__button${shouldAnimateButton ? ' weni-component-enter--pop' : ''}`}
        variant="secondary"
        disabled={disabled}
        style={enterStyle}
        onClick={handleOpen}
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
  animate: PropTypes.bool,
  staggerOffset: PropTypes.number,
  staggerMs: PropTypes.number,
  durationMs: PropTypes.number,
};
