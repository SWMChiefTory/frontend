const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Expo config plugin: Android <queries>에 youtube 스킴 등록
 *
 * Android 11+(API 30) 이상에서 Linking.canOpenURL("vnd.youtube://")이
 * 올바르게 동작하려면 AndroidManifest.xml의 <queries>에 스킵을 선언해야 합니다.
 *
 * YouTube URL Schemes:
 * - vnd.youtube:// (Android - 앱 열기)
 * - vnd.youtube://www.youtube.com/watch?v=VIDEO_ID (특정 영상)
 */

const YOUTUBE_SCHEME = "vnd.youtube";

function addYoutubeQuery(androidManifest) {
  // <queries> 블록이 없으면 생성
  if (!androidManifest.manifest.queries) {
    androidManifest.manifest.queries = [{}];
  }

  const queries = androidManifest.manifest.queries[0];
  queries.intent = queries.intent || [];

  // 이미 추가돼 있으면 중복 방지
  const exists = queries.intent.some((intent) => {
    const dataEntries = intent.data || [];
    return dataEntries.some(
      (d) => d.$?.["android:scheme"] === YOUTUBE_SCHEME,
    );
  });

  if (exists) return androidManifest;

  // youtube 스킴 쿼리 추가
  queries.intent.push({
    action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
    data: [{ $: { "android:scheme": YOUTUBE_SCHEME } }],
  });

  return androidManifest;
}

module.exports = function withYoutubeQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults = addYoutubeQuery(cfg.modResults);
    return cfg;
  });
};
