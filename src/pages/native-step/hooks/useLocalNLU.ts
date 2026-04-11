/**
 * useLocalNLU – 정규식 + 키워드 기반 의도 분류 (Tier1)
 *
 * 파이프라인:
 *   normalize  → 한글 숫자 변환, 키워드 강제 띄어쓰기, 조사 제거
 *   slots      → 앵커 윈도우 기반 슬롯 추출 (timer/step/sceneNumber)
 *   classify   → 슬롯 + 키워드 룰로 인텐트 결정
 *
 * 지원 인텐트:
 *   NEXT_STEP / PREV_STEP / PLAY / PAUSE
 *   GO_TO_SCENE_NUMBER     - "1번", "2번 장면", "장면 3"
 *   TIMER_START            - "타이머 5분 켜줘", "5분 알람"
 *   TIMER_CANCEL           - "타이머 취소", "알람 꺼"
 *   TIMER_PAUSE            - "타이머 멈춰"
 *   TIMER_RESUME           - "타이머 다시 시작"
 */

import type { IntentLabel } from './onnxNLU';

export type LocalNLUPayload = {
  stepNumber?: number;
  sceneNumber?: number;
  durationSec?: number;
}

export type LocalNLUResult = {
  intent: IntentLabel;
  payload: LocalNLUPayload;
}

// ─── 한글 숫자 사전 (단위와 결합될 때만 변환) ───
const KOREAN_NUM: Record<string, number> = {
  영: 0, 공: 0,
  일: 1, 한: 1, 하나: 1, 첫: 1, 첫번째: 1,
  이: 2, 두: 2, 둘: 2, 두번째: 2,
  삼: 3, 세: 3, 셋: 3, 세번째: 3,
  사: 4, 네: 4, 넷: 4, 네번째: 4,
  오: 5, 다섯: 5, 다섯번째: 5,
  육: 6, 여섯: 6, 여섯번째: 6,
  칠: 7, 일곱: 7, 일곱번째: 7,
  팔: 8, 여덟: 8, 여덟번째: 8,
  구: 9, 아홉: 9, 아홉번째: 9,
  십: 10, 열: 10, 열번째: 10,
  십일: 11, 열하나: 11, 십이: 12, 열둘: 12,
  십오: 15, 이십: 20, 삼십: 30, 사십: 40, 오십: 50, 육십: 60,
};

const UNITS = ['분', '초', '시간', '단계', '스텝', '번'];

// 긴 단어부터 매칭 (다섯번째 → 다섯 충돌 방지)
const KOREAN_NUM_KEYS = Object.keys(KOREAN_NUM).sort((a, b) => b.length - a.length);

// ─── 키워드 사전 ───
const TIMER_START_VERBS = ['켜', '시작', '맞춰', '재줘', '재', '돌려', '설정', '걸어', '잡아'];
const TIMER_CANCEL_VERBS = ['취소', '꺼', '끄', '지워', '없애', '중단', '종료'];
const TIMER_PAUSE_VERBS = ['멈춰', '정지', '일시정지', '잠깐'];
const TIMER_RESUME_VERBS = ['재개', '계속', '다시'];

const NEXT_KEYWORDS = ['다음', '넘어가', '넘겨', '넘어', 'next'];
const PREV_KEYWORDS = ['이전', '뒤로', '앞으로', '되돌', 'previous', 'back'];
const PLAY_KEYWORDS = ['재생', '플레이', 'play'];
const PAUSE_KEYWORDS = ['정지', '멈춰', '일시정지', '스탑', 'stop', 'pause'];

// 키워드 강제 띄어쓰기 대상 (긴 것부터)
const SPACING_KEYWORDS = [
  '타이머', '알람', '단계', '스텝', '장면',
  '다음', '이전', '뒤로', '앞으로', '재생', '플레이',
  '시작', '취소', '재개',
].sort((a, b) => b.length - a.length);

// 조사 (단어 경계 보호)
const PARTICLE_RE = /(을|를|이|가|은|는|에서|으로|로|에|도|만|까지|부터|랑|이랑|와|과|께|께서)(\s|$)/g;

// ─── Stage 1: 정규화 ───
export function normalize(raw: string): string {
  let text = raw.trim().toLowerCase();
  if (!text) return '';

  // 1. 키워드 경계에 공백 강제 삽입 (붙여쓴 발화 처리)
  for (const kw of SPACING_KEYWORDS) {
    text = text.split(kw).join(` ${kw} `);
  }

  // 2. 한글 숫자 + 단위 → 아라비아 (단위 결합 시에만 변환)
  for (const unit of UNITS) {
    for (const word of KOREAN_NUM_KEYS) {
      const num = KOREAN_NUM[word];
      const re = new RegExp(`${word}\\s*${unit}`, 'g');
      text = text.replace(re, `${num}${unit}`);
    }
  }

  // 3. 조사 제거 (의미 키워드 뒤에 붙은 것)
  text = text.replace(PARTICLE_RE, ' ');

  // 4. 공백 정리
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// ─── Stage 2: 앵커 윈도우 기반 슬롯 추출 ───
const ANCHOR_WINDOW_BACK = 4;   // 앵커 앞으로 N글자
const ANCHOR_WINDOW_FORWARD = 14; // 앵커 뒤로 N글자

function findInWindow(
  text: string,
  anchorRe: RegExp,
  slotRe: RegExp,
): RegExpMatchArray | null {
  const m = text.match(anchorRe);
  if (!m || m.index === undefined) return null;
  const start = Math.max(0, m.index - ANCHOR_WINDOW_BACK);
  const end = Math.min(text.length, m.index + m[0].length + ANCHOR_WINDOW_FORWARD);
  const window = text.slice(start, end);
  return window.match(slotRe);
}

type Slots = {
  timerDurationSec?: number;  // 0 = 숫자 없는 타이머 명령(취소/멈춤 등)
  hasTimerAnchor: boolean;
  stepNumber?: number;
  sceneNumber?: number;
}

export function extractSlots(normalized: string): Slots {
  const slots: Slots = { hasTimerAnchor: false };

  // ── Timer slot ──
  const timerAnchorRe = /(타이머|알람)/;
  if (timerAnchorRe.test(normalized)) {
    slots.hasTimerAnchor = true;
    const m = findInWindow(normalized, timerAnchorRe, /(\d+)\s*(분|초|시간)/);
    if (m) {
      const num = parseInt(m[1], 10);
      const unit = m[2];
      if (unit === '분') slots.timerDurationSec = num * 60;
      else if (unit === '초') slots.timerDurationSec = num;
      else if (unit === '시간') slots.timerDurationSec = num * 3600;
    }
  } else {
    // 앵커 없어도 "5분" 단독 + 액션 동사 케이스 (옵션)
    // ex: "5분 재줘" — 보수적으로 동사 검사 후에만
    const timerActionRe = new RegExp(`(\\d+)\\s*(분|초|시간)\\s*(?=.*(${TIMER_START_VERBS.join('|')}))`);
    const m = normalized.match(timerActionRe);
    if (m) {
      slots.hasTimerAnchor = true;
      const num = parseInt(m[1], 10);
      const unit = m[2];
      if (unit === '분') slots.timerDurationSec = num * 60;
      else if (unit === '초') slots.timerDurationSec = num;
      else if (unit === '시간') slots.timerDurationSec = num * 3600;
    }
  }

  // ── Step slot ──
  const stepAnchorRe = /(단계|스텝)/;
  if (stepAnchorRe.test(normalized)) {
    const m = findInWindow(normalized, stepAnchorRe, /(\d+)/);
    if (m) slots.stepNumber = parseInt(m[1], 10);
  }

  // ── Scene number slot ──
  // 우선 "장면" 앵커
  const sceneAnchorRe = /장면/;
  if (sceneAnchorRe.test(normalized)) {
    const m = findInWindow(normalized, sceneAnchorRe, /(\d+)/);
    if (m) slots.sceneNumber = parseInt(m[1], 10);
  }
  // "N번" 단독 (단, "N번째"는 step/scene 모호 → step 슬롯 없을 때만)
  if (slots.sceneNumber === undefined && slots.stepNumber === undefined) {
    const m = normalized.match(/(\d+)\s*번(?!째)/);
    if (m) slots.sceneNumber = parseInt(m[1], 10);
  }

  return slots;
}

// ─── Stage 3: 인텐트 분류 ───
function containsAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export function classifyLocal(rawText: string): LocalNLUResult | null {
  const text = normalize(rawText);
  if (!text) return null;

  const slots = extractSlots(text);

  // ── 1. Timer 인텐트 (앵커 우선) ──
  if (slots.hasTimerAnchor) {
    if (containsAny(text, TIMER_CANCEL_VERBS)) {
      return { intent: 'TIMER_CANCEL', payload: {} };
    }
    if (containsAny(text, TIMER_PAUSE_VERBS)) {
      return { intent: 'TIMER_PAUSE', payload: {} };
    }
    if (containsAny(text, TIMER_RESUME_VERBS)) {
      return { intent: 'TIMER_RESUME', payload: {} };
    }
    if (slots.timerDurationSec && slots.timerDurationSec > 0) {
      // 동사 없어도 숫자 + 타이머 앵커면 시작으로 간주
      return {
        intent: 'TIMER_START',
        payload: { durationSec: slots.timerDurationSec },
      };
    }
  }

  // ── 2. Step jump ──
  if (slots.stepNumber !== undefined) {
    return { intent: 'GO_TO_STEP', payload: { stepNumber: slots.stepNumber } };
  }

  // ── 3. Scene by number ──
  if (slots.sceneNumber !== undefined) {
    return {
      intent: 'GO_TO_SCENE_NUMBER',
      payload: { sceneNumber: slots.sceneNumber },
    };
  }

  // ── 4. Next/Prev/Play/Pause (slot 없음) ──
  if (containsAny(text, NEXT_KEYWORDS)) return { intent: 'NEXT_STEP', payload: {} };
  if (containsAny(text, PREV_KEYWORDS)) return { intent: 'PREV_STEP', payload: {} };
  if (containsAny(text, PLAY_KEYWORDS)) return { intent: 'PLAY', payload: {} };
  if (containsAny(text, PAUSE_KEYWORDS)) return { intent: 'PAUSE', payload: {} };

  return null;
}
