import PropTypes from 'prop-types';
import { createContext, useContext } from 'react';
import { useConversationStartersCore } from '@/hooks/useConversationStarters';

const ConversationStartersContext = createContext(null);

export function ConversationStartersProvider({ children }) {
  const starters = useConversationStartersCore();

  return (
    <ConversationStartersContext.Provider value={starters}>
      {children}
    </ConversationStartersContext.Provider>
  );
}

ConversationStartersProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useConversationStarters() {
  const context = useContext(ConversationStartersContext);
  if (!context) {
    throw new Error(
      'useConversationStarters must be used within ConversationStartersProvider',
    );
  }
  return context;
}

export default ConversationStartersContext;
