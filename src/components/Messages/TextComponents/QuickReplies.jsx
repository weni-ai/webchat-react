import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';
import Icon from '@/components/common/Icon';
import Button from '@/components/common/Button';

import './QuickReplies.scss';
export function QuickReplies({ type, buttonText = '', items, disabled }) {
  const { setCurrentPage, sendMessage } = useWeniChat();

  if (type === 'listMessage') {
    return (
      <section className="weni-quick-replies">
        <Button
          key={buttonText}
          variant="secondary"
          disabled={disabled}
          onClick={() => setCurrentPage({
            view: 'list-message',
            title: buttonText,
            props: {
              options: items.map(item => item.title),
            },
          })}
        >
          <Icon name="list" size="medium" />
          {buttonText}
        </Button>
      </section>
    );
  }

  return (
    <section className="weni-quick-replies">
      {items.map((reply) => (
        <Button key={reply} variant="secondary" disabled={disabled} onClick={() => sendMessage(reply)}>{reply}</Button>
      ))}
    </section>
  );
}

QuickReplies.propTypes = {
  type: PropTypes.oneOf(['quickReplies', 'listMessage']),
  buttonText: PropTypes.string,
  items: PropTypes.array.isRequired,
  disabled: PropTypes.bool
};
