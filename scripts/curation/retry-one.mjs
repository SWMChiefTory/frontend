// 단일 카테고리 재시도용
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const ONLY = process.argv[2] || 'first-date';
process.env.ONLY_CATEGORY = ONLY;

// 원본 스크립트의 CATEGORIES 중 ONLY만 처리하도록 패치 실행
const orig = fs.readFileSync('scripts/curation/research-love-meal.mjs', 'utf-8');
const patched = orig.replace(
  'for (const cat of CATEGORIES) {',
  `for (const cat of CATEGORIES.filter(c => c.id === '${ONLY}')) {`,
);
const tmp = 'scripts/curation/.research-tmp.mjs';
fs.writeFileSync(tmp, patched);

const r = spawnSync('node', [tmp], { stdio: 'inherit' });
fs.unlinkSync(tmp);
process.exit(r.status ?? 0);
