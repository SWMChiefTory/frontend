/**
 * output-v2의 6개 카테고리 dish를 themes.json의 love-meal 테마로 머지.
 *
 * - love-meal 테마의 dishes 배열을 새 데이터로 교체
 * - love-meal 테마의 categories 필드 신설
 * - 각 dish에 category 필드 부착
 * - 기존 hook/why_recommended/tags 유지 (output-v2 데이터)
 *
 * 실행: node scripts/curation/merge-into-themes.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const THEMES_PATH = path.resolve('assets/data/themes.json');
const V2_DIR = path.resolve('scripts/curation/output-v2');

const CATEGORY_ORDER = ['boyfriend', 'girlfriend', 'first-date', 'home-invite', 'cook-together', 'lunchbox'];

const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));

// 카테고리 메타 수집
const categories = [];
const allDishes = [];

for (const catId of CATEGORY_ORDER) {
  const fp = path.join(V2_DIR, `${catId}.json`);
  if (!fs.existsSync(fp)) {
    console.warn(`⚠️  ${catId}.json 없음, 스킵`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  categories.push({
    id: data.category_id,
    name: data.category_name,
    emoji: data.category_emoji,
    concept: data.concept,
  });

  data.dishes.forEach((d, i) => {
    allDishes.push({
      id: d.id,
      title: d.title,
      channel: d.channel,
      youtube_url: d.youtube_url,
      estimated_duration: d.estimated_duration,
      thumbnail: d.thumbnail,
      tags: d.tags,
      why_recommended: d.why_recommended,
      hook: d.hook,
      is_curator_pick: d.is_curator_pick,
      category: data.category_id,
    });
  });
}

// love-meal 테마 찾기
const loveMealIdx = themes.themes.findIndex((t) => t.id === 'love-meal');
if (loveMealIdx === -1) {
  console.error('love-meal 테마를 찾을 수 없습니다');
  process.exit(1);
}

const loveMeal = themes.themes[loveMealIdx];
loveMeal.categories = categories;
loveMeal.dishes = allDishes;
// 부제 업데이트
loveMeal.subtitle = '연인을 위한 6가지 큐레이션';

themes.themes[loveMealIdx] = loveMeal;

// 백업 후 저장
fs.writeFileSync(THEMES_PATH + '.bak', fs.readFileSync(THEMES_PATH));
fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));

console.log(`✅ themes.json 머지 완료`);
console.log(`   카테고리: ${categories.length}개`);
console.log(`   dish: ${allDishes.length}개`);
console.log(`   백업: ${THEMES_PATH}.bak`);
