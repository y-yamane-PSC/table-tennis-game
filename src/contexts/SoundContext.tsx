import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSound, SoundSystem } from '../hooks/useSound';

interface SoundContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  sound: SoundSystem;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const sound = useSound(soundEnabled);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  // soundEnabled が切り替わったとき BGM を開始/停止
  useEffect(() => {
    if (soundEnabled) {
      sound.startBGM();
    } else {
      sound.stopBGM();
    }
  }, [soundEnabled]);

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound, sound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSoundContext = (): SoundContextType => {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSoundContext must be used within SoundProvider');
  return ctx;
};
