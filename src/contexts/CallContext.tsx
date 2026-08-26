import React, {createContext, useContext, useState, ReactNode} from 'react';

interface CallContextType {
  callModalMinimized: boolean;
  setCallModalMinimized: (minimized: boolean) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [callModalMinimized, setCallModalMinimized] = useState(false);

  return (
    <CallContext.Provider value={{callModalMinimized, setCallModalMinimized}}>
      {children}
    </CallContext.Provider>
  );
};

export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within CallProvider');
  }
  return context;
};


