import * as Linking from "expo-linking";
import type { NotificationPayloadData } from "./types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseLegacyUrlRoute(url: string): string | null {
  const parsed = Linking.parse(url);
  const recipeId = parsed.queryParams?.["recipeId"];
  if (typeof recipeId === "string" && recipeId.length > 0) {
    return `/recipe/${recipeId}/detail`;
  }
  return null;
}

export function getRouteFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as NotificationPayloadData;

  const route = asString(payload.route);
  if (route) {
    return route;
  }

  const legacyUrl = asString(payload.url);
  if (legacyUrl) {
    return parseLegacyUrlRoute(legacyUrl);
  }

  const action = asString(payload.action);
  const type = asString(payload.type);
  const targetId = asString(payload.targetId) ?? asString(payload.target_id);

  switch (action) {
    case "RECIPE_CREATED":
      return targetId ? `/recipe/${targetId}/detail` : null;
    case "NOTICE_OPEN":
      return targetId ? `/notice/${targetId}` : null;
    case "TIMER_OPEN":
      return targetId ? `/recipe/${targetId}/detail` : null;
    case "URL_OPEN":
      return targetId ? targetId : null;
    case "TAB_HOME":
      return "/";
    case "TAB_PROFILE":
      return "/profile";
    case "HOME_OPEN":
      return "/";
    default:
      break;
  }

  switch (type) {
    case "RECIPE_CREATED":
      return targetId ? `/recipe/${targetId}/detail` : null;
    case "NOTICE_OPEN":
      return targetId ? `/notice/${targetId}` : null;
    case "TIMER_OPEN":
      return targetId ? `/recipe/${targetId}/detail` : null;
    case "URL_OPEN":
      return targetId ? targetId : null;
    case "TAB_HOME":
      return "/";
    case "TAB_PROFILE":
      return "/profile";
    case "HOME_OPEN":
      return "/";
    default:
      break;
  }

  switch (action) {
    case "OPEN_RECIPE":
      return targetId ? `/recipe/${targetId}/detail` : null;
    case "OPEN_NOTICE":
      return targetId ? `/notice/${targetId}` : null;
    case "OPEN_TIMER":
      return targetId ? `/recipe/${targetId}/detail` : null;
    case "OPEN_URL":
      return targetId ? targetId : null;
    case "OPEN_TAB_HOME":
      return "/";
    case "OPEN_TAB_PROFILE":
      return "/profile";
    case "OPEN_HOME":
      return "/";
    default:
      return null;
  }
}
