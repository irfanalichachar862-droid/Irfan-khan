export interface AppTheme {
  id: string;
  name: string;
  tagline: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  surfaceHover: string;
}

export const THEME_PRESETS: AppTheme[] = [
  {
    id: 'neon_cyan',
    name: 'Neon Cyan (Default)',
    tagline: 'High-contrast cybernetic teal on deep charcoal',
    primary: '#4ADEDE',
    secondary: '#64CCC5',
    accent: '#7DE2D1',
    bg: '#0B0E11',
    surface: '#1C232B',
    surfaceHover: '#26303B',
  },
  {
    id: 'cyber_magenta',
    name: 'Cyber Magenta',
    tagline: 'Electric synthwave pink and neon orchid',
    primary: '#FF3E9D',
    secondary: '#E879F9',
    accent: '#F472B6',
    bg: '#0D0814',
    surface: '#1F142B',
    surfaceHover: '#2D1E3E',
  },
  {
    id: 'emerald_matrix',
    name: 'Emerald Matrix',
    tagline: 'Bio-digital phosphor green terminal',
    primary: '#10B981',
    secondary: '#34D399',
    accent: '#6EE7B7',
    bg: '#07120E',
    surface: '#13261F',
    surfaceHover: '#1C382E',
  },
  {
    id: 'solar_amber',
    name: 'Solar Flare Amber',
    tagline: 'High-visibility tactical gold & warm obsidian',
    primary: '#F59E0B',
    secondary: '#FBBF24',
    accent: '#FCD34D',
    bg: '#120E07',
    surface: '#261E12',
    surfaceHover: '#362B1A',
  },
  {
    id: 'electric_violet',
    name: 'Electric Violet',
    tagline: 'Deep space ultraviolet & plasma indigo',
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    accent: '#C4B5FD',
    bg: '#0A0814',
    surface: '#19152B',
    surfaceHover: '#262040',
  },
  {
    id: 'crimson_ops',
    name: 'Crimson Tactical',
    tagline: 'Red-alert night vision guard aesthetic',
    primary: '#FF4D4D',
    secondary: '#F87171',
    accent: '#FCA5A5',
    bg: '#130808',
    surface: '#281313',
    surfaceHover: '#381B1B',
  },
  {
    id: 'arctic_glacier',
    name: 'Arctic Ice Blue',
    tagline: 'Crisp sub-zero sky blue on midnight slate',
    primary: '#38BDF8',
    secondary: '#0EA5E9',
    accent: '#7DD3FC',
    bg: '#070F17',
    surface: '#132230',
    surfaceHover: '#1D3247',
  },
  {
    id: 'lime_overdrive',
    name: 'Volt Overdrive',
    tagline: 'Kinetic acid lime for instant morning energy',
    primary: '#A3E635',
    secondary: '#84CC16',
    accent: '#BEF264',
    bg: '#0B1107',
    surface: '#1A2612',
    surfaceHover: '#26381B',
  },
];

export function applyThemeToDocument(theme: AppTheme) {
  const root = document.documentElement;
  root.style.setProperty('--sw-primary', theme.primary);
  root.style.setProperty('--sw-secondary', theme.secondary);
  root.style.setProperty('--sw-accent', theme.accent);
  root.style.setProperty('--sw-bg', theme.bg);
  root.style.setProperty('--sw-surface', theme.surface);
  root.style.setProperty('--sw-surface-hover', theme.surfaceHover);
}
