import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof lightColors;
}

const lightColors = {
  // Backgrounds
  background: '#E6F4F1',
  cardBackground: '#F2F7F4',
  modalBackground: '#FFFFFF',
  headerBackground: '#E6F4F1',
  
  // Text
  text: '#182321',
  textSecondary: '#5F6C68',
  textMuted: '#666',
  
  // Primary
  primary: '#033E30',
  primaryText: '#FFFFFF',
  
  // Accents
  success: '#0A8F4A',
  successLight: '#DFF4EA',
  error: '#D9534F',
  
  // Borders & Dividers
  border: '#D7E0DB',
  borderLight: '#e6eee9',
  
  // Badges
  badgeBackground: '#E0F2E9',
  badgeText: '#033E30',
  
  // Balance badges
  balanceBadgeBackground: '#DFF4EA',
  balanceBadgeText: '#0A8F4A',
  
  // Emoji circles
  emojiCircle: '#DFF4EA',
  
  // Icon
  iconColor: '#666',
};

const darkColors = {
  // Backgrounds
  background: '#0F1511',
  cardBackground: '#1A2420',
  modalBackground: '#1A2420',
  headerBackground: '#0F1511',
  
  // Text
  text: '#E8F0ED',
  textSecondary: '#A0ADA8',
  textMuted: '#8A9590',
  
  // Primary
  primary: '#0A8F4A',
  primaryText: '#FFFFFF',
  
  // Accents
  success: '#0A8F4A',
  successLight: '#1A3329',
  error: '#D9534F',
  
  // Borders & Dividers
  border: '#2A3832',
  borderLight: '#2A3832',
  
  // Badges
  badgeBackground: '#1A3329',
  badgeText: '#4CAF78',
  
  // Balance badges
  balanceBadgeBackground: '#1A3329',
  balanceBadgeText: '#4CAF78',
  
  // Emoji circles
  emojiCircle: '#1A3329',
  
  // Icon
  iconColor: '#A0ADA8',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_preference';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // Load theme from storage on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
