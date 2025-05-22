const tintColorLight = '#007AFF';
const tintColorDark = '#4B9CFF';

export default {
  // App theme colors
  primary: '#007AFF',
  secondary: '#764ABC',
  accent: '#FF9500',
  background: '#121214',
  card: '#1C1C1E',
  text: '#FFFFFF',
  subtext: '#8E8E93',
  border: '#38383A',
  notification: '#FF3B30',
  tabIconDefault: '#8E8E93',
  tabIconSelected: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  // Waveform colors
  waveformBackground: '#1C1C1E',
  waveformPrimary: '#007AFF',
  waveformSecondary: '#FF9500',
  vocalTrack: '#764ABC',
  instrumentalTrack: '#34C759',
  
  // Processing states
  processingBackground: 'rgba(0, 0, 0, 0.7)',
  
  // Light theme (for future implementation)
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#C7C7CC',
    tabIconSelected: tintColorLight,
  },
  
  // Dark theme (default)
  dark: {
    text: '#FFFFFF',
    background: '#121214',
    tint: tintColorDark,
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorDark,
  },
};