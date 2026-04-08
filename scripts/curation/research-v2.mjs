/**
 * 사랑 한 끼 — v2 큐레이션 (검증된 워크플로우)
 *
 * v1의 실패 원인: Gemini 본문 텍스트의 youtube_url을 신뢰 → 30개 중 29개 hallucination.
 *
 * v2 변경:
 * 1. Gemini 호출 시 dish 스키마에서 youtube_url 제거 (모델이 추측 못 하게)
 * 2. groundingMetadata.groundingChunks의 redirect URL을 HEAD로 resolve → 진짜 youtube URL
 * 3. dish의 (channel + title) 키워드와 resolved URL의 oEmbed 메타를 매칭
 * 4. 매칭 실패 시 yt-dlp ytsearch1로 폴백
 * 5. oEmbed로 최종 검증 + thumbnail 확보
 * 6. 카테고리 톤 가이드 기반 hook 자동 검수 (girlfriend에 "남친" 단어 등)
 *
 * 실행: node scripts/curation/research-v2.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }

const MODEL = process.env.MODEL || 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const OUT_DIR = path.resolve('scripts/curation/output-v2');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── 카테고리 6개 (도시락 신규) ───

const CATEGORIES = [
  {
    id: 'boyfriend', name: '남친한테', emoji: '💪',
    concept: '양 많고 든든한 한 그릇. 푸짐·고기·면·매콤·자극적. 남자친구가 환장하는 메뉴.',
    seeds: ['백종원 제육덮밥', '고기남자 통삼겹 김치찜', '어남선생 규동', '이연복 비빔당면', '쿠킹하루 차돌된장찌개', '승우아빠 덮밥', '백종원 부대찌개', '고기남자 차돌박이'],
    hookTone: '남친이 좋아하는, 든든한, 푸짐한, 환장하는, 두 그릇',
    forbiddenInHook: ['여친', '여자친구', '인스타'],
  },
  {
    id: 'girlfriend', name: '여친한테', emoji: '💖',
    concept: '예쁘고 사랑스러운 한 접시. 비주얼·플레이팅·달콤. 사진부터 찍게 되는 요리.',
    seeds: ['백종원 오므라이스', '햄지 프렌치토스트', '아리키친 딸기 케이크', '승우아빠 트러플 파스타', '쿠킹트리 연어포케볼', '정호영 에그인헬', '꿀키 리조또', '꿀키 카프레제'],
    hookTone: '여친이 사진 찍는, 예쁜, 사랑스러운, 입덕, 디저트',
    forbiddenInHook: ['남친', '남자친구', '두 그릇', '환장'],
  },
  {
    id: 'first-date', name: '처음 한끼', emoji: '✨',
    concept: '썸타는 사람한테 처음 해주는 한 끼. 30분 이내, 재료 5개 이하, 실패 거의 없음, 부담 없음.',
    seeds: ['알리오올리오', '카프레제', '명란 파스타', '레몬 크림 파스타', '아보카도 토스트', '또띠아 마르게리타', '브런치 토스트', '부르스케타'],
    hookTone: '처음, 부담 없는, 30분, 실패 없는, 센스, 5재료',
    forbiddenInHook: ['남친 두 그릇', '환장'],
  },
  {
    id: 'home-invite', name: '우리집 초대', emoji: '🍷',
    concept: '집에 초대해서 한 상 차리는 호스트 메뉴. 와인 페어링, 여러 접시 조합, 분위기 좋고 뽐낼 수 있는 요리.',
    seeds: ['백종원 감바스', '고기남자 스테이크', '밀푀유나베', '류수영 감자뇨끼', '백종원 찹스테이크', '승우아빠 라자냐', '꿀키 라따뚜이', '백종원 로스트 치킨'],
    hookTone: '한 상, 박수, 호스트, 와인, 뽐내는, 집들이',
    forbiddenInHook: [],
  },
  {
    id: 'cook-together', name: '같이 만들기', emoji: '👫',
    concept: '둘이 함께 손이 많이 가는 메뉴. 재료 분담, 만드는 과정 자체가 데이트.',
    seeds: ['백종원 만두', '백종원 김밥', '승우아빠 수제버거', '이연복 딤섬', '햄지 떡볶이', '꿀키 마카롱', '수제 피자', '샤브샤브'],
    hookTone: '둘이, 같이, 빚는, 추억, 손맛, 과정',
    forbiddenInHook: ['혼자'],
  },
  {
    id: 'lunchbox', name: '출근 도시락', emoji: '🍱',
    concept: '남친이 출근할 때 챙겨주는 도시락. 전날 밤 준비 가능, 보온/식어도 맛있음, 색감 균형, 새벽에 빨리 만들 수 있는 메뉴.',
    seeds: ['도시락 반찬', '소불고기 도시락', '주먹밥 도시락', '닭다리 도시락', '키친마이야르 도시락', '햄지 도시락', '나물할매 도시락', '계란말이 도시락'],
    hookTone: '출근, 도시락, 새벽, 챙기는, 따뜻한, 식어도',
    forbiddenInHook: ['저녁', '밤'],
  },
];

// ─── Gemini 호출 ───

const SYSTEM_INSTRUCTION = `너는 한국 요리 유튜브 큐레이터다. ChefTory(레시피 큐레이션 앱)의 "사랑 한 끼" 테마에 들어갈 레시피 후보를 찾아라.

규칙:
1. 실제로 존재하는 한국 유튜브 인기 레시피 영상만 (구글 검색으로 검증)
2. 유명 채널 우선: 백종원, 어남선생(류수영), 정호영, 고기남자, 이연복, 햄지, 승우아빠, 꿀키, 쿠킹트리, 만개의레시피, 키친마이야르, 나물할매 등
3. **절대 youtube_url을 출력하지 마**. URL 추측 금지. 채널명과 영상 제목만 정확히.
4. hook은 카테고리 톤에 정확히 맞춰서 작성. 다른 카테고리 단어 섞지 말 것 (예: girlfriend 카테고리에 "남친" 단어 금지).
5. why_recommended는 2문장, 왜 이 영상이 이 카테고리에 적합한지.

출력은 JSON 배열만:
[
  {
    "channel": "정확한 채널명",
    "title": "영상 제목 (실제와 동일)",
    "search_query": "yt 검색용 짧은 쿼리 (채널 + 핵심 메뉴명, 예: '백종원 제육덮밥')",
    "hook": "혹할 한 줄 (15자 이내, 카테고리 톤 준수)",
    "why_recommended": "왜 이 카테고리에 적합한지 (2문장)",
    "tags": {
      "difficulty": "초보|중급|상급",
      "time": "10분|30분|1시간이상",
      "format": "쇼츠|숏폼|롱폼",
      "pairing": ["와인","맥주","소주","막걸리","하이볼","논알콜","없음"],
      "occasion": ["데이트","혼밥","홈파티","기념일","주말브런치","야식","도시락","평일저녁"],
      "style": ["한식","양식","일식","중식","이탈리안","프렌치","퓨전","디저트"],
      "ingredient_focus": ["고기","해산물","채소","면","밥","떡","빵","치즈","달걀"],
      "budget": "가성비|보통|프리미엄"
    },
    "is_curator_pick": true
  }
]`;

async function callGemini(category) {
  const prompt = `카테고리: ${category.emoji} ${category.name}
컨셉: ${category.concept}

후보 시드 (참고용, 더 좋은 게 있으면 자유롭게):
${category.seeds.join(', ')}

hook 톤 가이드: ${category.hookTone}
hook 금지 단어: ${category.forbiddenInHook.join(', ') || '없음'}

이 카테고리에 들어갈 영상 7개를 골라줘. URL은 출력하지 말고 채널/제목/search_query만 정확히. JSON 배열만 응답.`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 503) {
      console.log(`  503 retry in 35s (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, 35000));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return await res.json();
  }
  throw new Error('Gemini 503 max retries');
}

function extractJsonArray(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const s = cleaned.indexOf('[');
  const e = cleaned.lastIndexOf(']');
  if (s === -1 || e === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

// ─── URL resolve ───

async function resolveRedirect(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    const loc = res.headers.get('location');
    if (loc && loc.includes('youtube.com/watch')) {
      const m = loc.match(/v=([a-zA-Z0-9_-]{11})/);
      return m ? `https://www.youtube.com/watch?v=${m[1]}` : null;
    }
    return null;
  } catch { return null; }
}

async function oembedVerify(url) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (r.status !== 200) return null;
    const j = await r.json();
    return { title: j.title, channel: j.author_name, thumbnail: j.thumbnail_url };
  } catch { return null; }
}

function ytdlpSearch(query) {
  const r = spawnSync('yt-dlp', [
    `ytsearch1:${query}`,
    '--print', '%(id)s|%(title)s|%(channel)s|%(duration_string)s',
    '--no-warnings', '--skip-download',
  ], { encoding: 'utf-8', timeout: 60000 });
  const line = (r.stdout || '').trim().split('\n').filter(l => l.includes('|'))[0];
  if (!line) return null;
  const [id, title, channel, duration] = line.split('|');
  if (!id || id.length !== 11) return null;
  return {
    youtube_url: `https://www.youtube.com/watch?v=${id}`,
    title, channel, estimated_duration: duration || '',
  };
}

// ─── 매칭: dish의 search_query/title/channel을 resolved URL과 매칭 ───

function fuzzyMatch(haystack, needle) {
  if (!haystack || !needle) return 0;
  const h = haystack.toLowerCase();
  const tokens = needle.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  if (!tokens.length) return 0;
  return tokens.filter(t => h.includes(t)).length / tokens.length;
}

async function pickBestUrl(dish, resolvedPool) {
  const query = `${dish.channel} ${dish.title}`;
  let best = null;
  let bestScore = 0;
  for (const r of resolvedPool) {
    const meta = await oembedVerify(r);
    if (!meta) continue;
    const titleScore = fuzzyMatch(meta.title, dish.title) + fuzzyMatch(meta.title, dish.search_query || '');
    const chScore = fuzzyMatch(meta.channel, dish.channel) * 1.5;
    const score = titleScore + chScore;
    if (score > bestScore) {
      bestScore = score;
      best = { url: r, meta };
    }
  }
  return bestScore >= 1.0 ? best : null;
}

// ─── hook 검수 ───

function checkHook(hook, category) {
  for (const word of category.forbiddenInHook) {
    if (hook.includes(word)) return false;
  }
  return true;
}

// ─── 메인 ───

async function processCategory(cat) {
  console.log(`\n[${cat.emoji} ${cat.name}] Gemini 호출...`);
  const t0 = Date.now();
  const data = await callGemini(cat);
  const c = data.candidates?.[0];
  const text = c?.content?.parts?.map(p => p.text).join('\n') ?? '';
  const dishes = extractJsonArray(text);
  if (!dishes) {
    console.error(`  JSON 파싱 실패`);
    fs.writeFileSync(path.join(OUT_DIR, `${cat.id}-RAW.txt`), text);
    return null;
  }

  // grounding chunks
  const chunks = c?.groundingMetadata?.groundingChunks ?? [];
  const ytChunks = chunks
    .map(ch => ch.web?.uri)
    .filter(u => u && u.includes('grounding-api-redirect'));
  console.log(`  Gemini ${dishes.length}개 dish, grounding ${ytChunks.length}개 chunk`);

  // resolve all chunks → real youtube URLs
  const resolved = [];
  for (const ch of ytChunks) {
    const real = await resolveRedirect(ch);
    if (real) resolved.push(real);
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`  resolved ${resolved.length}개 youtube URL`);

  // dedupe
  const uniqueResolved = [...new Set(resolved)];

  // match dishes ↔ resolved
  const finalDishes = [];
  let i = 0;
  for (const d of dishes) {
    i++;
    let url = null, meta = null;

    // 1차: grounding 풀에서 매칭
    const picked = await pickBestUrl(d, uniqueResolved);
    if (picked) {
      url = picked.url;
      meta = picked.meta;
    } else {
      // 2차: yt-dlp 폴백
      const q = d.search_query || `${d.channel} ${d.title}`;
      console.log(`    [${i}] grounding 매칭 실패, yt-dlp 검색: "${q}"`);
      const ytr = ytdlpSearch(q);
      if (ytr) {
        url = ytr.youtube_url;
        meta = await oembedVerify(url);
        if (meta) {
          d.title = ytr.title;
          d.channel = ytr.channel;
          d.estimated_duration = ytr.estimated_duration;
        }
      }
    }

    if (!url || !meta) {
      console.log(`    [${i}] ❌ 폐기: ${d.title.slice(0, 40)}`);
      continue;
    }

    // hook 검수
    if (!checkHook(d.hook, cat)) {
      console.log(`    [${i}] ⚠️  hook 부적합 ("${d.hook}") → 강제 톤 변경`);
      d.hook = `${cat.hookTone.split(',')[0].trim()} 한 그릇`;
    }

    finalDishes.push({
      id: `love-${cat.id}-${finalDishes.length + 1}`,
      title: meta.title,
      channel: meta.channel,
      youtube_url: url,
      thumbnail: meta.thumbnail,
      estimated_duration: d.estimated_duration || '',
      tags: d.tags,
      hook: d.hook,
      why_recommended: d.why_recommended,
      is_curator_pick: d.is_curator_pick ?? false,
    });
    console.log(`    [${i}] ✅ ${meta.channel} - ${meta.title.slice(0, 45)}`);
  }

  const result = {
    category_id: cat.id,
    category_name: cat.name,
    category_emoji: cat.emoji,
    concept: cat.concept,
    dishes: finalDishes,
  };
  fs.writeFileSync(path.join(OUT_DIR, `${cat.id}.json`), JSON.stringify(result, null, 2));
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ✅ ${finalDishes.length}/${dishes.length} dish 확정, ${dt}s`);
  return result;
}

(async () => {
  const all = [];
  for (const cat of CATEGORIES) {
    try {
      const r = await processCategory(cat);
      if (r) all.push(r);
    } catch (e) {
      console.error(`[${cat.name}] 실패:`, e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'all.json'), JSON.stringify(all, null, 2));
  console.log(`\n=== 완료 ===`);
  console.log(`카테고리: ${all.length}/${CATEGORIES.length}`);
  console.log(`총 dish: ${all.reduce((s, c) => s + c.dishes.length, 0)}개`);
  console.log(`결과: ${OUT_DIR}/all.json`);
})();
