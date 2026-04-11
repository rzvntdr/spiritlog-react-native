import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'SpiritLog Dev' : 'SpiritLog',
  slug: 'spiritlog',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1A2332',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: IS_DEV ? 'com.spiritlog.app.dev' : 'com.spiritlog.app',
    infoPlist: {
      UIBackgroundModes: ['audio'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1A2332',
    },
    edgeToEdgeEnabled: true,
    package: IS_DEV ? 'com.spiritlog.app.dev' : 'com.spiritlog.app',
  },
  plugins: [
    'expo-sqlite',
    ['expo-notifications', { sounds: [] }],
    '@react-native-google-signin/google-signin',
    '@react-native-community/datetimepicker',
  ],
});
