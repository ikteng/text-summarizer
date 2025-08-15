/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0066ff';
const tintColorDark = '#4da6ff';

export const Colors = {
  light: {
    text: '#11181C',               // main text
    background: '#f0f4ff',         // main background
    card: '#ffffff',                // sections like input/summaries
    tint: tintColorLight,           // primary accent
    icon: '#555',                   // secondary icons
    tabIconDefault: '#687076',      // inactive tab icon
    tabIconSelected: tintColorLight,// active tab icon
    border: '#c1c9d9',             // borders for cards
    buttonBackground: tintColorLight,
    buttonText: '#ffffff',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    card: '#1c1c1e',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    border: '#2a2a2e',
    buttonBackground: tintColorDark,
    buttonText: '#ffffff',
  },
};

