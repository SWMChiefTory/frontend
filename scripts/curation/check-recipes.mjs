/**
 * themes.json의 모든 dish.recipe_id를 서버에 GET해서 상태 검증.
 * FAILED/404/500 인 것들을 보고.
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

const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));

const results = { ok: [], fail: [] };

for (const theme of themes.themes) {
  for (const dish of theme.dishes) {
    if (!dish.recipe_id) continue;
    process.stdout.write(`${theme.id}/${dish.id} ... `);
    try {
      const res = await fetch(`${API_URL}/recipes/${dish.recipe_id}`, {
        headers: { Authorization: accessToken, Accept: 'application/json' },
      });
      if (res.ok) {
        console.log('✅');
        results.ok.push({ themeId: theme.id, dishId: dish.id, recipeId: dish.recipe_id });
      } else {
        const body = await res.text();
        let parsed = body;
        try { parsed = JSON.parse(body); } catch {}
        const code = parsed?.errorCode ?? res.status;
        console.log(`❌ ${res.status} ${code}`);
        results.fail.push({
          themeId: theme.id,
          dishId: dish.id,
          recipeId: dish.recipe_id,
          status: res.status,
          errorCode: parsed?.errorCode,
          title: dish.title,
          youtube_url: dish.youtube_url,
        });
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
      results.fail.push({ themeId: theme.id, dishId: dish.id, error: e.message });
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

fs.writeFileSync('scripts/curation/check-results.json', JSON.stringify(results, null, 2));
console.log(`\n=== 결과 ===`);
console.log(`OK   : ${results.ok.length}`);
console.log(`FAIL : ${results.fail.length}`);
console.log(`\nFAIL 상세:`);
const byCode = {};
results.fail.forEach(f => { byCode[f.errorCode || f.status] = (byCode[f.errorCode || f.status] || 0) + 1; });
console.log(byCode);
