/**
 * 큐레이션 결과 JSON의 youtube_url 유효성 검증.
 * YouTube oEmbed (https://www.youtube.com/oembed?url=...&format=json) 사용 — API key 불필요.
 * 200 OK면 영상 존재, 404면 죽은 영상.
 *
 * 실행: node scripts/curation/validate-urls.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('scripts/curation/output');
const FILES = [
  'love-meal-boyfriend.json',
  'love-meal-girlfriend.json',
  'love-meal-first-date.json',
  'love-meal-home-invite.json',
  'love-meal-cook-together.json',
];

async function checkUrl(url) {
  if (!url) return { ok: false, reason: 'empty' };
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembed, { method: 'GET' });
    if (res.status === 200) {
      const j = await res.json();
      return { ok: true, title: j.title, channel: j.author_name };
    }
    return { ok: false, reason: `status ${res.status}` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

(async () => {
  const report = [];
  for (const file of FILES) {
    const fp = path.join(DIR, file);
    const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    console.log(`\n=== ${data.category_emoji} ${data.category_name} ===`);
    const validDishes = [];
    for (let i = 0; i < data.dishes.length; i++) {
      const d = data.dishes[i];
      const r = await checkUrl(d.youtube_url);
      const mark = r.ok ? '✅' : '❌';
      console.log(`  ${mark} [${i + 1}] ${d.title.slice(0, 50)}`);
      if (r.ok) {
        // 실제 제목/채널로 보정
        d._real_title = r.title;
        d._real_channel = r.channel;
        validDishes.push(d);
      } else {
        console.log(`       reason: ${r.reason}`);
        report.push({ category: data.category_name, title: d.title, url: d.youtube_url, reason: r.reason });
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    data.dishes = validDishes;
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
    console.log(`  → ${validDishes.length}/${data.dishes.length + report.filter(r => r.category === data.category_name).length} 유효`);
  }

  if (report.length) {
    fs.writeFileSync(
      path.join(DIR, 'invalid-urls.json'),
      JSON.stringify(report, null, 2),
    );
    console.log(`\n⚠️  죽은 URL ${report.length}개 → invalid-urls.json`);
  } else {
    console.log('\n✅ 모든 URL 유효');
  }
})();
