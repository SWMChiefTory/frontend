import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@cheftory:tutorial:';

/**
 * 페이지별 contextual onboarding의 "처음 본 적 있는가" 플래그를 관리.
 *
 * 사용 예: 쿠킹 모드 첫 진입 시 음성 명령 안내, 레시피 detail 첫 진입 시 단계 카드 안내 등.
 *
 * @param featureKey  'share' | 'cooking_mode' | 'recipe_detail' 등
 * @returns
 *   seen     — 본 적 있는지. AsyncStorage 로드 전엔 undefined (loading)
 *   markSeen — 튜토리얼 완료/스킵 시 호출하여 다시 안 뜨게 함
 *   reset    — 디버깅/테스트용. 다시 보게 함
 */
export function useFeatureTutorial(featureKey: string) {
  const storageKey = `${KEY_PREFIX}${featureKey}`;
  const [seen, setSeen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!cancelled) setSeen(value === '1');
      })
      .catch(() => {
        if (!cancelled) setSeen(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const markSeen = useCallback(async () => {
    try {
      await AsyncStorage.setItem(storageKey, '1');
      setSeen(true);
    } catch (e) {
      console.warn('[Tutorial] markSeen failed:', e);
    }
  }, [storageKey]);

  const reset = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
      setSeen(false);
    } catch (e) {
      console.warn('[Tutorial] reset failed:', e);
    }
  }, [storageKey]);

  return { seen, markSeen, reset };
}
