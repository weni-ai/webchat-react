import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';
import Button from '@/components/common/Button';

import './QuickReplies.scss';
export function QuickReplies({ quickReplies, disabled = false }) {
  const { sendMessage } = useWeniChat();

  return (
    <section className="weni-quick-replies">
      {quickReplies.map((reply) => (
        <Button key={reply} variant="secondary" disabled={disabled} onClick={() => sendMessage(reply)}>{reply}</Button>
      ))}
    </section>
  );
}

QuickReplies.propTypes = {
  quickReplies: PropTypes.array.isRequired,
  disabled: PropTypes.bool
};
