import React, { createContext, useContext } from 'react';
import { useGameStore } from '../store/gameStore';
import { darkColors, lightColors } from './tokens';

export type Colors = typeof darkColors;

const ThemeContext = createContext<Colors>(darkColors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDarkMode = useGameStore(s => s.isDarkMode);
  return (
    <ThemeContext.Provider value={(isDarkMode ? darkColors : lightColors) as Colors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Colors {
  return useContext(ThemeContext);
}
