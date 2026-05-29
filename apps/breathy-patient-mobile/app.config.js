module.exports = {
  expo: {
    name: 'Breathy',
    slug: 'patient',
    version: '1.0.0',
    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#22ae9e',
    },
    assetBundlePatterns: ['**/*'],
    updates: {
      url: 'https://u.expo.dev/0c64e6f4-07ea-4bd6-aa3a-d907d32235fd'
    },
    runtimeVersion: {
      policy: 'appVersion'
    },
    ios: {
      buildNumber: '1',
      supportsTablet: true,
      bundleIdentifier: 'com.breathy.patient',
      infoPlist: {
        NSCameraUsageDescription:
          'Breathy needs camera access to allow video consultations with patients.',
        NSMicrophoneUsageDescription:
          'Breathy needs microphone access to allow you to speak with patients during video calls.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#22ae9e',
      },
      package: 'com.breathy.patient',
      versionCode: 1,
      googleServicesFile: './google-services.json',
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.POST_NOTIFICATIONS',
      ],
      softwareKeyboardLayoutMode: 'resize',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#22ae9e',
          sounds: ['./assets/breathy_alert.wav'],
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera',
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone',
          recordAudioAndroid: true,
        },
      ],
      'expo-secure-store',
      'expo-localization',
      [
        'expo-build-properties',
        {
          android: {
            newArchEnabled: true,
            enableProguardInReleaseBuilds: true,
            pageAlign16k: true,
            packagingOptions: {
              pickFirst: ['lib/**/libc++_shared.so', 'lib/**/libjsc.so'],
            },
          },
          ios: {
            newArchEnabled: true,
          },
        },
      ],
      '@react-native-community/datetimepicker',
      'expo-font',
      'expo-sharing',
      './plugins/withRemoveOrientation.js'
    ],
    extra: {
      eas: {
        projectId: '0c64e6f4-07ea-4bd6-aa3a-d907d32235fd',
      },
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST,
    },
    owner: 'breathy',
  },
};