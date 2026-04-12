import * as Linking from 'expo-linking';
import { useDeepLinkStore } from '@/src/shared/store/deep-link-store';

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    handleExternalDeepLink(path, initial);
    // cold start → 홈으로 이동
    // warm → 현재 화면 유지 (DeepLinkHandler가 모달로 처리)
    return initial ? '/' : null;
  } catch {
    return '/unexpected-error';
  }
}

const handleExternalDeepLink = (url: string, _initial: boolean) => {
  console.log('[DeepLink] raw path:', url, 'initial:', _initial);

  // 시스템/OAuth URL 무시
  if (
    url.includes('expo-development-client') ||
    url.includes('com.googleusercontent.apps') ||
    url.startsWith('com.googleusercontent.apps')
  ) {
    return;
  }

  const parsedUrl = Linking.parse(url);
  const queryParams = parsedUrl.queryParams ?? {};

  const recipeId =
    (typeof queryParams['recipeId'] === 'string' && queryParams['recipeId']) ||
    (typeof queryParams['recipe-id'] === 'string' && queryParams['recipe-id']) ||
    null;

  const videoId =
    (typeof queryParams['video-id'] === 'string' && queryParams['video-id']) ||
    null;

  const from = typeof queryParams['from'] === 'string' ? queryParams['from'] : null;

  console.log('[DeepLink] parsed:', JSON.stringify({ recipeId, videoId, from }));

  // 1) 타이머/위젯 → 요리 모드
  if (recipeId && from === 'timer') {
    useDeepLinkStore.getState().setPending({ type: 'cooking', recipeId });
    return;
  }

  // 2) 레시피 생성 완료 / 위젯 탭 (from 없는 recipeId) → 상세
  if (recipeId) {
    useDeepLinkStore.getState().setPending({ type: 'detail', recipeId });
    return;
  }

  // 3) 외부 공유 (video-id) → 레시피 생성 시트
  if (videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    useDeepLinkStore.getState().setPending({ type: 'share', videoUrl });
    return;
  }
};
