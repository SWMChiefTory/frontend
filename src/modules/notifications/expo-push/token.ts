import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { deletePushToken, registerPushToken } from "./api";

let lastExpoPushToken: string | null = null;
let lastRegisteredToken: string | null = null;

function getProjectId(): string | null {
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);

  return typeof projectId === "string" && projectId.length > 0 ? projectId : null;
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[expo-push] Running on emulator/simulator. Attempting push token registration anyway.");
  }

  const projectId = getProjectId();
  const token = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return token.data;
}

export function hasExpoPushTokenChanged(token: string | null): boolean {
  if (!token) {
    return false;
  }
  return token !== lastExpoPushToken;
}

export function rememberExpoPushToken(token: string | null): void {
  lastExpoPushToken = token;
}

export function getRememberedExpoPushToken(): string | null {
  return lastExpoPushToken;
}

function getCurrentPlatform(): "IOS" | "ANDROID" {
  return Platform.OS === "ios" ? "IOS" : "ANDROID";
}

export async function registerExpoPushTokenToServer(params: {
  token: string;
  isLoggedIn: boolean;
}): Promise<void> {
  const { token, isLoggedIn } = params;

  if (!isLoggedIn) {
    return;
  }

  if (token === lastRegisteredToken) {
    return;
  }

  await registerPushToken({
    token,
    provider: "EXPO",
    platform: getCurrentPlatform(),
  });

  lastRegisteredToken = token;
  console.log("[expo-push] token registered to server", { platform: getCurrentPlatform() });
}

export async function deleteExpoPushTokenFromServer(params: {
  token: string;
}): Promise<void> {
  const { token } = params;

  await deletePushToken({
    token,
    provider: "EXPO",
  });

  if (lastRegisteredToken === token) {
    lastRegisteredToken = null;
  }

  console.log("[expo-push] token deleted from server");
}
