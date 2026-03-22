/**
 * useLocalNLU – 키워드 기반 Tier1 빠른 의도 분류
 *
 * ONNX 모델 로딩 전에도 즉시 동작하는 규칙 기반 분류.
 * "다음", "이전", "재생", "정지" 등 명확한 키워드를 감지.
 */

import type { IntentLabel } from './onnxNLU';

export interface LocalNLUResult {
  intent: IntentLabel;
  stepNumber?: number;
}

const NEXT_KEYWORDS = ['다음', '넘어가', '넘겨', '다음 단계', '다음 스텝', 'next'];
const PREV_KEYWORDS = ['이전', '뒤로', '이전 단계', '이전 스텝', '앞으로', 'previous', 'back'];
const PLAY_KEYWORDS = ['재생', '시작', '플레이', 'play', 'start'];
const PAUSE_KEYWORDS = ['정지', '멈춰', '일시정지', '스탑', '멈춤', 'stop', 'pause'];
const GOTO_KEYWORDS = ['단계', '스텝', 'step'];

const KOREAN_NUMBERS: Record<string, number> = {
  첫: 1, 하나: 1, 한: 1, 일: 1,
  두: 2, 둘: 2, 이: 2,
  세: 3, 셋: 3, 삼: 3,
  네: 4, 넷: 4, 사: 4,
  다섯: 5, 오: 5,
  여섯: 6, 육: 6,
  일곱: 7, 칠: 7,
  여덟: 8, 팔: 8,
  아홉: 9, 구: 9,
  열: 10, 십: 10,
};

function extractStepNumber(text: string): number | undefined {
  const digitMatch = text.match(/(\d+)/);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  for (const [word, num] of Object.entries(KOREAN_NUMBERS)) {
    if (text.includes(word)) return num;
  }
  return undefined;
}

/**
 * 키워드 기반 의도 분류.
 * 매칭되면 결과 반환, 아니면 null (→ ONNX NLU로 폴백).
 */
export function classifyLocal(text: string): LocalNLUResult | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;

  // GO_TO_STEP: "3단계", "스텝 2" 등 숫자 + 단계 키워드
  for (const kw of GOTO_KEYWORDS) {
    if (normalized.includes(kw)) {
      const stepNum = extractStepNumber(normalized);
      if (stepNum !== undefined) {
        return { intent: 'GO_TO_STEP', stepNumber: stepNum };
      }
    }
  }

  // NEXT_STEP
  for (const kw of NEXT_KEYWORDS) {
    if (normalized.includes(kw)) {
      return { intent: 'NEXT_STEP' };
    }
  }

  // PREV_STEP
  for (const kw of PREV_KEYWORDS) {
    if (normalized.includes(kw)) {
      return { intent: 'PREV_STEP' };
    }
  }

  // PLAY
  for (const kw of PLAY_KEYWORDS) {
    if (normalized.includes(kw)) {
      return { intent: 'PLAY' };
    }
  }

  // PAUSE
  for (const kw of PAUSE_KEYWORDS) {
    if (normalized.includes(kw)) {
      return { intent: 'PAUSE' };
    }
  }

  return null;
}
