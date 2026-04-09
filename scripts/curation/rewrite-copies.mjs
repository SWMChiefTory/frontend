/**
 * 사랑 한 끼 dish의 hook/why_recommended를 "타겟 니즈 설득 카피"로 재작성.
 *
 * 기존: 시적·은유적 ("버터가 토마토를 만나면 일이 벌어진다")
 * 신규: 직관적·설득적 ("여친이 인스타에 올리고 싶어 할 거예요")
 *
 * 입력: assets/data/themes.json의 love-meal 카테고리별 dish
 * 처리: 카테고리당 1회 Gemini 호출 (총 6회)
 * 출력: themes.json의 hook/why_recommended를 직접 업데이트 + 백업
 *
 * 실행: node scripts/curation/rewrite-copies.mjs
 *      ONLY=girlfriend node scripts/curation/rewrite-copies.mjs   # 단일 카테고리만
 */

import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }

const MODEL = process.env.MODEL || 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const ONLY = process.env.ONLY || null;

const THEMES_PATH = path.resolve('assets/data/themes.json');

// ─── 카테고리별 타겟 니즈 정의 ───

const TARGET_NEEDS = {
  boyfriend: {
    label: '남자친구',
    needs: [
      '양 많고 든든한 한 끼 (남자는 양이 중요)',
      '고기/면/매콤 등 자극적이고 만족감 높은 메뉴',
      '"이거 또 해줘" 소리 듣고 싶음',
      '회사에서 자랑하고 싶은 집밥',
      '술 안주로도 어울리면 더 좋음',
    ],
    appealExamples: [
      '"남친이 두 그릇 비울 거예요"',
      '"남친이 회사에서 자랑하고 다닐 메뉴"',
      '"이거 해주면 평생 못 잊어요"',
      '"남친 입맛 저격, 양도 푸짐"',
      '"맥주 한 잔이 절로 생각나는"',
    ],
  },
  girlfriend: {
    label: '여자친구',
    needs: [
      '예쁜 비주얼 — 사진/스토리에 올리고 싶은 한 접시',
      '플레이팅이 카페·레스토랑 같은 느낌',
      '"센스 있다"는 말을 듣고 싶음',
      '달콤하거나 사랑스러운 분위기',
      '많이 먹기보다 맛있게 먹는 한 끼',
    ],
    appealExamples: [
      '"여친이 인스타 스토리에 올릴 거예요"',
      '"사진부터 찍고 먹는 한 접시"',
      '"카페보다 예쁘다는 말 듣는 비주얼"',
      '"여친이 친구한테 자랑할 메뉴"',
      '"센스 있다는 말이 절로 나오는"',
    ],
  },
  'first-date': {
    label: '썸녀/썸남',
    needs: [
      '처음 해주는 거라 실패하면 안 됨',
      '30분 안에 끝내고 같이 시간 보내고 싶음',
      '재료 적고 부담 없어야 함',
      '적당히 예쁘면서 너무 거하지도 않음',
      '"요리 잘하네"라는 첫 인상 챙기기',
    ],
    appealExamples: [
      '"30분 만에 센스 챙기는 첫 요리"',
      '"실패 0%, 첫 인상 100%"',
      '"부담 없이 분위기 잡기 좋은"',
      '"썸녀가 다시 보게 만드는 한 접시"',
      '"처음인데 요리 잘한다는 말 들음"',
    ],
  },
  'home-invite': {
    label: '집들이 손님 (친구·연인·동료)',
    needs: [
      '한 상 차려서 뽐내고 싶음 — 호스트의 자존심',
      '여러 명을 한 번에 만족시키기',
      '와인이나 술과 잘 어울리는 메뉴',
      '비주얼 + 맛 둘 다 챙기기',
      '미리 준비해두고 손님 와서 데우기만',
    ],
    appealExamples: [
      '"한 상 차리면 박수가 터져요"',
      '"집들이의 인생 메뉴로 등극"',
      '"와인 한 잔과 완벽한 페어링"',
      '"호스트로서 자존심 세우는 메뉴"',
      '"손님이 레시피 물어볼 거예요"',
    ],
  },
  'cook-together': {
    label: '연인 (함께 만드는 데이트)',
    needs: [
      '만드는 과정 자체가 데이트',
      '재료 분담 / 손이 많이 가는 작업',
      '둘이서 호흡 맞추는 재미',
      '결과보다 추억이 남는 메뉴',
      '같이 사진 찍기 좋은 과정',
    ],
    appealExamples: [
      '"둘이 빚으면 더 맛있어요"',
      '"만드는 과정이 추억으로 남는"',
      '"재료 사러 가는 길부터 데이트"',
      '"손이 많이 가도 즐거운 메뉴"',
      '"같이 만든 우리만의 한 접시"',
    ],
  },
  lunchbox: {
    label: '출근하는 남자친구/남편',
    needs: [
      '식어도 맛있어야 함',
      '전날 밤 미리 준비 가능',
      '아침에 빨리 만들 수 있음',
      '점심 시간에 자랑하고 싶은 도시락',
      '영양·색감 균형',
      '"매일 챙겨주고 싶은" 정성',
    ],
    appealExamples: [
      '"점심 시간에 동료들이 부러워해요"',
      '"식어도 맛있는 든든한 한 끼"',
      '"전날 밤 10분이면 끝나는 도시락"',
      '"매일 챙겨주는 마음이 전해지는"',
      '"남친이 도시락통 깨끗이 비워와요"',
    ],
  },
};

// ─── Gemini 호출 ───

const SYSTEM_INSTRUCTION = `너는 ChefTory(한국 레시피 큐레이션 앱)의 카피라이터다. 사용자(요리하는 사람)가 "이거 만들어줘야겠다"고 마음먹게 만드는 설득 카피를 쓰는 게 너의 역할이다.

규칙:
1. **타겟 관점이 아닌 사용자 관점에서 써라.** "내가 이걸 만들면 ○○가 어떻게 좋아할지" 상상하게.
2. **직관적·구체적·즉각적이어야 한다.** 시적·은유 금지.
3. **타겟의 진짜 니즈를 정확히 짚어라.** (여친 → 인스타 비주얼, 남친 → 양과 만족감, 썸 → 첫 인상)
4. 절대 다른 카테고리 단어 섞지 마. (girlfriend에 "남친" 금지, boyfriend에 "여친" 금지)
5. 영상 제목·채널 보고 부적합하면 카피 작성 안 해도 됨 (skip).

⚠️ **다양성이 매우 중요하다 (최우선 규칙):**
- 같은 카테고리의 6~7개 dish가 절대 비슷한 패턴이면 안 된다.
- "여친이 ...", "남친이 ..." 식으로 모든 hook/why가 타겟 단어로 시작하면 안 된다. 30% 이하만 그렇게 시작하고, 나머지는 자유롭게 다른 구조로.
- 다양한 시작: 형용사 ("심쿵 유발 딸기 케이크"), 결과 ("3분 만에 카페 비주얼"), 감탄 ("이게 집에서 된다고?"), 비유 ("레스토랑이 부럽지 않은"), 동사 ("스토리에 박제될 한 컷"), 상황 ("주말 아침의 정석"), 숫자 ("재료 5개로 끝"), 명사 단독 ("우리집 인생 메뉴")
- hook과 why가 완전히 다른 표현/관점/구조여야 한다. hook이 결과면 why는 과정, hook이 형용사면 why는 결과.
- 같은 단어 (예: "스토리", "심쿵", "사진") 카테고리 안에서 2번 이상 쓰지 마.

각 dish마다 3개 필드 생성:
- **dish_name** (4~8자, 짧은 요리명. 영상 제목에서 핵심 메뉴만. 예: "딸기 케이크", "오므라이스", "감바스", "제육덮밥")
- **hook** (12~22자, 인용 형태로 보여질 캐치프레이즈)
- **why_recommended** (반드시 25자 이내 1문장)

좋은 hook 예시 (다양성):
- "심쿵 유발 딸기 케이크"  (형용사 시작)
- "이게 진짜 카페 그 맛"  (감탄 시작)
- "딱 30분, 인생 파스타"  (숫자 시작)
- "레스토랑이 부럽나요?"  (반문)
- "여친이 셰프냐고 물어요"  (타겟 시작 — 비율 적게)
- "한 입에 사르르 녹아요"  (감각)

좋은 why 예시 (다양성):
- "비주얼만 봐도 사진 각"
- "레시피 묻는 사람 많을 메뉴"
- "한 입 떠먹는 순간 표정 변함"
- "센스 있다는 칭찬 보장"

출력 형식: JSON 배열만, dish id 순서대로:
[
  { "id": "love-girlfriend-1", "dish_name": "딸기 케이크", "hook": "심쿵 유발 딸기 케이크", "why_recommended": "한 입 베어물면 표정 달라져요" },
  ...
]`;

async function callGemini(category, dishes) {
  const targetInfo = TARGET_NEEDS[category];
  if (!targetInfo) throw new Error(`Unknown category: ${category}`);

  const dishList = dishes.map((d, i) => `${i + 1}. id="${d.id}" / 채널: ${d.channel} / 제목: ${d.title}`).join('\n');

  const prompt = `카테고리: ${category} (${targetInfo.label}한테 해주는 요리)

${targetInfo.label}의 진짜 니즈:
${targetInfo.needs.map(n => '- ' + n).join('\n')}

좋은 카피 톤 예시:
${targetInfo.appealExamples.map(e => '- ' + e).join('\n')}

다음 ${dishes.length}개 dish 각각에 대해, 위 니즈와 톤에 맞는 hook과 why_recommended를 새로 써줘.
영상 제목과 채널을 참고해서, 실제 그 요리가 ${targetInfo.label}한테 줄 수 있는 가치를 구체적으로 짚어줘.

dish 목록:
${dishList}

각 dish의 id를 그대로 유지하고 hook/why만 새로 작성. JSON 배열만 응답.`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
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
    if (res.status === 429) {
      const txt = await res.text();
      throw new Error(`429 quota: ${txt.slice(0, 200)}`);
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
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

// ─── 메인 ───

(async () => {
  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  const loveMeal = themes.themes.find(t => t.id === 'love-meal');
  if (!loveMeal) { console.error('love-meal 없음'); process.exit(1); }

  // 카테고리별 그룹핑
  const byCat = {};
  for (const d of loveMeal.dishes) {
    if (!d.category) continue;
    if (ONLY && d.category !== ONLY) continue;
    (byCat[d.category] ??= []).push(d);
  }

  console.log(`카테고리 ${Object.keys(byCat).length}개, 총 dish ${Object.values(byCat).flat().length}개`);

  // 백업
  fs.writeFileSync(THEMES_PATH + '.copy-bak', fs.readFileSync(THEMES_PATH));

  for (const [cat, dishes] of Object.entries(byCat)) {
    console.log(`\n[${cat}] ${dishes.length}개 dish 카피 재작성...`);
    try {
      const data = await callGemini(cat, dishes);
      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ?? '';
      const updates = extractJsonArray(text);
      if (!updates) {
        console.error(`  JSON 파싱 실패. raw: ${text.slice(0, 200)}`);
        continue;
      }

      // 업데이트 적용
      let applied = 0;
      for (const u of updates) {
        const dish = loveMeal.dishes.find(d => d.id === u.id);
        if (!dish) continue;
        if (u.hook) dish.hook = u.hook;
        if (u.why_recommended) dish.why_recommended = u.why_recommended;
        if (u.dish_name) dish.dish_name = u.dish_name;
        applied++;
        console.log(`  ✅ [${u.id}] ${u.dish_name} | ${u.hook} | ${u.why_recommended}`);
      }
      console.log(`  → ${applied}/${dishes.length} 적용`);
    } catch (e) {
      console.error(`  실패: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  // 저장
  fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
  console.log(`\n✅ themes.json 저장 완료. 백업: ${THEMES_PATH}.copy-bak`);
})();
