import { useChatContext } from '@/contexts/ChatContext';
import Avatar from '@/components/common/Avatar';

import './ChatPresentation.scss';

export function ChatPresentation() {
  const { config } = useChatContext();

  return (
    <section className="weni-chat-presentation">
      <Avatar
        src={config.profileAvatar}
        size={56}
      />

      <h1 className="weni-chat-presentation__title">{config.title}</h1>

      {config.subtitle && (
        <h2 className="weni-chat-presentation__subtitle">{config.subtitle}</h2>
      )}
    </section>
  );
}
