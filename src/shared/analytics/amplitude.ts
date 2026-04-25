import { init, setUserId, reset, getDeviceId, flush, add } from "@amplitude/analytics-react-native";
import { SessionReplayPlugin } from "@amplitude/plugin-session-replay-react-native";

const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY!;

/**
 * Amplitude 초기화 (익명 사용자로 시작)
 *
 * 앱 시작 시 호출됩니다. userId 없이 초기화하여 익명 상태로 시작합니다.
 * 로그인 성공 후 setAmplitudeUserId()를 호출하여 userId를 설정합니다.
 * Amplitude는 같은 deviceId의 익명 이벤트를 자동으로 병합합니다.
 */
export const initAmplitude = async () => {
  try {
    // logLevel: 0=None, 1=Error, 2=Warn, 3=Verbose, 4=Debug
    // RN에서 발생하는 cookie storage fallback noise 억제 위해 None
    // (이벤트 송신은 정상, AsyncStorage로 fallback됨)
    await init(AMPLITUDE_API_KEY, undefined, { logLevel: 0 }).promise;

    // Session Replay 플러그인
    // sampleRate: 1 = 100% (개발 중), 운영 시 0.1~0.3 권장
    await add(
      new SessionReplayPlugin({
        enableRemoteConfig: true,
        sampleRate: 1,
      }),
    ).promise;

    console.log("[Amplitude] init 완료 (익명) deviceId:", getDeviceId());
  } catch (error) {
    console.error("[Amplitude] 초기화 에러:", error);
  }
};

/**
 * Amplitude userId 설정
 *
 * 로그인/회원가입 성공 시 호출합니다.
 * 서버에서 받은 provider_sub를 userId로 설정합니다.
 * 이전 익명 이벤트는 같은 deviceId로 자동 병합됩니다.
 *
 * @param providerSub - 서버에서 받은 provider_sub 값
 */
export const setAmplitudeUserId = (providerSub: string) => {
  setUserId(providerSub);
  console.log("[Amplitude] User ID set:", providerSub);
};

/**
 * Amplitude 사용자 초기화
 *
 * 로그아웃 시 호출합니다.
 * userId를 null로 설정하고 deviceId를 재생성하여
 * 다른 사용자의 이벤트와 섞이지 않도록 합니다.
 */
export const resetAmplitudeUser = () => {
  reset();
  console.log("[Amplitude] User reset (로그아웃)");
};

/**
 * 큐에 쌓인 이벤트를 즉시 전송 (개발 중 검증용).
 * 평소엔 SDK가 배치 전송하지만, User Look-Up에서 빨리 보고 싶을 때 호출.
 */
export const flushAmplitude = () => flush().promise;
