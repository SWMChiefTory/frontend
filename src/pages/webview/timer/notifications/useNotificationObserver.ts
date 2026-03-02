import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { reserveMessage } from "@/src/shared/webview/sendMessage";
import { getRouteFromNotificationData } from "@/src/modules/notifications/expo-push/router";

export function useNotificationObserver() {
  useEffect(() => {
    function redirect(notification: Notifications.Notification) {
      const route = getRouteFromNotificationData(notification.request.content.data);
      if (route) {
        reserveMessage({
          type: "ROUTE",
          data: {
            route,
          },
        });
      } else {
        console.log("이동할 알림 라우트를 찾지 못했습니다.");
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response?.notification) {
        return;
      }
      redirect(response.notification);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        redirect(response.notification);
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
