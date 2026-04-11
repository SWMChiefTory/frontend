import { useEffect } from "react";
import { useMarketStore } from "../store/marketStore";
import { getMarket } from "../api/market-api";
import {
  getCachedMarket,
  setCachedMarket as saveCachedMarket,
} from "../storage/marketCache";
import { getLanguagePreference } from "../storage/languagePreference";
import { getMarketFromDeviceLocale } from "../utils/deviceLocale";

export function useMarketBootstrap() {
  const { setMarket, setCachedMarket, setError, isLoading } = useMarketStore();

  useEffect(() => {
    const init = async () => {
      try {
        // Step 0: 사용자가 설정에서 직접 선택한 언어 (최우선)
        const userPref = await getLanguagePreference();
        if (userPref) {
          console.debug("[Market Bootstrap] ✅ 사용자 언어 설정:", userPref);
          setCachedMarket(userPref);
          setMarket(userPref, '');
          return;
        }

        // Step 1: AsyncStorage 캐시 확인 (5-10ms)
        const cached = await getCachedMarket();

        if (cached) {
          console.debug("[Market Bootstrap] ✅ 캐시 사용:", cached);
          setCachedMarket(cached);
        } else {
          console.debug("[Market Bootstrap] ⚠️ 캐시 없음, device locale 사용");
          const fallbackMarket = getMarketFromDeviceLocale();
          setCachedMarket(fallbackMarket);
        }

        // Step 2: 서버에서 정확한 market 정보 받아오기 (백그라운드)
        const t0 = performance.now();
        const response = await getMarket();
        console.log(`[Perf:Bootstrap] getMarket() | ${(performance.now() - t0).toFixed(0)}ms`);
        setMarket(response.market, response.country_code);

        // Step 3: AsyncStorage 캐시 업데이트 (다음 실행을 위해)
        await saveCachedMarket(response.market);
      } catch (error) {
        // getMarket()은 절대 reject하지 않음 (API 오류 시 KOREA 폴백 반환)
        // 이 catch는 예기치 않은 프로그래밍 오류만 처리
        console.error("[Market Bootstrap] ❌ 예기치 않은 에러:", error);
        setError(
          error instanceof Error ? error : new Error("Market Bootstrap 실패"),
        );
      }
    };

    init();
    // Zustand setters는 stable reference이므로 deps 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isLoading };
}
