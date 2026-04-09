/**
 * 카테고리 커버 이미지 생성 (love-meal + night-snack 12개).
 *
 * 1. tory-character 스킬의 BASE 프롬프트 + 카테고리별 상황 1줄
 * 2. reference 이미지 (tory-logo.png + tory-write.png) 첨부로 캐릭터 락
 * 3. gemini-2.5-flash-image 호출
 * 4. 생성 후 vision 모델로 자가 검증 (체크리스트 11항목)
 * 5. 실패 시 1회 재시도
 *
 * 출력: assets/images/categories/{theme-id}/{category-id}.png
 *
 * 실행: GEMINI_API_KEY=... node scripts/curation/generate-category-images.mjs
 *      ONLY=love-meal:girlfriend node scripts/curation/generate-category-images.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }

const IMAGE_MODEL = 'gemini-2.5-flash-image';
const VISION_MODEL = 'gemini-2.5-flash';
const ONLY = process.env.ONLY || null;

const THEMES_PATH = path.resolve('assets/data/themes.json');
const OUT_DIR = path.resolve('assets/images/categories');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 토리 레퍼런스 이미지 (캐릭터 일관성용)
const REF_IMAGES = [
  'assets/images/tory-logo.png',
  'assets/images/tory-write.png',
  'assets/images/tory-veggie.png',
];

// ─── 토리 캐릭터 LOCK 프롬프트 (tory-character 스킬에서 가져옴) ───

const TORY_BASE = `A cute flat 2D vector illustration of "Tory", an orange fox mascot character.

STRICT CHARACTER LOCK (must match the reference images exactly):
- Extremely oversized round head (head 4x bigger than body), wide diamond shape with chubby cheeks
- Main color: warm orange (#F2733A), cream belly and inner ears (#FFE4B8), thin dark orange outline
- Two very large ears spread sideways at 45 degrees, ear width is 40% of head width
- The character's RIGHT ear (viewer's left) has a slightly folded tip bending forward; the LEFT ear (viewer's right) is upright and straight
- Inner ear is cream colored with a single thin orange curve line following the ear shape
- Cream V-shaped marking on the forehead extending down to both cheeks, NOT touching the nose
- Two small round black dot eyes, widely spaced apart (eye spacing = 35% of face width), no highlights, no eyebrows
- Small dark brown rounded triangle nose centered just below the eyes
- NO mouth visible (closed face by default)
- Tiny barely-visible body underneath the head, with cream oval belly marking
- Two small stubby orange feet, no legs
- Small fox tail with cream tip on the character's LEFT side (viewer's left)
- Style: flat 2D vector, clean thin outline, solid color fills, no gradient, no 3D, no realistic shading, kawaii, minimal

Composition: square 1:1, centered Tory occupying 60% of frame, soft pastel solid background. No text, no letters.`;

// ─── 카테고리별 상황 묘사 ───

const SCENES = {
  // 사랑 한 끼
  'love-meal:boyfriend':       { bg: '#FFE8D6', scene: 'Tory holding a large hearty bowl of food with both stubby hands, proud confident expression, small steam swirls above the bowl' },
  'love-meal:girlfriend':      { bg: '#FFD9E4', scene: 'Tory holding a small pretty pink dessert plate with one hand, a tiny pink flower next to him, gentle loving mood' },
  'love-meal:first-date':      { bg: '#FFF4D6', scene: 'Tory shyly holding a single small plate with a pasta dish, a tiny sparkle next to him, slightly blushing innocent mood' },
  'love-meal:home-invite':     { bg: '#E8DCFF', scene: 'Tory wearing a tiny beige chef toque, holding two small wine glasses for a toast, a small candle beside him, hosting party mood' },
  'love-meal:cook-together':   { bg: '#D9F0E0', scene: 'Two Torys side by side holding hands, kneading dough together on a small board between them, joyful cooperative mood. Both Torys identical with same character lock.' },
  'love-meal:lunchbox':        { bg: '#FFF0CC', scene: 'Tory holding a small wrapped bento box with both hands, a tiny rising sun in the corner background, caring morning mood' },

  // 야식
  'night-snack:classic':       { bg: '#2A2D43', scene: 'Tory holding a steamy noodle bowl, tiny moon and stars in the dark night background, cozy late-night mood. Tory color stays vibrant orange against dark background.' },
  'night-snack:quick-3':       { bg: '#FFE8B0', scene: 'Tory holding three small ingredient items (egg, butter, soy sauce bottle), a tiny clock showing 5 minutes beside him, quick efficient mood' },
  'night-snack:guilt-free':    { bg: '#D8F3DC', scene: 'Tory holding a small bowl of green salad or tofu, a tiny dumbbell next to him, healthy proud mood' },
  'night-snack:ramen-mod':     { bg: '#FFD6D6', scene: 'Tory holding a steaming ramen bowl with cheese on top, a small ramen packet beside him, satisfied mood' },
  'night-snack:cvs-combo':     { bg: '#D6EFFF', scene: 'Tory holding a small convenience store shopping basket with snacks inside, a tiny price tag beside him, clever bargain mood' },
  'night-snack:guilty':        { bg: '#FFD4A8', scene: 'Tory holding a slice of cheesy pizza or fried chicken piece, a tiny devil halo above his head as a joke, mischievous indulgent mood' },
};

// ─── 헬퍼 ───

function imageToBase64(filepath) {
  const buf = fs.readFileSync(filepath);
  return buf.toString('base64');
}

async function generateImage(scene, bg) {
  const prompt = `${TORY_BASE}

Scene for this image:
- Background: solid pastel color ${bg}
- Action: ${scene}
- Negative: text, words, letters, white hat, tall hat, big body, long legs, hands with fingers, realistic, 3d render, photo, multiple different characters, mouth wide open, teeth, eyebrows, gradient shading

Use the attached reference images to keep Tory's character design 100% consistent.`;

  const refParts = REF_IMAGES.filter(p => fs.existsSync(p)).map(p => ({
    inlineData: {
      mimeType: 'image/png',
      data: imageToBase64(p),
    },
  }));

  const body = {
    contents: [{
      role: 'user',
      parts: [
        ...refParts,
        { text: prompt },
      ],
    }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`image gen ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error('no image in response');
  return Buffer.from(part.inlineData.data, 'base64');
}

async function verifyImage(imageBuf, sceneDescription) {
  const prompt = `Evaluate this image of a ChefTory mascot "Tory" (orange fox cartoon character).

Check these requirements:
1. Orange fox with oversized head (4x body), flat 2D style
2. Two large ears spread sideways at 45 degrees (one slightly folded)
3. Cream V-shaped marking on forehead
4. Two small black dot eyes, widely spaced
5. No mouth (or very small curve)
6. No text/letters in the image
7. Scene matches: "${sceneDescription}"

Respond with ONLY a JSON object (no markdown, no preamble):
{"ok":true,"score":8,"issues":[],"matches_scene":true}

score is 0-10. ok=true if score >= 6 and no critical issues.`;

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/png', data: imageBuf.toString('base64') } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024, responseMimeType: 'application/json' },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, score: 0, issues: [`vision ${res.status}`] };
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const s = cleaned.indexOf('{'); const e = cleaned.lastIndexOf('}');
  if (s === -1) return { ok: false, score: 0, issues: ['no json'] };
  try { return JSON.parse(cleaned.slice(s, e + 1)); }
  catch { return { ok: false, score: 0, issues: ['parse fail'] }; }
}

// ─── 메인 ───

(async () => {
  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  const targets = [];
  for (const t of themes.themes) {
    if (!t.categories) continue;
    for (const c of t.categories) {
      const key = `${t.id}:${c.id}`;
      if (ONLY && ONLY !== key) continue;
      targets.push({ themeId: t.id, catId: c.id, key, scene: SCENES[key] });
    }
  }

  console.log(`총 ${targets.length}개 카테고리 이미지 생성...`);

  const report = [];

  for (const tgt of targets) {
    if (!tgt.scene) {
      console.log(`⚠️  ${tgt.key}: scene 정의 없음, skip`);
      continue;
    }
    const themeDir = path.join(OUT_DIR, tgt.themeId);
    fs.mkdirSync(themeDir, { recursive: true });
    const outPath = path.join(themeDir, `${tgt.catId}.png`);

    let success = false;
    let lastResult = null;
    for (let attempt = 0; attempt < 2 && !success; attempt++) {
      try {
        console.log(`\n[${tgt.key}] 생성 (attempt ${attempt + 1})...`);
        const imageBuf = await generateImage(tgt.scene.scene, tgt.scene.bg);
        const verdict = await verifyImage(imageBuf, tgt.scene.scene);
        lastResult = verdict;
        const ok = verdict.ok && (verdict.score ?? 0) >= 6;
        if (ok || attempt === 1) {
          fs.writeFileSync(outPath, imageBuf);
          console.log(`  ${ok ? '✅' : '⚠️ '} score=${verdict.score} matches=${verdict.matches_scene} issues=${(verdict.issues||[]).join(';')}`);
          console.log(`  saved: ${outPath}`);
          success = true;
        } else {
          console.log(`  ❌ score=${verdict.score} 재시도. issues=${(verdict.issues||[]).join(';')}`);
        }
      } catch (e) {
        console.error(`  실패: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    report.push({ key: tgt.key, success, ...lastResult });
  }

  fs.writeFileSync(path.join(OUT_DIR, '_report.json'), JSON.stringify(report, null, 2));
  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${report.filter(r => r.success).length}/${report.length}`);
  console.log(`평균 점수: ${(report.reduce((s, r) => s + (r.score || 0), 0) / report.length).toFixed(1)}`);
})();
