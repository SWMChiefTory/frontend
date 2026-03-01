import { ensureDefaultNotificationChannel, ensureNotificationPermission } from "./permissions";
import {
  deleteExpoPushTokenFromServer,
  getRememberedExpoPushToken,
  getExpoPushToken,
  hasExpoPushTokenChanged,
  rememberExpoPushToken,
  registerExpoPushTokenToServer,
} from "./token";
import { startExpoPushObservers } from "./observers";

type InitExpoPushParams = {
  isLoggedIn: boolean;
};

export async function syncExpoPushRegistration({
  isLoggedIn,
}: InitExpoPushParams): Promise<void> {
  await ensureDefaultNotificationChannel();
  const hasPermission = await ensureNotificationPermission();

  let token: string | null = null;
  if (hasPermission) {
    try {
      token = await getExpoPushToken();
      if (token) {
        const tokenChanged = hasExpoPushTokenChanged(token);
        if (tokenChanged) {
          rememberExpoPushToken(token);
        }

        if (isLoggedIn) {
          await registerExpoPushTokenToServer({ token, isLoggedIn });
        }
      }
    } catch (error) {
      console.warn("[expo-push] failed to get/register token", error);
    }
  } else {
    console.log("[expo-push] notification permission denied");
  }
}

export async function initExpoPush({
  isLoggedIn,
}: InitExpoPushParams): Promise<() => void> {
  await syncExpoPushRegistration({ isLoggedIn });
  return startExpoPushObservers();
}

export async function unregisterExpoPushOnLogout(): Promise<void> {
  const token = getRememberedExpoPushToken();
  if (!token) {
    return;
  }

  try {
    await deleteExpoPushTokenFromServer({ token });
  } catch (error) {
    console.warn("[expo-push] failed to delete token on logout", error);
  }
}
