import { createContext, useContext } from 'react';
import { ScreenContextType } from '../types/screen';
import { ExtendedScreenContextType } from  '../types/screen';

export const ScreenContext = createContext<ScreenContextType | undefined>(undefined);
export const ScreenContexts = createContext<ExtendedScreenContextType | undefined>(undefined);


export const useScreen = () => {
  const context = useContext(ScreenContext);
  if (!context) {
    throw new Error('useScreen must be used within a ScreenContext');
  }
  return context;
};

export const useScreenParams = () => {
  const context = useContext(ScreenContexts);
  if (!context) {
    throw new Error('useScreen must be used within a ScreenContext');
  }
  return context;
};
