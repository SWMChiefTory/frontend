import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { router } from "expo-router";

/**
 * Push/Local 알림 옵저버 + 라우팅.
 *
 * 처리하는 payload:
 * 1) 서버 push (레시피 생성 완료)
 *    { action: "RECIPE_CREATED", target_id: "<recipe_id>", type: "recipe" }
 * 2) 로컬 알림 (타이머 완료)
 *    { type: "timer", url: "cheftory://?recipeId=<recipe_id>" }
 *
 * 둘 다 최종적으로 `/recipe/<id>` 로 이동.
 */

type NotifData = Record<string, unknown> | null | undefined;

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function getRouteFromData(data: NotifData): string | null {
  if (!data) return null;

  // 1) 서버 push: action + target_id
  const action = asString(data.action);
  const targetId = asString(data.target_id) ?? asString((data as any).targetId);
  if (action === "RECIPE_CREATED" && targetId) {
    return `/recipe/${targetId}`;
  }

  // 2) 로컬 타이머: type=timer, url=cheftory://?recipeId=...
  const type = asString(data.type);
  const url = asString(data.url);
  if (type === "timer" && url) {
    const parsed = Linking.parse(url);
    const recipeId = parsed.queryParams?.["recipeId"];
    if (typeof recipeId === "string" && recipeId.length > 0) {
      return `/recipe/${recipeId}`;
    }
  }

  // legacy: url 만 있는 경우
  if (url) {
    const parsed = Linking.parse(url);
    const recipeId = parsed.queryParams?.["recipeId"];
    if (typeof recipeId === "string" && recipeId.length > 0) {
      return `/recipe/${recipeId}`;
    }
  }

  return null;
}

function navigateFromNotification(data: NotifData, source: string) {
  const route = getRouteFromData(data);
  console.log(`[expo-push] ${source} → route:`, route, "data:", data);
  if (route) {
    router.push(route as any);
  }
}

export function startExpoPushObservers(): () => void {
  // 1) 포그라운드 수신 — 라우팅하지 않음 (사용자 의도 아님)
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("[expo-push] FOREGROUND received", {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
      });
    },
  );

  // 2) 백/포그라운드 알림 탭
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotifData;
      navigateFromNotification(data, "TAP");
    });

  // 3) 콜드 스타트 — 앱 종료 상태에서 알림 탭해서 켜짐
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as NotifData;
      // router 마운트 후에 push 되도록 약간 지연
      setTimeout(() => navigateFromNotification(data, "COLD START"), 300);
    })
    .catch((err) => {
      console.warn("[expo-push] getLastNotificationResponseAsync error", err);
    });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
