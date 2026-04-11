/**
 * love-meal, dubai-cookie 번역 (분할 호출)
 */
import fs from 'node:fs';

const API_KEY = process.env.GEMINI_API_KEY;
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const THEMES_PATH = 'assets/data/themes.json';

async function callGemini(prompt) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 8192 } }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ?? '';
}

function parseJson(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
  if (s === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

function parseArray(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
  if (s === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

const themes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));

for (const themeId of ['love-meal', 'dubai-cookie']) {
  const theme = themes.themes.find(t => t.id === themeId);
  if (!theme) continue;
  console.log(`\n=== ${themeId} ===`);

  // 1. 메타 + 카테고리
  const metaInput = {
    title: theme.title,
    subtitle: theme.subtitle,
    curator_quote: theme.curator_quote || '',
    categories: (theme.categories || []).map(c => ({ id: c.id, name: c.name, concept: c.concept })),
  };
  const metaText = await callGemini(`Translate to English (food app, casual tone). Return JSON only:\n${JSON.stringify(metaInput)}`);
  const metaResult = parseJson(metaText);
  if (metaResult) {
    theme.title_en = metaResult.title;
    theme.subtitle_en = metaResult.subtitle;
    if (metaResult.curator_quote) theme.curator_quote_en = metaResult.curator_quote;
    if (metaResult.categories && theme.categories) {
      for (const rc of metaResult.categories) {
        const cat = theme.categories.find(c => c.id === rc.id);
        if (cat) { cat.name_en = rc.name; cat.concept_en = rc.concept; }
      }
    }
    console.log('  meta ✅');
  } else {
    console.log('  meta ❌');
  }
  await new Promise(r => setTimeout(r, 2000));

  // 2. dish 10개씩
  for (let i = 0; i < theme.dishes.length; i += 10) {
    const batch = theme.dishes.slice(i, i + 10);
    const input = batch.map(d => ({
      id: d.id,
      hook: d.hook || '',
      why_recommended: d.why_recommended || '',
      dish_name: d.dish_name || '',
    }));
    const text = await callGemini(`Translate these Korean food descriptions to English (casual food app tone). Return JSON array only:\n${JSON.stringify(input)}`);
    const arr = parseArray(text);
    if (arr) {
      for (const rd of arr) {
        const dish = theme.dishes.find(d => d.id === rd.id);
        if (dish) {
          if (rd.hook) dish.hook_en = rd.hook;
          if (rd.why_recommended) dish.why_recommended_en = rd.why_recommended;
          if (rd.dish_name) dish.dish_name_en = rd.dish_name;
        }
      }
      console.log(`  dishes ${i + 1}-${i + batch.length} ✅ (${arr.length})`);
    } else {
      console.log(`  dishes ${i + 1}-${i + batch.length} ❌`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

fs.writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2));
console.log('\n✅ 저장');
