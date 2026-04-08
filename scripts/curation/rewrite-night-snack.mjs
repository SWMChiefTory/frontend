/**
 * 야식 카테고리별 dish_name/hook/why_recommended 재작성.
 * 야식의 타겟은 "사용자 본인" — 자기 자신을 설득하는 톤.
 */

import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }

const MODEL = process.env.MODEL || 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const THEMES_PATH = path.resolve('assets/data/themes.json');

const CAT_TONE = {
  classic: {
    label: '클래식 야식',
    needs: ['든든하고 자극적', '한국인이 사랑하는 정석', '냉장고 재료 활용', '5~15분 안에 완성'],
    appealHints: ['든든', '뚝딱', '집밥의 정석', '한국인 정수', '눈 감고 만드는'],
  },
  'quick-3': {
    label: '3재료 5분',
    needs: ['재료 거의 없이', '5분 안에 끝', '자취생도 가능', '설거지 최소'],
    appealHints: ['재료 3개', '5분 컷', '귀찮은 날의 정답', '냄비 하나로'],
  },
  'guilt-free': {
    label: '죄책감 ZERO 다이어트 야식',
    needs: ['칼로리 부담 X', '두부·곤약·오트밀·단호박', '맛은 살리고 가볍게', '다이어트 중 야식 욕구 해결'],
    appealHints: ['죄책감 0', '칼로리 안녕', '다이어트 보상', '먹어도 가벼운'],
  },
  'ramen-mod': {
    label: '라면 모디파이',
    needs: ['봉지 라면 한 봉지', '5분 변형', '치즈·마라·매콤·꿀조합', '평범한 라면을 새로운 맛으로'],
    appealHints: ['라면이 이렇게', '봉지 라면 변신', '한 봉지 마법', '5분 마법'],
  },
  'cvs-combo': {
    label: '편의점 꿀조합',
    needs: ['편의점만으로', '가성비', '즉흥적 꿀조합', '집에 오자마자 끝나는'],
    appealHints: ['편의점 갓생', '뜻밖의 조합', '6천원 만찬', '계산대 직행'],
  },
  guilty: {
    label: '길티 플레저 치킨/피자',
    needs: ['치즈·튀김·기름', '주말 밤 폭주', '배달 안 시키고 집에서', '죄책감 잊고 폭발'],
    appealHints: ['죄책감은 내일', '집에서 갓튀김', '배달비 0원', '폭주 시작'],
  },
};

const SYSTEM_INSTRUCTION = `너는 ChefTory의 카피라이터다. 야식 카드의 카피를 쓴다.

야식의 타겟 = **사용자 본인**. 자기 자신을 설득하는 톤. ("이거 만들면 나 행복해질 거 같다")

규칙:
1. **직관적·구체적·즉각적.** 시적·은유 금지.
2. **다양성 최우선.** 같은 카테고리 안 dish들이 비슷한 패턴이면 안 된다.
   - 같은 단어 카테고리 안에서 2회 이상 금지
   - 다양한 시작: 형용사/숫자/감탄/동사/명사/반문/비유/상황
   - hook과 why는 완전히 다른 표현·관점·구조
3. 카테고리 톤에 맞추되 베끼지 마. appealHints는 영감일 뿐.

각 dish마다 3개 필드:
- **dish_name** (4~10자, 짧은 요리명)
- **hook** (12~22자, 인용 형태 캐치프레이즈)
- **why_recommended** (반드시 25자 이내 1문장)

출력: JSON 배열만, dish id 순서대로:
[
  { "id": "ns-1", "dish_name": "신라면 볶음밥", "hook": "라면 한 봉지의 신박한 변신", "why_recommended": "익숙한 맛이 새로워지는 순간" }
]`;

async function callGemini(catId, dishes) {
  const tone = CAT_TONE[catId];
  const dishList = dishes.map(d => `${d.id} | ${d.channel.slice(0, 20)} | ${d.title.slice(0, 60)}`).join('\n');

  const prompt = `카테고리: ${tone.label}

이 카테고리의 핵심 니즈:
${tone.needs.map(n => '- ' + n).join('\n')}

영감 키워드 (베끼지 말고 참고만):
${tone.appealHints.map(h => '- ' + h).join('\n')}

dish 목록 (${dishes.length}개):
${dishList}

각 dish의 dish_name/hook/why_recommended 작성. 다양성 최우선. JSON 배열만.`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 503) { await new Promise(r => setTimeout(r, 35000)); continue; }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  }
  throw new Error('Gemini 503 max retries');
}

function extractJsonArray(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').replace(/^```\s*/i, '').trim();
  const s = cleaned.indexOf('['); const e = cleaned.lastIndexOf(']');
  if (s === -1 || e === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

(async () => {
  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  const ns = themes.themes.find(t => t.id === 'night-snack');

  const byCat = {};
  for (const d of ns.dishes) {
    if (!d.category) continue;
    (byCat[d.category] ??= []).push(d);
  }

  fs.writeFileSync(THEMES_PATH + '.before-rewrite', fs.readFileSync(THEMES_PATH));

  for (const [cat, dishes] of Object.entries(byCat)) {
    console.log(`\n[${cat}] ${dishes.length}개...`);
    try {
      const data = await callGemini(cat, dishes);
      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ?? '';
      const updates = extractJsonArray(text);
      if (!updates) { console.error('  파싱 실패'); console.error(text.slice(0, 300)); continue; }
      let n = 0;
      for (const u of updates) {
        const dish = ns.dishes.find(d => d.id === u.id);
        if (!dish) continue;
        if (u.dish_name) dish.dish_name = u.dish_name;
        if (u.hook) dish.hook = u.hook;
        if (u.why_recommended) dish.why_recommended = u.why_recommended;
        n++;
        console.log(`  ✅ ${u.id}: ${u.dish_name} | ${u.hook}`);
      }
      console.log(`  → ${n}/${dishes.length}`);
    } catch (e) {
      console.error('  실패:', e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
  console.log('\n✅ 저장 완료');
})();
