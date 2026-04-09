/**
 * `[CURATION-MAP] {title} | {uuid}` 형식 로그를 파싱하여 themes.json의 dish.title과 매칭해 recipe_id 적용.
 *
 * title이 `|`을 포함할 수 있으므로 마지막 토큰만 uuid로 간주.
 *
 * 사용:
 *   node scripts/curation/apply-titles-uuid.mjs scripts/curation/curation-log.txt
 */

import fs from 'node:fs';
import path from 'node:path';

const THEMES_PATH = path.resolve('assets/data/themes.json');
const inputPath = process.argv[2] || 'scripts/curation/curation-log.txt';

if (!fs.existsSync(inputPath)) {
  console.error(`입력 파일 없음: ${inputPath}`);
  process.exit(1);
}

const text = fs.readFileSync(inputPath, 'utf-8');
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// 한 줄당 마지막 토큰이 uuid인 패턴
const titleToUuid = new Map();
for (const raw of text.split(/\r?\n/)) {
  if (!raw.includes('[CURATION-MAP]')) continue;
  const stripped = raw.replace(/^.*\[CURATION-MAP\]\s*/, '').trim();
  // 마지막 ' | uuid' 분리
  const lastPipe = stripped.lastIndexOf('|');
  if (lastPipe === -1) continue;
  const title = stripped.slice(0, lastPipe).trim();
  const uuid = stripped.slice(lastPipe + 1).trim();
  if (!UUID_RE.test(uuid)) continue;
  // 동일 title 여러 줄 → 첫 매핑 유지
  if (!titleToUuid.has(title)) titleToUuid.set(title, uuid);
}

console.log(`매핑 ${titleToUuid.size}개 파싱`);

const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
fs.writeFileSync(THEMES_PATH + '.before-titles', fs.readFileSync(THEMES_PATH));

let applied = 0;
const matchedTitles = new Set();
const missedDishes = [];

for (const theme of themes.themes) {
  for (const dish of theme.dishes) {
    const t = (dish.title || '').trim();
    if (titleToUuid.has(t)) {
      dish.recipe_id = titleToUuid.get(t);
      applied++;
      matchedTitles.add(t);
    } else {
      missedDishes.push({ themeId: theme.id, dishId: dish.id, title: t.slice(0, 60) });
    }
  }
}

const unusedMappings = [...titleToUuid.entries()].filter(([t]) => !matchedTitles.has(t));

fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));

console.log(`\n적용: ${applied} dish`);

if (missedDishes.length) {
  console.log(`\nrecipe_id 미할당 dish (${missedDishes.length}):`);
  missedDishes.forEach(d => console.log(`  - [${d.themeId}/${d.dishId}] ${d.title}`));
}

if (unusedMappings.length) {
  console.log(`\n매칭 안 된 매핑 (${unusedMappings.length}):`);
  unusedMappings.forEach(([t, u]) => console.log(`  - "${t.slice(0, 60)}" → ${u}`));
}
