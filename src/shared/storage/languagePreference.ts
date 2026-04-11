import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Market } from '../types/market';

const LANGUAGE_PREF_KEY = 'user_language_preference';

/** 사용자가 설정에서 직접 선택한 언어. null이면 자동 감지(서버/디바이스). */
export async function getLanguagePreference(): Promise<Market | null> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_PREF_KEY);
    if (value === 'KOREA' || value === 'GLOBAL') return value;
    return null;
  } catch {
    return null;
  }
}

export async function setLanguagePreference(market: Market): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_PREF_KEY, market);
  } catch (e) {
    console.error('[LanguagePref] save failed:', e);
  }
}

export async function clearLanguagePreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LANGUAGE_PREF_KEY);
  } catch (e) {
    console.error('[LanguagePref] clear failed:', e);
  }
}
