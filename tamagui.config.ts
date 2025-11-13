import { config } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';

const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    dark: {
      ...config.themes.dark,
      background: '#000000',
      backgroundHover: '#1a1a1a',
      backgroundPress: '#2a2a2a',
      backgroundFocus: '#1a1a1a',
      color: '#ffffff',
      colorHover: '#ffffff',
      colorPress: '#ffffff',
      colorFocus: '#ffffff',
      borderColor: '#333333',
      borderColorHover: '#444444',
      borderColorPress: '#555555',
      borderColorFocus: '#444444',
      placeholderColor: '#666666',
    },
    light: {
      ...config.themes.light,
      background: '#ffffff',
      backgroundHover: '#f5f5f5',
      backgroundPress: '#eeeeee',
      backgroundFocus: '#f5f5f5',
      color: '#111111',
      colorHover: '#000000',
      colorPress: '#000000',
      colorFocus: '#000000',
      borderColor: '#dddddd',
      borderColorHover: '#cccccc',
      borderColorPress: '#bbbbbb',
      borderColorFocus: '#cccccc',
      placeholderColor: '#777777',
    },
  },
});

export default tamaguiConfig;

type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

