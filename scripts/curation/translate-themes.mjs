/**
 * themes.json의 한국어 텍스트를 영어로 번역해서 _en 필드 추가.
 *
 * 번역 대상:
 * - theme: title, subtitle, curator_quote
 * - category: name, concept
 * - dish: hook, why_recommended, dish_name
 *
 * Gemini로 테마당 1회 호출.
 */

import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY 필요'); process.exit(1); }

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const THEMES_PATH = path.resolve('assets/data/themes.json');

async function callGemini(prompt) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ?? '';
}

function extractJson(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const s = cleaned.indexOf('{'); const e = cleaned.lastIndexOf('}');
  if (s === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

(async () => {
  const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
  fs.writeFileSync(THEMES_PATH + '.before-translate', fs.readFileSync(THEMES_PATH));

  for (const theme of themes.themes) {
    console.log(`\n=== ${theme.id} ===`);

    const prompt = `Translate the following Korean recipe curation data to natural English. Keep it casual and appealing (food app tone).

Return JSON with EXACT same structure, only values translated:

{
  "title": "${theme.title}",
  "subtitle": "${theme.subtitle}",
  "curator_quote": "${theme.curator_quote || ''}",
  "categories": [${(theme.categories || []).map(c => `{"id":"${c.id}","name":"${c.name}","concept":"${c.concept}"}`).join(',')}],
  "dishes": [${theme.dishes.slice(0, 50).map(d => `{"id":"${d.id}","hook":"${(d.hook || '').replace(/"/g, '\\"')}","why_recommended":"${(d.why_recommended || '').replace(/"/g, '\\"')}","dish_name":"${(d.dish_name || '').replace(/"/g, '\\"')}"}`).join(',')}]
}

Rules:
- dish_name: keep short (4-10 chars), food name in English
- hook: catchy one-liner (12-22 chars), casual food app tone
- why_recommended: one sentence (under 30 chars)
- category name: max 8 chars
- Return ONLY JSON, no markdown`;

    try {
      const text = await callGemini(prompt);
      const result = extractJson(text);
      if (!result) { console.log('  파싱 실패'); continue; }

      // 테마 메타
      theme.title_en = result.title;
      theme.subtitle_en = result.subtitle;
      if (result.curator_quote) theme.curator_quote_en = result.curator_quote;

      // 카테고리
      if (result.categories && theme.categories) {
        for (const rc of result.categories) {
          const cat = theme.categories.find(c => c.id === rc.id);
          if (cat) {
            cat.name_en = rc.name;
            cat.concept_en = rc.concept;
          }
        }
      }

      // dish
      if (result.dishes) {
        for (const rd of result.dishes) {
          const dish = theme.dishes.find(d => d.id === rd.id);
          if (dish) {
            if (rd.hook) dish.hook_en = rd.hook;
            if (rd.why_recommended) dish.why_recommended_en = rd.why_recommended;
            if (rd.dish_name) dish.dish_name_en = rd.dish_name;
          }
        }
      }

      const catCount = result.categories?.length || 0;
      const dishCount = result.dishes?.length || 0;
      console.log(`  ✅ cats: ${catCount}, dishes: ${dishCount}`);
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
  console.log('\n✅ 저장 완료');
})();
