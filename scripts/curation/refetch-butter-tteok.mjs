/**
 * 버터떡 테마 dish 새로 수집.
 *
 * 1. Gemini grounding으로 후보 키워드 생성
 * 2. yt-dlp로 실제 영상 검색 (시드 키워드 직접 사용)
 * 3. oEmbed 검증
 * 4. dish_name/hook/why_recommended 생성 (Gemini 1회)
 * 5. themes.json에 머지
 *
 * 실행: GEMINI_API_KEY=... node scripts/curation/refetch-butter-tteok.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const THEMES_PATH = path.resolve('assets/data/themes.json');

// 시드 키워드 (yt-dlp에 직접 검색)
const SEEDS = [
  '가래떡 버터구이',
  '인절미 토스트 만개의레시피',
  '앙버떡 만들기',
  '버터 가래떡 설탕',
  '카라멜 가래떡',
  '치즈 가래떡 떡꼬치',
  '버터 콩고물 떡',
  '에어프라이어 가래떡',
  '꿀버터 떡',
  '가래떡 버터구이 꿀',
  '인절미 크림치즈 토스트',
  '카라멜 팝떡',
];

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

async function oembedVerify(url) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (r.status !== 200) return null;
    const j = await r.json();
    return { title: j.title, channel: j.author_name, thumbnail: j.thumbnail_url };
  } catch { return null; }
}

// ─── Gemini로 카피 생성 ───

async function generateCopies(dishes) {
  const dishList = dishes.map(d => `${d.id} | ${d.channel.slice(0, 25)} | ${d.title.slice(0, 60)}`).join('\n');

  const prompt = `너는 ChefTory의 카피라이터다. "버터떡" 테마는 버터와 떡(가래떡, 인절미, 앙버떡 등)의 환상적인 만남을 다룬다.

타겟: 달콤한 간식, 카페 디저트 좋아하는 사람. 누구나 만들 수 있는 길티 디저트.

다음 ${dishes.length}개 dish 각각에 dish_name/hook/why_recommended 작성.

규칙:
- **다양성 최우선**: 모든 hook이 비슷하면 안 됨. 형용사/숫자/감탄/비유/동사/명사로 다양하게 시작.
- 직관적이고 구체적. 시적 X.
- dish_name: 4~10자 짧은 요리명 (예: "꿀버터떡", "앙버떡", "인절미 토스트")
- hook: 12~22자 인용 캐치프레이즈 (예: "겉은 바삭, 속은 쫀득한 인생 떡")
- why_recommended: 25자 이내 1문장 (예: "오후 3시 카페가 부럽지 않아")

dish 목록:
${dishList}

JSON 배열만 응답:
[{ "id": "...", "dish_name": "...", "hook": "...", "why_recommended": "..." }]`;

  const body = {
    systemInstruction: { parts: [{ text: '너는 ChefTory의 카피라이터다. 한국어로만 응답.' }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return await res.json();
}

function extractJsonArray(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').replace(/^```\s*/i, '').trim();
  const s = cleaned.indexOf('['); const e = cleaned.lastIndexOf(']');
  if (s === -1 || e === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

// ─── 메인 ───

(async () => {
  console.log(`yt-dlp로 ${SEEDS.length}개 영상 검색...`);
  const dishes = [];
  const seenIds = new Set();

  for (const seed of SEEDS) {
    const r = ytdlpSearch(seed);
    if (!r) { console.log(`  ❌ ${seed}`); continue; }
    const m = r.youtube_url.match(/v=([a-zA-Z0-9_-]{11})/);
    if (!m || seenIds.has(m[1])) {
      console.log(`  ⚠️  중복 ${seed}`);
      continue;
    }
    seenIds.add(m[1]);
    const meta = await oembedVerify(r.youtube_url);
    if (!meta) { console.log(`  ❌ oembed ${seed}`); continue; }
    dishes.push({
      id: `bt-${dishes.length + 1}`,
      title: meta.title,
      channel: meta.channel,
      youtube_url: r.youtube_url,
      thumbnail: meta.thumbnail,
      estimated_duration: r.estimated_duration,
      tags: {
        mood: [],
        difficulty: '초보',
        time: '30분',
        format: '롱폼',
        pairing: ['없음'],
        occasion: ['주말브런치'],
        style: ['디저트'],
        ingredient_focus: ['떡'],
        budget: '가성비',
      },
      why_recommended: '',
      hook: '',
      is_curator_pick: dishes.length < 3,
    });
    console.log(`  ✅ ${dishes.length}. ${meta.channel.slice(0, 20)} - ${meta.title.slice(0, 50)}`);
  }

  console.log(`\n총 ${dishes.length}개 dish 확보. Gemini 카피 생성 중...`);
  const data = await generateCopies(dishes);
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ?? '';
  const updates = extractJsonArray(text);
  if (!updates) {
    console.error('카피 파싱 실패. raw:'); console.error(text.slice(0, 300));
    process.exit(1);
  }

  for (const u of updates) {
    const d = dishes.find(x => x.id === u.id);
    if (!d) continue;
    d.dish_name = u.dish_name;
    d.hook = u.hook;
    d.why_recommended = u.why_recommended;
    console.log(`  ✅ ${u.id}: ${u.dish_name} | "${u.hook}"`);
  }

  // themes.json 머지
  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  const idx = themes.themes.findIndex(t => t.id === 'butter-tteok');
  if (idx === -1) { console.error('butter-tteok 없음'); process.exit(1); }

  fs.writeFileSync(THEMES_PATH + '.before-bt', fs.readFileSync(THEMES_PATH));
  themes.themes[idx].dishes = dishes;
  themes.themes[idx].subtitle = '버터와 떡의 달콤한 만남';
  delete themes.themes[idx].categories; // 카테고리 X, flat
  fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));

  console.log(`\n✅ butter-tteok ${dishes.length}개 dish로 교체 완료`);
})();
