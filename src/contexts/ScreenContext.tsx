import { createContext, useContext } from 'react';
import { ScreenContextType } from '../types/screen';

export const ScreenContext = createContext<ScreenContextType | undefined>(undefined);

export const useScreen = () => {
  const context = useContext(ScreenContext);
  if (!context) {
    throw new Error('useScreen must be used within a ScreenContext');
  }
  return context;
};
