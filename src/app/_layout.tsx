import { CustomBackButton } from "@/src/shared/components/layout/CustomBackButton";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  focusManager,
} from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { GlobalErrorBoundary } from "@/src/shared/components/error/GlobalErrorBoundary";
import { SplashScreenController } from "@/src/shared/splash/SplashScreenController";
import { useEffect } from "react";
import { useAppBootstrap } from "@/src/shared/hooks/useAppBootstrap";

import * as Network from "expo-network";
import { AppState, AppStateStatus, Platform } from "react-native";
import {
  MD3LightTheme as DefaultTheme,
  PaperProvider,
  useTheme,
} from "react-native-paper";

import * as Notifications from "expo-notifications";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initAmplitude, trackNative } from "@/src/shared/analytics";
import { AmplitudeEvent } from "@/src/shared/analytics/amplitudeEvents";
import { initExpoPush, syncExpoPushRegistration } from "../modules/notifications/expo-push";

ExpoSplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { throwOnError: false },
    mutations: { throwOnError: false },
  },
});

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
}

function useAppState(onChange: (status: AppStateStatus) => void) {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  }, [onChange]);
}

function useOnlineManager() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    return onlineManager.setEventListener((setOnline) => {
      const eventSubscription = Network.addNetworkStateListener((state) => {
        setOnline(!!state.isConnected);
      });
      return eventSubscription.remove;
    });
  }, []);
}

function RootNavigator({ isLoggedIn }: { isLoggedIn: boolean }) {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackVisible: false,
        headerLeft: () => <CustomBackButton />,
        headerStyle: { backgroundColor: theme.colors.primary },
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#f57c00",
    onPrimary: "#ffffff",
    primaryContainer: "#ffd54f",
    onPrimaryContainer: "#1a1a1a",
    onPrimaryContainerDisabled: "#C7C7C7",
    deEmphasized: "#1a1a1a",
    secondary: "#ff5722",
    surface: "#ffffff",
    background: "#ffffff",
  },
};

export default function RootLayout() {
  const { isReady, isLoggedIn } = useAppBootstrap();

  const [fontsLoaded] = useFonts({
    'KHNPHandotumOTF': require('@/assets/fonts/KHNPHDotfR.otf'),
    'KHNPHandotumOTF-Bold': require('@/assets/fonts/KHNPHDotfB.otf'),
    'Pretendard': require('@/assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.otf'),
  });

  useOnlineManager();
  useAppState(onAppStateChange);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      await initAmplitude();
      trackNative(AmplitudeEvent.APP_LAUNCHED);
    })();
  }, []);

  useEffect(() => {
    if (!isReady || !isLoggedIn) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let isMounted = true;

    (async () => {
      cleanup = await initExpoPush({ isLoggedIn });
      if (!isMounted) {
        cleanup?.();
      }
    })();

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [isReady, isLoggedIn]);

  useEffect(() => {
    if (!isReady || !isLoggedIn) {
      return;
    }

    const subscription = AppState.addEventListener("change", (status) => {
      if (status !== "active") {
        return;
      }

      void syncExpoPushRegistration({ isLoggedIn: true });
    });

    return () => {
      subscription.remove();
    };
  }, [isReady, isLoggedIn]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <PaperProvider theme={theme}>
            <BottomSheetModalProvider>
              <GlobalErrorBoundary>
                <SplashScreenController isReady={isReady}>
                  <RootNavigator isLoggedIn={isLoggedIn} />
                </SplashScreenController>
              </GlobalErrorBoundary>
            </BottomSheetModalProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
