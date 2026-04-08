/**
 * 사용자가 지정한 야식 카테고리 매핑을 정확히 적용.
 *
 * 6 카테고리:
 * 1. 🌙 기존 야식 (19): IDs 1~15, 17~20
 * 2. 🍳 재료 3개 5분 컷 (5): IDs 16, 21~24
 * 3. 🥗 죄책감 ZERO (5): IDs 25~29
 * 4. 🍜 라면 모디파이 (5): IDs 30~34
 * 5. 🏪 편의점 꿀조합 (5): IDs 35~39
 * 6. 🍗 길티 치킨/피자 (5): IDs 40~44
 */

import fs from 'node:fs';
import path from 'node:path';

const THEMES_PATH = path.resolve('assets/data/themes.json');

const CATEGORIES = [
  { id: 'classic',     name: '기존 야식',      emoji: '🌙', concept: '한국인이 사랑하는 야식의 정석. 든든하고 자극적이고 남는 재료로 뚝딱 만드는 클래식 야식 모음.' },
  { id: 'quick-3',     name: '3재료 5분',     emoji: '🍳', concept: '재료 3개, 시간 5분. 자취생도 새벽에 부담 없이 만드는 초간단 야식.' },
  { id: 'guilt-free',  name: '죄책감 0%',     emoji: '🥗', concept: '다이어트 중에도 마음 편하게. 두부·곤약·오트밀·단호박으로 만드는 가벼운 야식.' },
  { id: 'ramen-mod',   name: '라면 변신',     emoji: '🍜', concept: '봉지 라면 하나로 새로운 한 그릇. 5분 만에 끝나는 라면 모디파이.' },
  { id: 'cvs-combo',   name: '편의점 꿀조합', emoji: '🏪', concept: '편의점 갔다가 즉흥적으로 만드는 꿀조합. 가성비·간편함·중독성.' },
  { id: 'guilty',      name: '길티 치킨피자', emoji: '🍗', concept: '내일은 운동! 오늘 밤은 진하게 가는 치킨·피자·튀김. 죄책감은 내일.' },
];

// 1-indexed dish 위치 → category id
const ASSIGNMENT = {};
const set = (ids, cat) => { ids.forEach(i => { ASSIGNMENT[i] = cat; }); };
set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18,19,20], 'classic');
set([16,21,22,23,24], 'quick-3');
set([25,26,27,28,29], 'guilt-free');
set([30,31,32,33,34], 'ramen-mod');
set([35,36,37,38,39], 'cvs-combo');
set([40,41,42,43,44], 'guilty');

const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
const ns = themes.themes.find(t => t.id === 'night-snack');
if (!ns) { console.error('night-snack 없음'); process.exit(1); }

// 백업
fs.writeFileSync(THEMES_PATH + '.before-mapping', fs.readFileSync(THEMES_PATH));

ns.categories = CATEGORIES;
ns.subtitle = '오늘 밤, 천사도 악마도 만족시키는 야식';
ns.curator_quote = '오늘 밤, 천사도 악마도 만족시키는 야식';

// dish 인덱스로 카테고리 할당 (1-indexed)
let assigned = 0;
const counts = {};
ns.dishes.forEach((d, idx) => {
  const oneBased = idx + 1;
  const cat = ASSIGNMENT[oneBased];
  if (cat) {
    d.category = cat;
    counts[cat] = (counts[cat] || 0) + 1;
    assigned++;
  }
  // 안정적인 id 부여
  if (!d.id || d.id.startsWith('ns-')) d.id = `ns-${oneBased}`;
});

fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));

console.log(`✅ ${assigned}/${ns.dishes.length} dish 카테고리 할당`);
console.log('\n분포:');
for (const c of CATEGORIES) {
  console.log(`  ${c.emoji} ${c.name} (${c.id}): ${counts[c.id] || 0}개`);
}
