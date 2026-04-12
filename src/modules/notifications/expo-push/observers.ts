import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { useDeepLinkStore } from "@/src/shared/store/deep-link-store";

/**
 * Push/Local 알림 옵저버.
 *
 * 처리하는 payload:
 * 1) 서버 push (레시피 생성 완료)
 *    { action: "RECIPE_CREATED", target_id: "<recipe_id>", type: "recipe" }
 * 2) 로컬 알림 (타이머 완료)
 *    { type: "timer", url: "cheftory://?recipeId=<recipe_id>" }
 *
 * 모든 알림은 deepLinkStore에 pending intent로 저장 → 전역 DeepLinkHandler가 처리.
 */

type NotifData = Record<string, unknown> | null | undefined;

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function setPendingFromData(data: NotifData, source: string) {
  if (!data) return;

  const store = useDeepLinkStore.getState();

  // 1) 서버 push: action + target_id
  const action = asString(data.action);
  const targetId = asString(data.target_id) ?? asString((data as any).targetId);
  if (action === "RECIPE_CREATED" && targetId) {
    console.log(`[expo-push] ${source} → detail:`, targetId);
    store.setPending({ type: "detail", recipeId: targetId });
    return;
  }

  // 2) 로컬 타이머: type=timer, url=cheftory://?recipeId=...
  const type = asString(data.type);
  const url = asString(data.url);
  if (type === "timer" && url) {
    const parsed = Linking.parse(url);
    const recipeId = parsed.queryParams?.["recipeId"];
    if (typeof recipeId === "string" && recipeId.length > 0) {
      console.log(`[expo-push] ${source} → cooking:`, recipeId);
      store.setPending({ type: "cooking", recipeId });
      return;
    }
  }

  // 3) legacy: url만 있는 경우
  if (url) {
    const parsed = Linking.parse(url);
    const recipeId = parsed.queryParams?.["recipeId"];
    if (typeof recipeId === "string" && recipeId.length > 0) {
      console.log(`[expo-push] ${source} → detail (legacy):`, recipeId);
      store.setPending({ type: "detail", recipeId });
      return;
    }
  }

  console.log(`[expo-push] ${source} → no matching route, data:`, data);
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
      setPendingFromData(data, "TAP");
    });

  // 3) 콜드 스타트 — 앱 종료 상태에서 알림 탭해서 켜짐
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as NotifData;
      setPendingFromData(data, "COLD START");
    })
    .catch((err) => {
      console.warn("[expo-push] getLastNotificationResponseAsync error", err);
    });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
