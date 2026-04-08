/**
 * Metro 콘솔 로그에서 [CURATION-MAP] 라인을 파싱해 themes.json에 recipe_id 적용.
 *
 * 입력 형식 (stdin 또는 파일):
 *   [CURATION-MAP] "https://www.youtube.com/watch?v=AK4xHHnOHMQ" → "recipe-uuid-1"
 *   ... 한 줄 한 매핑
 *
 * 또는 단순 형식 (URL → recipe_id) 도 지원:
 *   https://www.youtube.com/watch?v=AK4xHHnOHMQ recipe-uuid-1
 *
 * 사용법:
 *   pbpaste | node scripts/curation/apply-from-curation-log.mjs   # 클립보드에서
 *   node scripts/curation/apply-from-curation-log.mjs logs.txt    # 파일에서
 *
 * URL을 키로 dish 매칭하므로 dish_id 따로 알 필요 없음.
 */

import fs from 'node:fs';
import path from 'node:path';

const THEMES_PATH = path.resolve('assets/data/themes.json');

// 입력 읽기
let input = '';
if (process.argv[2] && fs.existsSync(process.argv[2])) {
  input = fs.readFileSync(process.argv[2], 'utf-8');
} else {
  input = fs.readFileSync(0, 'utf-8'); // stdin
}

// [CURATION-MAP] "url" → "recipeId" 패턴
const RE_FANCY = /\[CURATION-MAP\]\s*"([^"]+)"\s*→\s*"([^"]+)"/g;
// 또는 단순 url<공백>recipeId
const RE_SIMPLE = /^(https?:\/\/[^\s]+)\s+([a-zA-Z0-9_-]+)$/gm;

const mapping = {}; // url → recipe_id

let m;
while ((m = RE_FANCY.exec(input)) !== null) {
  mapping[m[1]] = m[2];
}
RE_SIMPLE.lastIndex = 0;
while ((m = RE_SIMPLE.exec(input)) !== null) {
  if (!mapping[m[1]]) mapping[m[1]] = m[2];
}

if (Object.keys(mapping).length === 0) {
  console.error('매핑을 찾지 못했습니다. 입력 형식 확인:');
  console.error('  [CURATION-MAP] "url" → "recipeId"');
  console.error('  또는');
  console.error('  https://www.youtube.com/watch?v=ID recipeId');
  process.exit(1);
}

console.log(`매핑 ${Object.keys(mapping).length}개 파싱됨`);

// video_id 정규화 (URL이 살짝 달라도 video_id로 매칭)
function videoIdOf(url) {
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})|youtu\.be\/([a-zA-Z0-9_-]{11})|shorts\/([a-zA-Z0-9_-]{11})/);
  return m ? (m[1] || m[2] || m[3]) : null;
}

const videoIdToRecipeId = {};
for (const [url, rid] of Object.entries(mapping)) {
  const vid = videoIdOf(url);
  if (vid) videoIdToRecipeId[vid] = rid;
}

const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
fs.writeFileSync(THEMES_PATH + '.before-curation-log', fs.readFileSync(THEMES_PATH));

let applied = 0;
const matched = new Set();
const notMatched = [];

for (const theme of themes.themes) {
  for (const dish of theme.dishes) {
    const vid = videoIdOf(dish.youtube_url);
    if (!vid) continue;
    if (videoIdToRecipeId[vid]) {
      dish.recipe_id = videoIdToRecipeId[vid];
      applied++;
      matched.add(vid);
      console.log(`  ✅ ${theme.id}/${dish.id} (${dish.dish_name || dish.title.slice(0, 30)}) → ${dish.recipe_id}`);
    }
  }
}

// 매칭 안 된 매핑 찾기
for (const [vid, rid] of Object.entries(videoIdToRecipeId)) {
  if (!matched.has(vid)) {
    notMatched.push({ video_id: vid, recipe_id: rid });
  }
}

fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));

console.log(`\n적용: ${applied} dish`);
if (notMatched.length) {
  console.log(`\n매칭 실패 (themes.json에 해당 영상 없음):`);
  notMatched.forEach(x => console.log(`  - video_id=${x.video_id} recipe_id=${x.recipe_id}`));
}
