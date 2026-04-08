/**
 * 사용자가 외부에서 레시피 생성 후 받은 (dish_id → recipe_id) 매핑을 themes.json에 적용.
 *
 * 입력 파일: scripts/curation/recipe-ids.json
 *   { "love-boyfriend-1": "recipe-uuid-1", "ns-2": "recipe-uuid-2", ... }
 *
 * 또는 stdin으로 JSON 받기.
 *
 * 실행:
 *   node scripts/curation/apply-recipe-ids.mjs
 *   또는
 *   echo '{"bt-1":"abc"}' | node scripts/curation/apply-recipe-ids.mjs -
 */

import fs from 'node:fs';
import path from 'node:path';

const THEMES_PATH = path.resolve('assets/data/themes.json');
const MAP_PATH = path.resolve('scripts/curation/recipe-ids.json');

let mapping = null;

if (process.argv[2] === '-') {
  // stdin
  mapping = JSON.parse(fs.readFileSync(0, 'utf-8'));
} else if (fs.existsSync(MAP_PATH)) {
  mapping = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));
} else {
  console.error(`매핑 파일 없음: ${MAP_PATH}`);
  console.error('형식: { "dish-id": "recipe-id", ... }');
  console.error('또는 stdin: echo \'{"bt-1":"abc"}\' | node scripts/curation/apply-recipe-ids.mjs -');
  process.exit(1);
}

const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
fs.writeFileSync(THEMES_PATH + '.before-recipe-ids', fs.readFileSync(THEMES_PATH));

let applied = 0;
let notFound = [];

for (const [dishId, recipeId] of Object.entries(mapping)) {
  let found = false;
  for (const theme of themes.themes) {
    const dish = theme.dishes.find(d => d.id === dishId);
    if (dish) {
      dish.recipe_id = recipeId;
      applied++;
      found = true;
      console.log(`  ✅ ${dishId} → ${recipeId}`);
      break;
    }
  }
  if (!found) notFound.push(dishId);
}

fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));

console.log(`\n적용: ${applied}/${Object.keys(mapping).length}`);
if (notFound.length) {
  console.log(`매칭 실패: ${notFound.length}개`);
  notFound.forEach(id => console.log(`  - ${id}`));
}
