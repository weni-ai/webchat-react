import { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const MessagesScrollContext = createContext(null);

export function MessagesScrollProvider({ onWordRevealed, children }) {
  return (
    <MessagesScrollContext.Provider value={onWordRevealed}>
      {children}
    </MessagesScrollContext.Provider>
  );
}

MessagesScrollProvider.propTypes = {
  onWordRevealed: PropTypes.func,
  children: PropTypes.node.isRequired,
};

export function useMessagesScroll() {
  return useContext(MessagesScrollContext);
}
