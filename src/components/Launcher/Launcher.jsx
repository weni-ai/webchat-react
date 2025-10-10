import React, { useState } from 'react'
import PropTypes from 'prop-types'

import { useWeniChat } from '@/hooks/useWeniChat'

import Badge from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'
import Avatar from '@/components/common/Avatar'

import { useChatContext } from '@/contexts/ChatContext'

import './Launcher.scss'

/**
 * Launcher - Chat launcher button
 * TODO: Add unread count badge
 * TODO: Add dinamically image url as Icon
 */
export function Launcher() {
  const { isChatOpen, unreadCount, toggleChat } = useWeniChat();
  const { config } = useChatContext()
  const [isHovering, setIsHovering] = useState(false);

  return (
    <button 
      className={`weni-launcher ${isHovering ? 'weni-launcher--hovering' : ''} ${!isHovering ? 'weni-launcher--out-hovering' : ''}`}
      onClick={toggleChat}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="Toggle chat"
    >
      {!isChatOpen && unreadCount > 0 && (
        <Badge count={unreadCount} />
      )}

      {config.profileAvatar && !isChatOpen 
        ? <Avatar className={`${isChatOpen ? "weni-launcher-icon--click-open" : "weni-launcher-icon--click-close"}`}  src={config.profileAvatar} size="full" /> 
        : <Icon className={`${isChatOpen ? "weni-launcher-icon--click-open" : "weni-launcher-icon--click-close"}`}  name={isChatOpen ? "close" : "chat_bubble"} filled color="white" size="x-large" />
      }
    </button>
  )
}

Launcher.propTypes = {
  position: PropTypes.oneOf(['bottom-right', 'bottom-left', 'top-right', 'top-left'])
}

export default Launcher