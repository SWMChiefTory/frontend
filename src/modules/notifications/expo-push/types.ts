export type NotificationAction =
  | "RECIPE_CREATED"
  | "NOTICE_OPEN"
  | "TIMER_OPEN"
  | "URL_OPEN"
  | "TAB_HOME"
  | "TAB_PROFILE"
  | "HOME_OPEN"
  | "OPEN_RECIPE"
  | "OPEN_NOTICE"
  | "OPEN_HOME"
  | string;

export type NotificationPayloadData = {
  // Server event type (e.g. RECIPE_CREATE)
  action?: NotificationAction;
  targetId?: string;
  target_id?: string;
  // Target entity type from backend metadata (e.g. RECIPE)
  type?: string;
  route?: string;
  // Legacy/local notification compatibility
  url?: string;
  messageId?: string;
  sentAt?: string | number;
  sent_at?: string | number;
  [key: string]: unknown;
};
