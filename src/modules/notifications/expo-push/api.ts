import { client } from "@/src/shared/api/client";

export type RegisterExpoPushTokenRequest = {
  token: string;
  provider: "EXPO";
  platform: "IOS" | "ANDROID";
};

export type DeleteExpoPushTokenRequest = {
  token: string;
  provider: "EXPO";
};

const PUSH_TOKEN_ENDPOINT = "/users/me/pushToken";

export async function registerPushToken(
  payload: RegisterExpoPushTokenRequest,
): Promise<void> {
  await client.post(PUSH_TOKEN_ENDPOINT, payload);
}

export async function deletePushToken(
  payload: DeleteExpoPushTokenRequest,
): Promise<void> {
  await client.delete(PUSH_TOKEN_ENDPOINT, { data: payload });
}
