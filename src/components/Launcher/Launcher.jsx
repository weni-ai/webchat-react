import React, { useState } from 'react'
import PropTypes from 'prop-types'

import { useWeniChat } from '@/hooks/useWeniChat'

import Badge from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'

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
  const [isOutHovering, setIsOutHovering] = useState(false);
  
  // TODO: Fix first click animation "glitch"

  function handleHover() {
    setIsHovering(!isHovering)
    setIsOutHovering(isHovering)
  }

  return (
    <button 
      className={`weni-launcher ${isHovering ? 'weni-launcher--hovering' : ''} ${isOutHovering ? 'weni-launcher--out-hovering' : ''}`}
      onClick={toggleChat}
      onMouseEnter={handleHover}
      onMouseLeave={handleHover}
      aria-label="Toggle chat"
    >
      {!isChatOpen && unreadCount > 0 && (
        <Badge count={unreadCount} />
      )}
      <Icon
        className={`${isChatOpen ? "weni-launcher-icon--click-open" : "weni-launcher-icon--click-close"} ${config.profileAvatar ? "weni-launcher-icon--profile" : ''}`} 
        name={isChatOpen ? "close" : config.profileAvatar || "chat"} 
        size="x-large" 
      />
    </button>
  )
}

Launcher.propTypes = {
  position: PropTypes.oneOf(['bottom-right', 'bottom-left', 'top-right', 'top-left'])
}

export default Launcher