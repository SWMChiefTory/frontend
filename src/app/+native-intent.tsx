import * as Linking from 'expo-linking';
import { useRecipeCreateStore } from '@/src/pages/home/model/recipe-create-store';

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    handleExternalDeepLink(path, initial);
    return '/';
  } catch {
    return '/unexpected-error';
  }
}

const handleExternalDeepLink = (url: string, _initial: boolean) => {
  console.log('handleExternalDeepLink', url);
  const parsedUrl = Linking.parse(url);
  const queryParams = parsedUrl.queryParams;

  // 시스템/OAuth URL 무시
  if (
    url.includes('expo-development-client') ||
    url.includes('com.googleusercontent.apps') ||
    url.startsWith('com.googleusercontent.apps')
  ) {
    return;
  }

  if (parsedUrl.hostname) return;

  // 공유 시트로 받은 유튜브 URL → 레시피 생성 시트 자동 오픈
  if (queryParams?.['video-id']) {
    const videoUrl = `https://www.youtube.com/watch?v=${queryParams['video-id']}`;
    useRecipeCreateStore.getState().requestOpen(videoUrl);
    return;
  }
};
