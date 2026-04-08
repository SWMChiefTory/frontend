/**
 * Gemini quota 소진 시 폴백:
 * 시드 키워드 → yt-dlp ytsearch1 → oEmbed 검증 → 로컬 hook/why 템플릿으로 dish 생성
 *
 * 실행: node scripts/curation/research-fallback.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const OUT_DIR = path.resolve('scripts/curation/output-v2');

const REMAINING = [
  {
    id: 'home-invite', name: '우리집 초대', emoji: '🍷',
    concept: '집에 초대해서 한 상 차리는 호스트 메뉴. 와인 페어링, 여러 접시 조합, 분위기 좋고 뽐낼 수 있는 요리.',
    seeds: [
      { q: '백종원 감바스 알 아히요', tags: { style: '이탈리안', main: '해산물', diff: '초보', time: '30분' }, hook: '한 상 차리면 박수 터져요', why: '레스토랑 분위기를 집에서 그대로 재현할 수 있는 가장 인기 있는 호스트 메뉴입니다. 와인 한 잔과 완벽한 페어링으로 손님을 매료시킵니다.' },
      { q: '고기남자 스테이크 굽는법', tags: { style: '양식', main: '고기', diff: '중급', time: '30분' }, hook: '호스트의 자존심, 스테이크', why: '집들이의 메인을 책임지는 스테이크를 실패 없이 굽는 법을 배웁니다. 한 점의 완성도로 손님이 박수치게 만듭니다.' },
      { q: '밀푀유나베 황금레시피', tags: { style: '일식', main: '고기', diff: '초보', time: '30분' }, hook: '비주얼 끝판왕 한 냄비', why: '예쁜 비주얼과 다 함께 끓여 먹는 즐거움이 있어 집들이에 가장 자주 등장하는 메뉴입니다. 준비도 간단하고 실패 위험이 없습니다.' },
      { q: '류수영 감자 뇨끼', tags: { style: '이탈리안', main: '밥', diff: '중급', time: '30분' }, hook: '어남선생표 고급 뇨끼', why: '평범한 감자가 고급 이탈리안 메뉴로 변신하는 과정 자체가 손님 앞에서 보여줄 만한 쇼입니다. 비주얼과 맛 둘 다 잡았습니다.' },
      { q: '백종원 찹스테이크', tags: { style: '양식', main: '고기', diff: '초보', time: '30분' }, hook: '푸짐한 메인, 누구나 만족', why: '비싸게 사먹지 않아도 집에서 푸짐하게 만들 수 있는 인기 파티 메인입니다. 호불호 없이 모두가 좋아합니다.' },
      { q: '승우아빠 라자냐', tags: { style: '이탈리안', main: '면', diff: '중급', time: '1시간이상' }, hook: '한 판이면 식탁이 가득', why: '한 판으로 여러 명을 든든하게 먹일 수 있어 홈파티에 최적인 메뉴입니다. 만들어 두면 손님 도착 후 데우기만 하면 됩니다.' },
      { q: '꿀키 라따뚜이', tags: { style: '프렌치', main: '채소', diff: '중급', time: '1시간이상' }, hook: '예쁘게 한 상 뽐내기', why: '비주얼이 압도적이라 사진부터 찍게 되는 프랑스 시골 메뉴입니다. 채식 손님까지 만족시키는 호스트 비책입니다.' },
    ],
    hookFallback: '한 상 차리는 호스트 메뉴',
  },
  {
    id: 'cook-together', name: '같이 만들기', emoji: '👫',
    concept: '둘이 함께 손이 많이 가는 메뉴. 재료 분담, 만드는 과정 자체가 데이트.',
    seeds: [
      { q: '백종원 만두 만들기', tags: { style: '한식', main: '고기', diff: '중급', time: '1시간이상' }, hook: '둘이 빚으면 더 맛있어요', why: '재료 다지기와 빚기를 분담하면 자연스럽게 손이 닿고 대화가 늘어납니다. 결과물보다 과정이 추억으로 남는 대표 메뉴입니다.' },
      { q: '백종원 김밥 마는법', tags: { style: '한식', main: '밥', diff: '초보', time: '30분' }, hook: '재료 분담 데이트의 정석', why: '여러 가지 재료를 같이 준비하고 마는 과정에서 호흡이 맞아야 하는 협업형 요리입니다. 소풍 가는 느낌까지 덤으로 챙깁니다.' },
      { q: '승우아빠 수제버거 패티', tags: { style: '양식', main: '고기', diff: '중급', time: '30분' }, hook: '패티 굽기는 누구 담당?', why: '패티, 빵, 토핑을 분담해서 만드는 재미가 있고 완성 후 자기 버거를 조립하는 즐거움까지 챙깁니다. 사진도 잘 나옵니다.' },
      { q: '이연복 딤섬 만들기', tags: { style: '중식', main: '고기', diff: '상급', time: '1시간이상' }, hook: '딤섬도 둘이서 척척', why: '난이도는 있지만 둘이 같이 빚으면 시간이 빨리 갑니다. 작은 손기술이 늘면서 함께 성장하는 느낌까지 챙깁니다.' },
      { q: '햄지 떡볶이 만들기', tags: { style: '한식', main: '떡', diff: '초보', time: '30분' }, hook: '같이 끓이며 수다 한판', why: '한 냄비에 둘이 같이 끓이며 간을 보는 그 시간이 핵심입니다. 부담 없는 메뉴라 어떤 둘이든 즐길 수 있습니다.' },
      { q: '꿀키 마카롱 만들기', tags: { style: '디저트', main: '달걀', diff: '상급', time: '1시간이상' }, hook: '디저트도 같이 만들기', why: '예민한 디저트일수록 두 사람의 합이 중요합니다. 성공하면 짜릿하고, 실패해도 둘만의 추억이 남습니다.' },
      { q: '꿀키 수제 피자 도우', tags: { style: '이탈리안', main: '빵', diff: '중급', time: '1시간이상' }, hook: '도우부터 둘이서 만들어요', why: '도우 반죽부터 토핑까지 모든 단계를 함께하는 진짜 집밥 데이트입니다. 둘이 만든 피자만큼 맛있는 건 없습니다.' },
    ],
    hookFallback: '둘이 같이 만드는 추억',
  },
  {
    id: 'lunchbox', name: '출근 도시락', emoji: '🍱',
    concept: '남친이 출근할 때 챙겨주는 도시락. 전날 밤 준비 가능, 보온/식어도 맛있음, 색감 균형, 새벽에 빨리 만들 수 있는 메뉴.',
    seeds: [
      { q: '소불고기 도시락 만들기', tags: { style: '한식', main: '고기', diff: '초보', time: '30분' }, hook: '아침마다 챙겨주고 싶은', why: '식어도 맛이 변하지 않는 양념 소불고기는 도시락의 기본기입니다. 전날 양념해두면 아침에 굽기만 하면 됩니다.' },
      { q: '주먹밥 도시락 레시피', tags: { style: '한식', main: '밥', diff: '초보', time: '10분' }, hook: '한 손에 쏙, 든든한 한 끼', why: '점심에 자리를 비우기 어려운 직장인을 위한 가장 실용적인 도시락 메뉴입니다. 모양과 속재료만 바꿔도 매일 새롭습니다.' },
      { q: '닭다리 데리야끼 도시락', tags: { style: '일식', main: '고기', diff: '초보', time: '30분' }, hook: '도시락 열면 환호 보장', why: '식어도 맛있고 색감까지 예뻐서 도시락 메뉴의 챔피언입니다. 양념을 미리 재워두면 아침이 편합니다.' },
      { q: '계란말이 도시락 반찬', tags: { style: '한식', main: '달걀', diff: '초보', time: '10분' }, hook: '5분이면 도시락 완성', why: '5분 안에 완성되는 도시락 필수 반찬입니다. 색감과 영양 균형까지 한 번에 챙길 수 있습니다.' },
      { q: '햄지 도시락 브이로그', tags: { style: '한식', main: '밥', diff: '초보', time: '30분' }, hook: '햄지표 정성 도시락', why: '한 끼를 정성껏 챙기는 햄지의 도시락 브이로그는 따라하기 좋은 모범입니다. 사랑이 담긴 한 끼의 정석을 보여줍니다.' },
      { q: '키친마이야르 남편 도시락', tags: { style: '한식', main: '밥', diff: '초보', time: '30분' }, hook: '매일 챙기는 그 마음', why: '평일 아침 매일 도시락을 챙기는 영상으로, 메뉴 구성과 시간 관리 노하우가 가득합니다. 따라하면 누구나 매일 챙길 수 있습니다.' },
      { q: '나물할매 도시락 반찬', tags: { style: '한식', main: '채소', diff: '초보', time: '30분' }, hook: '식어도 맛있는 한식 도시락', why: '식어도 맛있는 한식 반찬의 정석입니다. 미리 만들어 두고 며칠씩 활용할 수 있어 아침이 여유로워집니다.' },
    ],
    hookFallback: '출근 챙기는 따뜻한 한 끼',
  },
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

function buildTags(s) {
  return {
    mood: [],
    difficulty: s.diff,
    time: s.time,
    format: '롱폼',
    pairing: ['없음'],
    occasion: s.style === '한식' ? ['평일저녁'] : ['데이트'],
    style: [s.style],
    ingredient_focus: [s.main],
    budget: '보통',
  };
}

(async () => {
  const all = [];
  for (const cat of REMAINING) {
    console.log(`\n[${cat.emoji} ${cat.name}]`);
    const dishes = [];
    for (let i = 0; i < cat.seeds.length; i++) {
      const s = cat.seeds[i];
      const yt = ytdlpSearch(s.q);
      if (!yt) {
        console.log(`  ❌ [${i + 1}] yt-dlp 실패: ${s.q}`);
        continue;
      }
      const meta = await oembedVerify(yt.youtube_url);
      if (!meta) {
        console.log(`  ❌ [${i + 1}] oembed 실패: ${s.q}`);
        continue;
      }
      const dish = {
        id: `love-${cat.id}-${dishes.length + 1}`,
        title: meta.title,
        channel: meta.channel,
        youtube_url: yt.youtube_url,
        thumbnail: meta.thumbnail,
        estimated_duration: yt.estimated_duration,
        tags: buildTags(s.tags),
        hook: s.hook || cat.hookFallback,
        why_recommended: s.why,
        is_curator_pick: i < 3,
      };
      dishes.push(dish);
      console.log(`  ✅ [${i + 1}] ${meta.channel} - ${meta.title.slice(0, 50)}`);
    }
    const result = {
      category_id: cat.id,
      category_name: cat.name,
      category_emoji: cat.emoji,
      concept: cat.concept,
      dishes,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${cat.id}.json`), JSON.stringify(result, null, 2));
    all.push(result);
  }
  console.log(`\n=== 폴백 완료 === ${all.length} 카테고리, ${all.reduce((s, c) => s + c.dishes.length, 0)} dish`);
})();
