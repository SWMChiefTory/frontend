/**
 * 모든 테마/카테고리의 dish 이름 + URL 출력.
 * 사용자가 외부에서 레시피 생성 후 id 매핑을 받아오기 위한 카탈로그.
 *
 * 출력: scripts/curation/output-v2/all-dishes.txt (사람이 읽기 좋은 형태)
 *      scripts/curation/output-v2/all-dishes.json (id-url 맵)
 */

import fs from 'node:fs';
import path from 'node:path';

const THEMES_PATH = path.resolve('assets/data/themes.json');
const OUT_DIR = path.resolve('scripts/curation/output-v2');
fs.mkdirSync(OUT_DIR, { recursive: true });

const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));

const lines = [];
const flat = [];

for (const theme of themes.themes) {
  lines.push('');
  lines.push('═'.repeat(70));
  lines.push(`▶ ${theme.id} | ${theme.title} (${theme.dishes.length}개)`);
  lines.push('═'.repeat(70));

  // 카테고리 있으면 카테고리별 그룹핑
  if (theme.categories && theme.categories.length) {
    for (const cat of theme.categories) {
      const catDishes = theme.dishes.filter(d => d.category === cat.id);
      lines.push('');
      lines.push(`  ── ${cat.emoji} ${cat.name} (${cat.id}) — ${catDishes.length}개`);
      lines.push('');
      for (const d of catDishes) {
        const name = d.dish_name || d.title.slice(0, 40);
        const recipeId = d.recipe_id ? ` [recipe:${d.recipe_id}]` : '';
        lines.push(`  ${d.id}  ${name}${recipeId}`);
        lines.push(`         ${d.youtube_url}`);
        flat.push({ themeId: theme.id, categoryId: cat.id, dishId: d.id, name, url: d.youtube_url, recipe_id: d.recipe_id || null });
      }
    }
  } else {
    lines.push('');
    for (const d of theme.dishes) {
      const name = d.dish_name || d.title.slice(0, 40);
      const recipeId = d.recipe_id ? ` [recipe:${d.recipe_id}]` : '';
      lines.push(`  ${d.id}  ${name}${recipeId}`);
      lines.push(`         ${d.youtube_url}`);
      flat.push({ themeId: theme.id, categoryId: null, dishId: d.id, name, url: d.youtube_url, recipe_id: d.recipe_id || null });
    }
  }
}

const totalDishes = flat.length;
const withRecipe = flat.filter(d => d.recipe_id).length;

lines.push('');
lines.push('═'.repeat(70));
lines.push(`총 ${totalDishes}개 dish (recipe_id 매핑됨: ${withRecipe}개)`);
lines.push('═'.repeat(70));

const txtPath = path.join(OUT_DIR, 'all-dishes.txt');
const jsonPath = path.join(OUT_DIR, 'all-dishes.json');
fs.writeFileSync(txtPath, lines.join('\n'));
fs.writeFileSync(jsonPath, JSON.stringify(flat, null, 2));

console.log(lines.join('\n'));
console.log(`\n저장: ${txtPath}`);
console.log(`      ${jsonPath}`);
