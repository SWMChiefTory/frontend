export default {
  expo: {
    name: "쉐프토리",
    slug: "cheftory",
    version: "1.0.14",
    orientation: "portrait",
    icon: "./assets/images/mainCharacter.png",
    scheme: "cheftory",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    owner: "cheftory",
    runtimeVersion: { policy: "appVersion" },
    updates: {
      url: "https://u.expo.dev/f02c958a-c473-4a51-829c-3ff1ad8fd256",
      fallbackToCacheTimeout: 0,
    },
    ios: {
      buildNumber: "5",
      entitlements: {
        "com.apple.security.application-groups": [
          "group.com.cheftory.cheftory",
        ],
        "aps-environment": "production",
        "com.apple.developer.speech-recognition": true,
      },
      googleServicesFile:
        process.env.GOOGLE_SERVICES_PLIST ||
        "./firebase/GoogleService-Info.plist",
      deploymentTarget: "17.2",
      appleTeamId: "2UFFR3J3LQ",
      supportsTablet: true,
      bundleIdentifier: "com.cheftory.cheftory",
      usesAppleSignIn: true,
      infoPlist: {
        CFBundleDevelopmentRegion: "ko",
        ITSAppUsesNonExemptEncryption: false,
        LSApplicationQueriesSchemes: ["kakaotalk", "youtube"],
        UIBackgroundModes: ["fetch", "remote-notification"],
        NSUserNotificationUsageDescription:
          "타이머 종료 시 알림을 보내기 위해 필요합니다.",
        NSSupportsLiveActivities: true,
        NSFaceIDUsageDescription:
          "안전한 로그인과 인증을 위해 Face ID를 사용합니다.",
        NSMicrophoneUsageDescription:
          "쉐프토리는 음성으로 레시피를 제어하기 위해 마이크 접근 권한이 필요합니다.",
        NSPhotoLibraryUsageDescription:
          "레시피 이미지를 저장하기 위해 사진 라이브러리 접근이 필요합니다.",
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
        CFBundleURLTypes: [
          {
            CFBundleURLName: "google-oauth",
            CFBundleURLSchemes: [
              "com.googleusercontent.apps.248373759203-lvs4hmrf3na2kookbmm17p2bp8ccqqbk",
            ],
          },
          {
            CFBundleURLName: "apple-signin",
            CFBundleURLSchemes: ["com.cheftory.cheftory"],
          },
          {
            CFBundleURLName: "app-deeplink",
            CFBundleURLSchemes: ["cheftory"],
          },
        ],
      },
    },
    android: {
      versionCode: 46,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || "./firebase/google-services.json",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon-foreground.png",
        backgroundColor: "#FFFFFF",
      },
      edgeToEdgeEnabled: true,
      package: "com.cheftory.cheftory",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/mainCharacter.png",
    },
    plugins: [
      "expo-router",
      "@bacons/apple-targets",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splashLogo.png",
          resizeMode: "contain",
          backgroundColor: "#FFF5F0",
        },
      ],
      "expo-secure-store",
      "expo-font",
      "expo-localization",
      "expo-web-browser",
      "expo-apple-authentication",
      "@react-native-google-signin/google-signin",
      "./plugins/android-share",
      "./plugins/android-keystore",
      "./plugins/android-kakaotalk-queries",
      "./plugins/android-youtube-queries",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            useModularHeaders: true,
            deploymentTarget: "16.1",
          },
          android: {
            minSdkVersion: 26,
          },
        },
      ],
      ["expo-screen-orientation", { initialOrientation: "PORTRAIT_UP" }],
      "./plugins/app-localization",
      "expo-speech-transcriber",
      "onnxruntime-react-native",
    ],
    experiments: {
      typedRoutes: true,
      reactCanary: true,
    },
    extra: {
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      router: {
        origin: false,
        autoLinking: true,
      },
      eas: {
        projectId: "f02c958a-c473-4a51-829c-3ff1ad8fd256",
      },
    },
  },
};
