const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Expo config plugin: Android <queries>에 kakaotalk 스킴 등록
 *
 * Android 11+(API 30) 이상에서 Linking.canOpenURL("kakaotalk://")이
 * 올바르게 동작하려면 AndroidManifest.xml의 <queries>에 스킴을 선언해야 합니다.
 */

const KAKAOTALK_SCHEME = "kakaotalk";

function addKakaotalkQuery(androidManifest) {
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
      (d) => d.$?.["android:scheme"] === KAKAOTALK_SCHEME,
    );
  });

  if (exists) return androidManifest;

  // kakaotalk 스킴 쿼리 추가
  queries.intent.push({
    action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
    data: [{ $: { "android:scheme": KAKAOTALK_SCHEME } }],
  });

  return androidManifest;
}

module.exports = function withKakaotalkQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults = addKakaotalkQuery(cfg.modResults);
    return cfg;
  });
};
