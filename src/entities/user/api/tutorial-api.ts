import { isAxiosError } from 'axios';
import { client } from '@/src/shared/api';

const TUTORIAL_ERROR_CODE = 'USER_005';

/**
 * 튜토리얼 완료 API
 * @returns true: 첫 완료 (크레딧 지급됨), false: 이미 완료 (크레딧 미지급)
 */
export async function completeTutorial(): Promise<boolean> {
  try {
    await client.post('/users/tutorial');
    return true;
  } catch (error) {
    if (isAxiosError(error)) {
      const data = error.response?.data;
      const errorCode = data?.errorCode ?? data?.error_code;
      console.warn('[completeTutorial] error:', {
        status: error.response?.status,
        errorCode,
        message: data?.message,
      });
      if (errorCode === TUTORIAL_ERROR_CODE) {
        return false;
      }
    }
    throw error;
  }
}
