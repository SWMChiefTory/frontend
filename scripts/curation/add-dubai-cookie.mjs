/**
 * "두바이 쫀득 쿠키" 테마 신규 추가.
 *
 * 1. yt-dlp 시드 검색
 * 2. oEmbed 검증
 * 3. Gemini로 dish_name/hook/why 카피 생성
 * 4. themes.json에 추가
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const THEMES_PATH = path.resolve('assets/data/themes.json');

// 두바이 쫀득 쿠키 시드 키워드
const SEEDS = [
  '두바이 쫀득 쿠키',
  '두바이 초콜릿 쿠키',
  '피스타치오 쫀득 쿠키',
  '두바이 쿠키 만들기',
  '카다이프 쿠키',
  '두바이 초콜릿 카다이프',
  '쫀득 누텔라 쿠키',
  '피스타치오 크림 쿠키',
  '두바이 디저트 만들기',
  '쫀쫀 초코 쿠키',
  '레비스 쿠키 두바이',
  '두바이 초콜릿 레시피',
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

async function generateCopies(dishes) {
  const dishList = dishes.map(d => `${d.id} | ${d.channel.slice(0, 25)} | ${d.title.slice(0, 60)}`).join('\n');

  const prompt = `너는 ChefTory의 카피라이터다. "두바이 쫀득 쿠키" 테마는 두바이 초콜릿에서 영감받은 쫀득한 쿠키 / 피스타치오 / 카다이프를 활용한 디저트를 다룬다.

타겟: 트렌드 디저트 좋아하는 사람, 인스타용 비주얼 챙기는 사람, 홈베이킹 입문자.

다음 ${dishes.length}개 dish 각각에 dish_name/hook/why_recommended 작성.

규칙:
- **다양성 최우선**: 모든 hook이 비슷하면 안 됨. 형용사/숫자/감탄/비유로 다양하게 시작.
- 직관적·구체적. 시적 X.
- dish_name: 4~10자
- hook: 12~22자 인용 캐치프레이즈
- why_recommended: 25자 이내 1문장

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

(async () => {
  console.log(`yt-dlp ${SEEDS.length}개 검색...`);
  const dishes = [];
  const seen = new Set();
  for (const seed of SEEDS) {
    const r = ytdlpSearch(seed);
    if (!r) { console.log(`  ❌ ${seed}`); continue; }
    const m = r.youtube_url.match(/v=([a-zA-Z0-9_-]{11})/);
    if (!m || seen.has(m[1])) { console.log(`  ⚠️  중복 ${seed}`); continue; }
    seen.add(m[1]);
    const meta = await oembedVerify(r.youtube_url);
    if (!meta) { console.log(`  ❌ oembed ${seed}`); continue; }
    dishes.push({
      id: `dc-${dishes.length + 1}`,
      title: meta.title,
      channel: meta.channel,
      youtube_url: r.youtube_url,
      thumbnail: meta.thumbnail,
      estimated_duration: r.estimated_duration,
      tags: {
        mood: [],
        difficulty: '중급',
        time: '1시간이상',
        format: '롱폼',
        pairing: ['없음'],
        occasion: ['주말브런치'],
        style: ['디저트'],
        ingredient_focus: ['빵'],
        budget: '보통',
      },
      why_recommended: '',
      hook: '',
      is_curator_pick: dishes.length < 3,
    });
    console.log(`  ✅ ${dishes.length}. ${meta.channel.slice(0, 20)} - ${meta.title.slice(0, 50)}`);
  }

  console.log(`\n${dishes.length}개 dish, Gemini 카피 생성...`);
  const data = await generateCopies(dishes);
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ?? '';
  const updates = extractJsonArray(text);
  if (!updates) { console.error('카피 파싱 실패'); console.error(text.slice(0, 300)); process.exit(1); }

  for (const u of updates) {
    const d = dishes.find(x => x.id === u.id);
    if (!d) continue;
    d.dish_name = u.dish_name;
    d.hook = u.hook;
    d.why_recommended = u.why_recommended;
    console.log(`  ✅ ${u.id}: ${u.dish_name} | "${u.hook}"`);
  }

  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  fs.writeFileSync(THEMES_PATH + '.before-dc', fs.readFileSync(THEMES_PATH));

  // 기존 dubai-cookie 있으면 교체, 없으면 추가
  const idx = themes.themes.findIndex(t => t.id === 'dubai-cookie');
  const themeData = {
    id: 'dubai-cookie',
    title: '두바이 쫀득 쿠키',
    subtitle: '트렌드 디저트, 한 입에 빠지는 쫀득함',
    color: '#8B5A3C',
    mode: 'light',
    curator_quote: '두바이가 부럽지 않은 쫀쫀한 한 입',
    dishes,
  };
  if (idx === -1) themes.themes.push(themeData);
  else themes.themes[idx] = themeData;

  fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
  console.log(`\n✅ dubai-cookie 테마 ${idx === -1 ? '추가' : '교체'} 완료. ${dishes.length}개 dish.`);
})();
