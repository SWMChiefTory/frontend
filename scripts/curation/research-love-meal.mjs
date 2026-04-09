/**
 * 사랑 한 끼 테마 — 5개 카테고리별 레시피 큐레이션 조사
 *
 * Gemini 2.5 + Google Search grounding으로 YouTube 인기 레시피를 찾아
 * ChefTory dish 카드 스펙(JSON)으로 출력한다.
 *
 * 실행: node scripts/curation/research-love-meal.mjs
 * 결과: scripts/curation/output/love-meal-{category}.json
 */

import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const OUT_DIR = path.resolve('scripts/curation/output');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── 5개 카테고리 정의 ───

const CATEGORIES = [
  {
    id: 'boyfriend',
    name: '남친한테',
    emoji: '💪',
    concept: '양 많고 든든한 한 그릇. 푸짐·고기·면·매콤·자극적. 남자친구가 환장하는 메뉴.',
    keywords: [
      '소고기 덮밥', '규동', '김치 제육 덮밥', '버터간장 닭다리',
      '로제 떡볶이', '마라 비빔면', '차돌 된장찌개', '통삼겹 김치찜',
      '매운 갈비찜', '부대찌개', '데리야끼 치킨 덮밥', '스테이크 덮밥',
    ],
    appealHint: '"이거 해주면 남친이 두 그릇 비워요", "남자친구가 회사에서 자랑하고 다닌대요", "장어로 남친 쉿"',
  },
  {
    id: 'girlfriend',
    name: '여친한테',
    emoji: '💖',
    concept: '예쁘고 사랑스러운 한 접시. 비주얼·플레이팅·달콤. 사진부터 찍게 되는 요리.',
    keywords: [
      '데미글라스 오므라이스', '에그인헬', '샥슈카', '버섯 크림 리조또',
      '트러플 파스타', '리코타 치즈 샐러드', '프렌치토스트', '딸기 티라미수',
      '연어 포케볼', '부라타 카프레제', '브런치 플레이트', '딸기 케이크',
    ],
    appealHint: '"여친이 사진부터 찍어요", "이거 해주면 여친이 인스타에 자랑해요", "여친 입덕 보장"',
  },
  {
    id: 'first-date',
    name: '처음 한끼',
    emoji: '✨',
    concept: '썸타는 사람한테 처음 해주는 한 끼. 30분 이내, 재료 5개 이하, 실패 거의 없음, 적당히 예쁨, 부담 없음.',
    keywords: [
      '알리오올리오', '또띠아 마르게리타', '카프레제', '부르스케타',
      '레몬 크림 파스타', '명란 파스타', '새우 아보카도 토스트',
      '고르곤졸라 피자', '아보카도 토스트', '간단한 브런치',
    ],
    appealHint: '"30분, 실패 없는 첫 요리", "처음인데 센스 있다는 말 들음", "5재료로 분위기 잡기"',
  },
  {
    id: 'home-invite',
    name: '우리집 초대',
    emoji: '🍷',
    concept: '집에 초대해서 한 상 차리는 호스트 메뉴. 와인 페어링, 여러 접시 조합, 분위기 좋고 뽐낼 수 있는 요리.',
    keywords: [
      '홈파티 메뉴', '와인 안주 보드', '로스트 치킨', '소고기 타다끼',
      '퀘사디아', '라따뚜이', '라자냐', '집들이 메뉴', '연말 홈파티',
      '카프레제 타르트', '감바스', '치즈 플래터',
    ],
    appealHint: '"한 상 차리니 박수가 터졌어요", "집들이에서 인생 메뉴 등극", "와인 한 잔과 완벽 매치"',
  },
  {
    id: 'cook-together',
    name: '같이 만들기',
    emoji: '👫',
    concept: '둘이 함께 손이 많이 가는 메뉴. 재료 분담, 만드는 과정 자체가 데이트. 추억이 남는 요리.',
    keywords: [
      '수제 만두', '수제 피자 도우', '김밥', '떡볶이', '수제 햄버거',
      '마카롱', '수제 라비올리', '부리또', '딤섬', '샤브샤브',
      '핫팟', '찐만두', '호떡',
    ],
    appealHint: '"둘이 빚으면 더 맛있어요", "재료 사러 가는 길부터 데이트", "만드는 과정이 추억"',
  },
];

// ─── Gemini 호출 ───

const SYSTEM_INSTRUCTION = `너는 한국 요리 유튜브 큐레이터야. ChefTory(레시피 큐레이션 앱)의 "사랑 한 끼" 테마에 들어갈 레시피를 조사해.

반드시 다음 규칙을 지켜:
1. 실제로 존재하는 한국 유튜브 레시피 영상만 추천 (구글 검색으로 검증)
2. 조회수 50만 이상이거나 유명한 채널 우선 (백종원, 어남선생, 정호영, 고기남자, 이연복, 햄지, 승우아빠 등)
3. youtube_url은 반드시 정확한 watch URL (검색으로 확인). 모르면 channel과 title만 정확히 적고 url은 빈 문자열로
4. hook은 사람이 혹할 만한 한 줄 — 예: "남친이 두 그릇 비워요", "여친 입덕 보장", "처음인데 센스 있다는 말 들음"
5. why_recommended는 2문장, 왜 이 영상이 이 카테고리에 적합한지

출력은 반드시 JSON 배열만, 다른 텍스트 금지. 각 영상은 다음 스키마:
{
  "title": "영상 제목 (실제 영상과 동일)",
  "channel": "채널명",
  "youtube_url": "https://www.youtube.com/watch?v=XXXXXXXXXXX 또는 빈 문자열",
  "estimated_duration": "예: 8분",
  "hook": "혹할 한 줄 (15자 이내)",
  "why_recommended": "왜 이 카테고리에 적합한지 (2문장)",
  "tags": {
    "difficulty": "초보|중급|상급",
    "time": "10분|30분|1시간이상",
    "format": "쇼츠|숏폼|롱폼",
    "pairing": ["와인","맥주","소주","막걸리","하이볼","논알콜","없음"],
    "occasion": ["데이트","혼밥","홈파티","기념일","주말브런치","야식","평일저녁"],
    "style": ["한식","양식","일식","중식","이탈리안","프렌치","퓨전","디저트"],
    "ingredient_focus": ["고기","해산물","채소","면","밥","떡","빵","치즈","달걀"],
    "budget": "가성비|보통|프리미엄"
  },
  "is_curator_pick": true|false
}`;

async function researchCategory(category) {
  const prompt = `카테고리: ${category.emoji} ${category.name}
컨셉: ${category.concept}

후보 키워드 (참고용, 이것만 고집하지 말고 더 좋은 게 있으면 자유롭게 선택):
${category.keywords.join(', ')}

hook 어필 톤 예시: ${category.appealHint}

이 카테고리에 들어갈 레시피 영상 6개를 골라줘. 실제 한국 유튜브 인기 영상으로, 위 JSON 스키마 배열로만 응답.`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };

  console.log(`\n[${category.emoji} ${category.name}] 조사 시작...`);
  const t0 = Date.now();

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ?? '';

  // ```json fence 제거
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(/^```\s*/i, '')
    .trim();

  // JSON 배열 추출
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) {
    console.error(`[${category.name}] JSON 배열 찾기 실패. raw 저장.`);
    fs.writeFileSync(
      path.join(OUT_DIR, `love-meal-${category.id}-RAW.txt`),
      text,
    );
    return null;
  }

  let dishes;
  try {
    dishes = JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    console.error(`[${category.name}] JSON parse 실패:`, e.message);
    fs.writeFileSync(
      path.join(OUT_DIR, `love-meal-${category.id}-RAW.txt`),
      text,
    );
    return null;
  }

  // 카테고리 메타 부착
  const result = {
    category_id: category.id,
    category_name: category.name,
    category_emoji: category.emoji,
    concept: category.concept,
    dishes,
  };

  const outPath = path.join(OUT_DIR, `love-meal-${category.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[${category.emoji} ${category.name}] ${dishes.length}개 dish, ${dt}s → ${outPath}`);
  return result;
}

// ─── 실행 ───

(async () => {
  const all = [];
  for (const cat of CATEGORIES) {
    try {
      const r = await researchCategory(cat);
      if (r) all.push(r);
    } catch (e) {
      console.error(`[${cat.name}] 실패:`, e.message);
    }
    // 레이트 리밋 보호
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 종합 결과
  fs.writeFileSync(
    path.join(OUT_DIR, 'love-meal-all.json'),
    JSON.stringify(all, null, 2),
    'utf-8',
  );

  console.log(`\n✅ 완료. ${all.length}/${CATEGORIES.length} 카테고리 성공.`);
  console.log(`결과: ${OUT_DIR}/love-meal-all.json`);
})();
