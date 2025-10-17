import React from 'react'
import { useWeniChat } from '../../hooks/useWeniChat'
import Header from '../Header/Header'
import MessagesList from '../Messages/MessagesList'
import InputBox from '../Input/InputBox'

/**
 * Chat - Main chat container
 * TODO: Implement chat window with header, messages, and input
 * TODO: Add show/hide animations
 * TODO: Handle fullscreen mode
 * TODO: Add mobile responsiveness
 */
export function Chat() {
  const { isChatOpen } = useWeniChat()
  
  // TODO: Implement open/close animations
  // TODO: Add proper layout and styling
  
  if (!isChatOpen) {
    return null
  }
  
  return (
    <div className="weni-chat-container">
      <Header />
      <MessagesList />
      <InputBox />
    </div>
  )
}

export default Chat

