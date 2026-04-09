/**
 * v2: 같은 URL이 기존 FAILED ID를 반환하는 문제 우회.
 * - youtube_url에 `&t={n}` 추가해서 서버가 새 ID 발급하게 함
 * - 토큰 만료 시 scripts/api.js의 reissue 로직 자동 호출
 * - 5초 throttle, 진행 폴링, 중간 저장
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TOKENS_FILE = path.join(os.homedir(), '.cheftory-cli/tokens.json');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.cheftories.com/api/v1';
const THEMES_PATH = path.resolve('assets/data/themes.json');
const RESULTS_PATH = path.resolve('scripts/curation/check-results.json');

const THROTTLE_MS = 4000;
const POLL_INTERVAL_MS = 5000;
const POLL_MAX = 30; // 150초

// ─── 토큰 관리 (api.js 재구현) ───

function loadTokens() {
  return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
}
function saveTokens(access, refresh) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify({
    access_token: access, refresh_token: refresh, saved_at: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });
}
function isJwtExpired(token) {
  try {
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    const payload = raw.split('.')[1];
    if (!payload) return true;
    const json = JSON.parse(Buffer.from(payload, 'base64').toString());
    return !json.exp || json.exp * 1000 < Date.now() + 60_000;
  } catch { return true; }
}
async function reissue() {
  const tokens = loadTokens();
  const res = await fetch(`${API_URL}/auth/token/reissue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });
  if (!res.ok) throw new Error(`reissue ${res.status}`);
  const data = await res.json();
  saveTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

let cachedToken = null;
async function getToken() {
  if (!cachedToken) {
    const tokens = loadTokens();
    cachedToken = tokens.access_token;
  }
  if (isJwtExpired(cachedToken)) {
    cachedToken = await reissue();
    console.log('  [auth] token refreshed');
  }
  return cachedToken.startsWith('Bearer ') ? cachedToken : `Bearer ${cachedToken}`;
}

async function authedFetch(url, init = {}) {
  let token = await getToken();
  let res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: token, Accept: 'application/json' },
  });
  if (res.status === 401) {
    cachedToken = await reissue();
    console.log('  [auth] 401 → refreshed');
    token = cachedToken.startsWith('Bearer ') ? cachedToken : `Bearer ${cachedToken}`;
    res = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: token, Accept: 'application/json' },
    });
  }
  return res;
}

// ─── API ───

async function createRecipe(videoUrl) {
  const res = await authedFetch(`${API_URL}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: videoUrl, videoUrl }),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`POST ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data.recipe_id ?? data.recipeId;
}

async function fetchProgress(recipeId) {
  const res = await authedFetch(`${API_URL}/recipes/progress/${recipeId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.recipe_status ?? data.recipeStatus ?? null;
}

async function pollUntilDone(recipeId) {
  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const status = await fetchProgress(recipeId);
    if (status === 'SUCCESS') return 'SUCCESS';
    if (status === 'FAILED' || status === 'BLOCKED' || status === 'BANNED') return status;
  }
  return 'TIMEOUT';
}

// URL에 `&t={n}` 또는 `?t={n}` 추가해서 서버가 새 ID 발급하게 우회
function bustUrl(url, n) {
  return url.includes('?') ? `${url}&t=${n}` : `${url}?t=${n}`;
}

(async () => {
  const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
  const fails = results.fail.filter(f => f.youtube_url);
  console.log(`재생성 대상 ${fails.length}개\n`);

  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  fs.writeFileSync(THEMES_PATH + '.before-regen-v2', fs.readFileSync(THEMES_PATH));

  const newOk = [];
  const stillFail = [];
  // 시작 시각으로 t 시드 (각 호출마다 +1)
  let t = Math.floor(Date.now() / 1000) % 100000;

  for (let i = 0; i < fails.length; i++) {
    const f = fails[i];
    const tag = `[${i + 1}/${fails.length}] ${f.themeId}/${f.dishId}`;
    process.stdout.write(`${tag} ... `);
    try {
      const bustedUrl = bustUrl(f.youtube_url, t++);
      const newRecipeId = await createRecipe(bustedUrl);
      // 같은 ID 반환되면 우회 실패
      if (newRecipeId === f.recipeId) {
        stillFail.push({ ...f, reason: 'same id returned' });
        console.log(`❌ same id`);
        await new Promise(r => setTimeout(r, THROTTLE_MS));
        continue;
      }
      const status = await pollUntilDone(newRecipeId);
      if (status === 'SUCCESS') {
        const theme = themes.themes.find(t => t.id === f.themeId);
        const dish = theme?.dishes.find(d => d.id === f.dishId);
        if (dish) dish.recipe_id = newRecipeId;
        newOk.push({ ...f, newRecipeId });
        console.log(`✅ ${newRecipeId}`);
      } else {
        stillFail.push({ ...f, newRecipeId, status });
        console.log(`❌ ${status} (${newRecipeId})`);
      }
    } catch (e) {
      stillFail.push({ ...f, error: e.message });
      console.log(`❌ ${e.message.slice(0, 80)}`);
    }
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
      console.log(`  💾 중간 저장 (${i + 1}/${fails.length})`);
    }
    await new Promise(r => setTimeout(r, THROTTLE_MS));
  }

  fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
  fs.writeFileSync('scripts/curation/regen-results-v2.json', JSON.stringify({ ok: newOk, fail: stillFail }, null, 2));

  console.log(`\n=== 완료 ===`);
  console.log(`✅ 성공: ${newOk.length}/${fails.length}`);
  console.log(`❌ 실패: ${stillFail.length}`);
})();
