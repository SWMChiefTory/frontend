/**
 * 카테고리 커버 이미지를 음식/사물 일러스트로 생성.
 * (이전: 토리 마스코트 → 변경: 대표 음식/사물)
 *
 * 스타일: 귀여운 flat 2D 일러스트, 파스텔 배경, 음식 또는 상징 사물 중심.
 * tory-character 의존 없음.
 */

import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }

const IMAGE_MODEL = 'gemini-2.5-flash-image';
const VISION_MODEL = 'gemini-2.5-flash';
const ONLY = process.env.ONLY || null;

const OUT_DIR = path.resolve('assets/images/categories');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── 카테고리별 음식/사물 정의 ───

const FOOD_SCENES = {
  // 사랑 한 끼
  'love-meal:boyfriend': {
    bg: '#FFE8D6',
    subject: 'a hearty Korean rice bowl topped with grilled marinated pork bulgogi and a fried sunny-side-up egg, generous portion, steam rising',
  },
  'love-meal:girlfriend': {
    bg: '#FFD9E4',
    subject: 'a single beautiful slice of pink strawberry cream cake on a small white plate, fresh strawberry on top, dainty and pretty',
  },
  'love-meal:first-date': {
    bg: '#FFF4D6',
    subject: 'a simple plate of aglio e olio pasta with parsley garnish, one fork, single portion, clean composition',
  },
  'love-meal:home-invite': {
    bg: '#E8DCFF',
    subject: 'two clinking wine glasses with red wine and a small wooden cheese board with cheese cubes and grapes, elegant party vibe',
  },
  'love-meal:cook-together': {
    bg: '#D9F0E0',
    subject: 'a wooden cutting board with fresh dumpling dough rolls and a small pile of dumplings being formed, two pairs of small hands gently working together',
  },
  'love-meal:lunchbox': {
    bg: '#FFF0CC',
    subject: 'a Korean bento lunchbox top-down view with neatly arranged compartments containing plain white rice with sesame seeds (no shapes, no faces), rolled tamagoyaki egg slices, cherry tomatoes, broccoli florets and bulgogi beef. Strictly food items only, NO bear shapes, NO animal shapes, NO faces of any kind on the rice',
  },

  // 야식
  'night-snack:quick-3': {
    bg: '#FFE8B0',
    subject: 'three ingredients on a wooden board: a fresh egg, a small soy sauce bottle, and a stick of butter, with a small clock showing 5 minutes nearby',
  },
  'night-snack:guilt-free': {
    bg: '#D8F3DC',
    subject: 'a fresh green salad bowl with avocado slices and cherry tomatoes, a small dumbbell next to it, healthy vibrant',
  },
  'night-snack:ramen-mod': {
    bg: '#FFD6D6',
    subject: 'a steaming bowl of Korean instant ramen noodles topped with melted cheese, a single egg yolk and green onion, with a red ramen packet beside it',
  },
  'night-snack:cvs-combo': {
    bg: '#D6EFFF',
    subject: 'a Korean convenience store triangle gimbap (samgak kimbap) wrapped in seaweed, next to a cup ramen and a small banana milk carton',
  },
  'night-snack:guilty': {
    bg: '#FFD4A8',
    subject: 'a slice of cheesy pepperoni pizza with melted cheese stretching, next to a piece of crispy fried chicken drumstick, indulgent comfort food',
  },
};

// ─── 프롬프트 빌더 ───

function buildPrompt(scene) {
  return `A cute kawaii flat 2D vector illustration of ${scene.subject}.

Style requirements (must follow):
- Flat 2D vector illustration, NOT 3D, NOT realistic photo
- Clean thin outlines around shapes
- Soft pastel solid colors, no gradient
- Cute kawaii style with rounded shapes
- Single subject centered in frame, occupying about 65-75% of the image
- **PURE WHITE BACKGROUND** (RGB 255,255,255) behind the subject — completely flat plain white, NO checkered pattern, NO transparency visualization, NO gray squares. Just pure white pixels around the subject.
- Square 1:1 composition
- Korean food blog illustration style, similar to Naver food sticker art
- Friendly approachable mood, no people or characters in frame, food/objects only

Strict negatives (do NOT include):
- NO checkered pattern, NO gray squares, NO transparency visualization — pure white background only
- NO text, NO words, NO letters of any kind
- NO people, NO characters, NO mascots, NO animals
- NO 3D rendering, NO realistic photography
- NO gradient backgrounds, NO complex shadows
- NO logos, NO watermarks`;
}

async function generateImage(scene) {
  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: buildPrompt(scene) }],
    }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`image gen ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error('no image in response');
  return Buffer.from(part.inlineData.data, 'base64');
}

async function verifyImage(imageBuf, sceneSubject) {
  const prompt = `Evaluate this cute flat 2D illustration. Check if it matches the intended subject: "${sceneSubject}".

Requirements:
1. Flat 2D illustration style (not 3D, not photo)
2. Cute kawaii Korean style
3. Subject is clearly visible and centered
4. NO text/letters/words
5. NO people, NO mascots, NO animals (food/objects only)
6. Pastel solid background

Respond with ONLY a JSON object (no markdown):
{"ok":true,"score":8,"matches":true,"issues":[]}

score is 0-10. ok=true if score>=7 AND no critical issues (text present, wrong subject, photo-realistic, includes people/mascot).`;

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
  const targets = Object.entries(FOOD_SCENES)
    .filter(([key]) => !ONLY || ONLY === key)
    .map(([key, scene]) => {
      const [themeId, catId] = key.split(':');
      return { themeId, catId, key, scene };
    });

  console.log(`총 ${targets.length}개 카테고리 음식 일러스트 생성...`);

  const report = [];

  for (const tgt of targets) {
    const themeDir = path.join(OUT_DIR, tgt.themeId);
    fs.mkdirSync(themeDir, { recursive: true });
    const outPath = path.join(themeDir, `${tgt.catId}.png`);

    let success = false;
    let lastResult = null;
    for (let attempt = 0; attempt < 2 && !success; attempt++) {
      try {
        console.log(`\n[${tgt.key}] 생성 (attempt ${attempt + 1})...`);
        const imageBuf = await generateImage(tgt.scene);
        const verdict = await verifyImage(imageBuf, tgt.scene.subject);
        lastResult = verdict;
        const ok = verdict.ok && (verdict.score ?? 0) >= 7;
        if (ok || attempt === 1) {
          fs.writeFileSync(outPath, imageBuf);
          console.log(`  ${ok ? '✅' : '⚠️ '} score=${verdict.score} matches=${verdict.matches} issues=${(verdict.issues||[]).join(';')}`);
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

  fs.writeFileSync(path.join(OUT_DIR, '_food-report.json'), JSON.stringify(report, null, 2));
  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${report.filter(r => r.success).length}/${report.length}`);
  const scores = report.map(r => r.score || 0);
  console.log(`평균 점수: ${(scores.reduce((s, x) => s + x, 0) / scores.length).toFixed(1)}`);
})();
