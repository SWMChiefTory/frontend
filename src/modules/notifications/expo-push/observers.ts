import * as Notifications from "expo-notifications";

export function startExpoPushObservers(): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("[expo-push] foreground notification received", {
        identifier: notification.request.identifier,
        data: notification.request.content.data,
      });
    },
  );

  return () => {
    receivedSubscription.remove();
  };
}

