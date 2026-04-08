/**
 * check-results.json의 FAIL dish들에 대해 POST /recipes 재호출 → 새 recipe_id 적용.
 *
 * - 5초 간격 throttle (서버 큐 과부하 방지)
 * - progress 폴링으로 SUCCESS/FAILED 확인 후 themes.json에 적용
 * - 또 실패한 건 별도 리포트
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TOKENS_FILE = path.join(os.homedir(), '.cheftory-cli/tokens.json');
const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
const accessToken = tokens.access_token.startsWith('Bearer ')
  ? tokens.access_token
  : `Bearer ${tokens.access_token}`;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.cheftories.com/api/v1';
const THEMES_PATH = path.resolve('assets/data/themes.json');
const RESULTS_PATH = path.resolve('scripts/curation/check-results.json');

const THROTTLE_MS = 4000;
const POLL_INTERVAL_MS = 3000;
const POLL_MAX = 25; // 75초

const headers = {
  Authorization: accessToken,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

async function createRecipe(videoUrl) {
  const res = await fetch(`${API_URL}/recipes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ video_url: videoUrl, videoUrl }),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`POST ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data.recipe_id ?? data.recipeId;
}

async function fetchProgress(recipeId) {
  const res = await fetch(`${API_URL}/recipes/progress/${recipeId}`, { headers });
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

(async () => {
  const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
  const fails = results.fail.filter(f => f.youtube_url);
  console.log(`재생성 대상 ${fails.length}개\n`);

  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  fs.writeFileSync(THEMES_PATH + '.before-regen', fs.readFileSync(THEMES_PATH));

  const newOk = [];
  const stillFail = [];

  for (let i = 0; i < fails.length; i++) {
    const f = fails[i];
    const tag = `[${i + 1}/${fails.length}] ${f.themeId}/${f.dishId}`;
    process.stdout.write(`${tag} ... `);
    try {
      const newRecipeId = await createRecipe(f.youtube_url);
      const status = await pollUntilDone(newRecipeId);
      if (status === 'SUCCESS') {
        // themes.json 갱신
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
    // 중간 저장
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
    }
    await new Promise(r => setTimeout(r, THROTTLE_MS));
  }

  fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
  fs.writeFileSync('scripts/curation/regen-results.json', JSON.stringify({ ok: newOk, fail: stillFail }, null, 2));

  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${newOk.length}/${fails.length}`);
  console.log(`실패: ${stillFail.length}`);
})();
