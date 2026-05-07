import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';
import { FSButton } from '@/components/common/FSButton';

import './QuickReplies.scss';
export function QuickReplies({ quickReplies, disabled = false }) {
  const { sendMessage } = useWeniChat();

  return (
    <section className="weni-quick-replies">
      {quickReplies.map((reply) => (
        <FSButton
          className="weni-quick-replies__button"
          key={reply}
          variant="tertiary"
          disabled={disabled}
          onClick={() => sendMessage(reply)}
        >
          {reply}
        </FSButton>
      ))}
    </section>
  );
}

QuickReplies.propTypes = {
  quickReplies: PropTypes.array.isRequired,
  disabled: PropTypes.bool,
};
