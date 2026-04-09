/**
 * 야식 테마의 기존 44개 dish를 5개 카테고리로 분류 + dish_name/hook/why 재작성.
 *
 * Gemini 1회 호출로 처리:
 * - 입력: 44개 dish의 channel + title
 * - 출력: 각 dish의 category 할당 + dish_name + hook + why_recommended
 *
 * 실행: GEMINI_API_KEY=... node scripts/curation/categorize-night-snack.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }

const MODEL = process.env.MODEL || 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const THEMES_PATH = path.resolve('assets/data/themes.json');

// ─── 야식 카테고리 정의 (5개) ───

const NIGHT_CATEGORIES = [
  {
    id: 'drinking',
    name: '술 한잔에',
    emoji: '🍺',
    concept: '맥주·소주·하이볼 한 잔이 절로 생각나는 술안주. 손쉽게 만들고, 짭조름하고 자극적인 맛이 핵심.',
  },
  {
    id: 'ramen-hack',
    name: '라면 변신',
    emoji: '🍜',
    concept: '봉지 라면을 5분 만에 새로운 한 그릇으로 바꾸는 변형 레시피. 야식의 정석.',
  },
  {
    id: 'spicy-stress',
    name: '매콤 폭발',
    emoji: '🌶️',
    concept: '하루 스트레스 한 방에 풀어주는 매운맛. 떡볶이, 불닭, 매운 면 류.',
  },
  {
    id: 'guilt-free',
    name: '죄책감 0%',
    emoji: '🥑',
    concept: '다이어트 중에도 마음 편하게 먹는 가벼운 야식. 두부, 곤약, 오트밀, 단호박, 닭가슴살.',
  },
  {
    id: 'guilty-pleasure',
    name: '길티 플레저',
    emoji: '🧀',
    concept: '내일은 운동! 오늘 밤은 진하게 가는 치즈·튀김·피자·치킨 야식. 죄책감은 내일.',
  },
];

const SYSTEM_INSTRUCTION = `너는 ChefTory(한국 레시피 큐레이션 앱)의 카피라이터다. 사용자(요리하는 사람)가 "이거 만들어줘야겠다"고 마음먹게 만드는 설득 카피를 쓰는 게 너의 역할이다.

규칙:
1. **타겟 관점이 아닌 사용자 관점에서 써라.** 야식의 사용자 = "지금 배고프고 입이 심심한 나 자신". 자기 자신을 설득하는 톤.
2. **직관적·구체적·즉각적이어야 한다.** 시적·은유 금지.
3. **야식의 진짜 니즈:** 늦은 밤·배고픔·스트레스·외로움·해방감·해장·맥주 한 잔.
4. 영상 제목·채널 보고 가장 적합한 카테고리 1개에 정확히 분류.

⚠️ **다양성이 매우 중요하다 (최우선 규칙):**
- 같은 카테고리 안 dish들이 비슷한 패턴이면 안 된다.
- 모든 hook이 같은 단어 시작 금지.
- 다양한 시작: 형용사 ("바삭한 한 입"), 결과 ("5분이면 끝"), 감탄 ("이게 라면이라고?"), 비유 ("편의점 부럽지 않은"), 동사 ("새벽에 끓여요"), 상황 ("야근 끝, 한 그릇"), 숫자 ("재료 3개로"), 반문 ("이 시간에 안 먹을 수가?")
- hook과 why는 완전히 다른 표현/관점/구조.
- 같은 단어 카테고리 안에서 2회 이상 금지.

각 dish마다 4개 필드:
- **category**: "drinking" | "ramen-hack" | "spicy-stress" | "guilt-free" | "guilty-pleasure"
- **dish_name** (4~10자, 짧은 요리명)
- **hook** (12~22자, 인용 형태 캐치프레이즈)
- **why_recommended** (반드시 25자 이내 1문장)

카테고리 정의:
- drinking 🍺 술 한잔에: 짭조름·자극적·맥주/소주 안주
- ramen-hack 🍜 라면 변신: 봉지 라면 변형, 5분 야식
- spicy-stress 🌶️ 매콤 폭발: 매운맛, 떡볶이, 불닭, 스트레스 해소
- guilt-free 🥑 죄책감 0%: 다이어트, 두부/곤약/오트밀/단호박
- guilty-pleasure 🧀 길티 플레저: 치즈/튀김/피자/치킨, 죄책감

출력 형식: JSON 배열만, dish id 순서대로:
[
  { "id": "ns-1", "category": "ramen-hack", "dish_name": "신라면 볶음밥", "hook": "라면이 볶음밥으로 변신!", "why_recommended": "5분이면 새벽 배고픔 끝" },
  ...
]`;

async function callGemini(dishes) {
  const dishList = dishes.map((d) => `${d.id} | ${d.channel.slice(0, 20)} | ${d.title.slice(0, 60)}`).join('\n');

  const prompt = `다음 야식 dish 44개를 5개 카테고리로 분류하고, 각각의 dish_name/hook/why_recommended를 작성해줘.

dish 목록:
${dishList}

카테고리는 위 시스템 지시사항에 정의된 5개 중 하나로만. JSON 배열만 응답. id는 그대로 유지.`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 16384 },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 503) {
      console.log(`  503 retry in 35s (${attempt + 1})`);
      await new Promise(r => setTimeout(r, 35000));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  }
  throw new Error('Gemini 503 max retries');
}

function extractJsonArray(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').replace(/^```\s*/i, '').trim();
  const s = cleaned.indexOf('[');
  const e = cleaned.lastIndexOf(']');
  if (s === -1 || e === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

(async () => {
  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  const ns = themes.themes.find(t => t.id === 'night-snack');
  if (!ns) { console.error('night-snack 없음'); process.exit(1); }

  // dish에 임시 id 부여 (없으면)
  ns.dishes.forEach((d, i) => { if (!d.id) d.id = `ns-${i + 1}`; });

  console.log(`night-snack ${ns.dishes.length}개 dish 분류·재작성...`);
  const data = await callGemini(ns.dishes);
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ?? '';
  const updates = extractJsonArray(text);
  if (!updates) {
    console.error('JSON 파싱 실패. raw:');
    console.error(text.slice(0, 500));
    fs.writeFileSync('scripts/curation/night-snack-RAW.txt', text);
    process.exit(1);
  }

  // 백업
  fs.writeFileSync(THEMES_PATH + '.night-bak', fs.readFileSync(THEMES_PATH));

  // categories 부착
  ns.categories = NIGHT_CATEGORIES;
  ns.subtitle = '야식 5가지 큐레이션';

  // dishes 업데이트
  let applied = 0;
  const counts = {};
  for (const u of updates) {
    const dish = ns.dishes.find(d => d.id === u.id);
    if (!dish) continue;
    if (u.category) dish.category = u.category;
    if (u.dish_name) dish.dish_name = u.dish_name;
    if (u.hook) dish.hook = u.hook;
    if (u.why_recommended) dish.why_recommended = u.why_recommended;
    counts[u.category] = (counts[u.category] || 0) + 1;
    applied++;
  }

  fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));

  console.log(`\n✅ ${applied}/${ns.dishes.length} dish 적용`);
  console.log('카테고리 분포:');
  for (const cat of NIGHT_CATEGORIES) {
    console.log(`  ${cat.emoji} ${cat.name}: ${counts[cat.id] || 0}개`);
  }

  // 미분류 dish 찾기
  const uncategorized = ns.dishes.filter(d => !d.category);
  if (uncategorized.length) {
    console.log(`\n⚠️  미분류 ${uncategorized.length}개:`);
    uncategorized.forEach(d => console.log(`  - ${d.id}: ${d.title.slice(0, 50)}`));
  }
})();
