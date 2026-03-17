/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'Century Gothic',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'Century Gothic',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'Century Gothic',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'Century Gothic',
  },
  default: {
    sans: 'Century Gothic',
    serif: 'Century Gothic',
    rounded: 'Century Gothic',
    mono: 'Century Gothic',
  },
  web: {
    sans: "'Century Gothic', 'Arial', sans-serif",
    serif: "'Century Gothic', Georgia, 'Times New Roman', serif",
    rounded: "'Century Gothic', 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
