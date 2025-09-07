import { Theme } from '../types';

export interface ThemeInfo {
  id: Theme;
  name: string;
  type: 'light' | 'dark';
  colors: {
    bg: string;
    card: string;
    primary: string;
    text: string;
  };
}

export const themes: ThemeInfo[] = [
    {
      id: 'default-light',
      name: 'GestiFiltres Clair',
      type: 'light',
      colors: { bg: 'hsl(210 40% 98%)', card: 'hsl(0 0% 100%)', primary: 'hsl(24.6 95% 53.1%)', text: 'hsl(222.2 84% 4.9%)' }
    },
    {
      id: 'solarized-light',
      name: 'Solarized Clair',
      type: 'light',
      colors: { bg: 'hsl(46 86% 94%)', card: 'hsl(45 62% 91%)', primary: 'hsl(207 88% 51%)', text: 'hsl(196 15% 42%)' }
    },
    {
      id: 'default-dark',
      name: 'GestiFiltres Sombre',
      type: 'dark',
      colors: { bg: 'hsl(222.2 84% 4.9%)', card: 'hsl(222.2 84% 4.9%)', primary: 'hsl(24.6 95% 53.1%)', text: 'hsl(210 40% 98%)' }
    },
    {
      id: 'vscode-dark',
      name: 'VSCode Sombre',
      type: 'dark',
      colors: { bg: 'hsl(240 10% 12%)', card: 'hsl(240 7% 16%)', primary: 'hsl(212 100% 40%)', text: 'hsl(0 0% 83%)' }
    },
    {
      id: 'nord',
      name: 'Nord',
      type: 'dark',
      colors: { bg: 'hsl(220 13% 21%)', card: 'hsl(220 13% 25%)', primary: 'hsl(194 38% 67%)', text: 'hsl(220 17% 90%)' }
    },
    {
      id: 'github-dark',
      name: 'GitHub Sombre',
      type: 'dark',
      colors: { bg: 'hsl(216 28% 7%)', card: 'hsl(220 23% 11%)', primary: 'hsl(212 100% 67%)', text: 'hsl(212 14% 82%)' }
    },
];