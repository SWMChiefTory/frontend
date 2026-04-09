/**
 * 0개인 카테고리에 새 dish 채우기.
 *
 * 1. 카테고리별 시드 키워드 → yt-dlp 검색 (5개 받음)
 * 2. 어제 사용한 video_id 제외
 * 3. POST /recipes → progress 폴링 → SUCCESS만 keep
 * 4. Gemini로 카피 생성 (다양성 확보)
 * 5. themes.json에 추가
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const TOKENS_FILE = path.join(os.homedir(), '.cheftory-cli/tokens.json');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.cheftories.com/api/v1';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }
const THEMES_PATH = path.resolve('assets/data/themes.json');

const POLL_INTERVAL_MS = 5000;
const POLL_MAX = 30;
const THROTTLE_MS = 4000;

// ─── 토큰 관리 ───

function loadTokens() { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8')); }
function saveTokens(a, r) { fs.writeFileSync(TOKENS_FILE, JSON.stringify({ access_token: a, refresh_token: r, saved_at: new Date().toISOString() }, null, 2), { mode: 0o600 }); }
function isExpired(t) { try { const p = JSON.parse(Buffer.from((t.startsWith('Bearer ') ? t.slice(7) : t).split('.')[1], 'base64').toString()); return !p.exp || p.exp * 1000 < Date.now() + 60_000; } catch { return true; } }
async function reissue() {
  const tk = loadTokens();
  const res = await fetch(`${API_URL}/auth/token/reissue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: tk.refresh_token }) });
  if (!res.ok) throw new Error(`reissue ${res.status}`);
  const d = await res.json();
  saveTokens(d.access_token, d.refresh_token);
  return d.access_token;
}
let cached = null;
async function getToken() {
  if (!cached) cached = loadTokens().access_token;
  if (isExpired(cached)) { cached = await reissue(); console.log('  [auth] refreshed'); }
  return cached.startsWith('Bearer ') ? cached : `Bearer ${cached}`;
}
async function authedFetch(url, init = {}) {
  let t = await getToken();
  let res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: t, Accept: 'application/json' } });
  if (res.status === 401) { cached = await reissue(); t = cached.startsWith('Bearer ') ? cached : `Bearer ${cached}`; res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: t, Accept: 'application/json' } }); }
  return res;
}

// ─── ChefTory API ───

async function createRecipe(videoUrl) {
  const res = await authedFetch(`${API_URL}/recipes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ video_url: videoUrl, videoUrl }) });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`POST ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data.recipe_id ?? data.recipeId;
}

async function fetchProgress(id) {
  const res = await authedFetch(`${API_URL}/recipes/progress/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.recipe_status ?? data.recipeStatus ?? null;
}

async function pollUntilDone(id) {
  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const s = await fetchProgress(id);
    if (s === 'SUCCESS') return 'SUCCESS';
    if (s === 'FAILED' || s === 'BLOCKED' || s === 'BANNED') return s;
  }
  return 'TIMEOUT';
}

// ─── yt-dlp ───

function ytdlpSearchN(query, n = 5) {
  const r = spawnSync('yt-dlp', [
    `ytsearch${n}:${query}`,
    '--print', '%(id)s|%(title)s|%(channel)s|%(duration_string)s',
    '--no-warnings', '--skip-download',
  ], { encoding: 'utf-8', timeout: 90000 });
  return (r.stdout || '').trim().split('\n').filter(l => l.includes('|')).map(line => {
    const [id, title, channel, duration] = line.split('|');
    return { id, title, channel, duration };
  }).filter(x => x.id?.length === 11);
}

async function oembed(url) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (r.status !== 200) return null;
    const j = await r.json();
    return { title: j.title, channel: j.author_name, thumbnail: j.thumbnail_url };
  } catch { return null; }
}

// ─── Gemini 카피 ───

const COPY_SYSTEM = `너는 ChefTory의 카피라이터다. 직관적·구체적·다양한 시작 패턴 사용. 시적·은유 금지. 같은 카테고리 안에서 같은 단어 2회 금지.`;

async function generateCopies(catMeta, dishes) {
  const dishList = dishes.map(d => `${d.id} | ${d.channel.slice(0, 25)} | ${d.title.slice(0, 60)}`).join('\n');
  const prompt = `카테고리: ${catMeta.emoji} ${catMeta.name}
컨셉: ${catMeta.concept}

각 dish에 dish_name(4~10자) / hook(12~22자, 인용 형태) / why_recommended(25자 이내) 작성.
다양성 최우선: 형용사/숫자/감탄/비유/동사/명사로 시작 변주.

dish 목록:
${dishList}

JSON 배열만:
[{ "id": "...", "dish_name": "...", "hook": "...", "why_recommended": "..." }]`;

  const body = {
    systemInstruction: { parts: [{ text: COPY_SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 4096 },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ?? '';
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
  if (s === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

// ─── 시드 정의 ───

const TARGETS = [
  { themeId: 'love-meal', categoryId: 'cook-together', count: 5, seeds: [
    '백종원 만두 만들기', '꿀키 라비올리', '수제 햄버거 패티 만들기', '수제 피자 도우 만들기 처음부터', '핫팟 샤브샤브 집에서',
  ]},
  { themeId: 'love-meal', categoryId: 'lunchbox', count: 5, seeds: [
    '소시지 도시락 반찬', '야채 계란말이 도시락', '메추리알 장조림', '햄지 도시락 만들기', '제육 도시락 반찬',
  ]},
  { themeId: 'night-snack', categoryId: 'quick-3', count: 5, seeds: [
    '버터간장 계란밥', '치즈 토스트 5분', '간단 명란 비빔밥', '5분 라면 토핑', '버터 간장 파스타 한 그릇',
  ]},
  { themeId: 'night-snack', categoryId: 'guilt-free', count: 5, seeds: [
    '두부면 비빔국수', '곤약 라면 다이어트', '오트밀 죽 만들기', '닭가슴살 샐러드 다이어트', '단호박 야식 다이어트',
  ]},
  { themeId: 'night-snack', categoryId: 'ramen-mod', count: 5, seeds: [
    '짜파게티 신라면 짜파구리', '치즈 신라면 만들기', '안성탕면 떡국', '진라면 까르보', '비빔면 육수 변형',
  ]},
  { themeId: 'night-snack', categoryId: 'cvs-combo', count: 5, seeds: [
    '편의점 꿀조합 야식', '편의점 컵라면 토핑', '편의점 김밥 변신', '편의점 핫바 활용', '편의점 떡볶이 컵',
  ]},
  { themeId: 'night-snack', categoryId: 'guilty', count: 5, seeds: [
    '에어프라이어 치킨 윙', '수제 페퍼로니 피자', '치즈 듬뿍 닭강정', '바삭 또띠아 피자', '치즈 폭탄 피자',
  ]},
];

// ─── 메인 ───

(async () => {
  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  fs.writeFileSync(THEMES_PATH + '.before-fill', fs.readFileSync(THEMES_PATH));

  // 기존 모든 video_id 수집 (중복 방지)
  const existing = new Set();
  for (const th of themes.themes) {
    for (const d of th.dishes) {
      const m = d.youtube_url?.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (m) existing.add(m[1]);
    }
  }
  console.log(`기존 video_id ${existing.size}개\n`);

  for (const tgt of TARGETS) {
    const theme = themes.themes.find(t => t.id === tgt.themeId);
    const catMeta = theme.categories.find(c => c.id === tgt.categoryId);
    console.log(`\n=== ${catMeta.emoji} ${catMeta.name} (${tgt.themeId}/${tgt.categoryId}) ===`);

    const candidateDishes = [];

    // 1. yt-dlp 검색 → 비중복 + ChefTory POST → SUCCESS 만 keep
    for (const seed of tgt.seeds) {
      if (candidateDishes.length >= tgt.count) break;
      console.log(`  검색: "${seed}"`);
      const results = ytdlpSearchN(seed, 5);
      let picked = null;
      for (const r of results) {
        if (existing.has(r.id)) continue;
        picked = r;
        break;
      }
      if (!picked) { console.log(`    ⚠️  비중복 없음`); continue; }
      existing.add(picked.id);

      // ChefTory에 생성
      const youtubeUrl = `https://www.youtube.com/watch?v=${picked.id}`;
      try {
        const recipeId = await createRecipe(youtubeUrl);
        process.stdout.write(`    POST → ${recipeId} ... `);
        const status = await pollUntilDone(recipeId);
        if (status === 'SUCCESS') {
          console.log(`✅`);
          candidateDishes.push({
            id: `${tgt.categoryId}-fill-${candidateDishes.length + 1}`,
            videoId: picked.id,
            title: picked.title,
            channel: picked.channel,
            youtubeUrl,
            recipeId,
            duration: picked.duration,
          });
        } else {
          console.log(`❌ ${status}`);
        }
      } catch (e) {
        console.log(`❌ ${e.message.slice(0, 80)}`);
      }
      await new Promise(r => setTimeout(r, THROTTLE_MS));
    }

    if (!candidateDishes.length) { console.log(`  ⚠️  ${catMeta.name}: 채울 dish 없음`); continue; }

    // 2. oEmbed로 메타 보강
    for (const d of candidateDishes) {
      const m = await oembed(d.youtubeUrl);
      if (m) {
        d.title = m.title;
        d.channel = m.channel;
        d.thumbnail = m.thumbnail;
      }
    }

    // 3. Gemini 카피
    const copies = await generateCopies(catMeta, candidateDishes);
    if (!copies) { console.log(`  ⚠️  카피 생성 실패`); continue; }
    const copyMap = Object.fromEntries(copies.map(c => [c.id, c]));

    // 4. themes.json에 추가
    for (const d of candidateDishes) {
      const c = copyMap[d.id] || {};
      const newDish = {
        id: `${tgt.categoryId}-${theme.dishes.length + 1}`,
        title: d.title,
        channel: d.channel,
        youtube_url: d.youtubeUrl,
        thumbnail: d.thumbnail,
        estimated_duration: d.duration || '',
        tags: { mood: [], difficulty: '초보', time: '30분', format: '롱폼', pairing: ['없음'], occasion: ['평일저녁'], style: ['한식'], ingredient_focus: ['고기'], budget: '보통' },
        why_recommended: c.why_recommended || '',
        hook: c.hook || '',
        is_curator_pick: false,
        category: tgt.categoryId,
        dish_name: c.dish_name || '',
        recipe_id: d.recipeId,
      };
      theme.dishes.push(newDish);
      console.log(`    ✅ 추가: ${newDish.dish_name} | "${newDish.hook}"`);
    }

    // 중간 저장
    fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
  }

  fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
  console.log(`\n=== 완료 ===`);
})();
