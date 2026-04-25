import { useEffect } from 'react';
import { useRecipeProgress, RecipeStatus } from '@/src/entities/recipe';
import { useRecipeCreateStore } from '@/src/shared/store/recipe-create-store';

/**
 * 단일 생성 중 레시피의 진행 상태를 폴링하는 invisible watcher.
 * SUCCESS / FAILED / BLOCKED / BANNED 시 store에서 제거.
 */
function WatcherItem({ recipeId }: { recipeId: string }) {
  const removeCreating = useRecipeCreateStore((s) => s.removeCreating);
  const { data: status } = useRecipeProgress(recipeId);

  useEffect(() => {
    // SUCCESS만 자동 제거 (1.5초 후).
    // FAILED/BLOCKED/BANNED는 사용자가 카드의 X 버튼으로 직접 dismiss해야 함.
    if (status === RecipeStatus.SUCCESS) {
      const timer = setTimeout(() => removeCreating(recipeId), 1500);
      return () => clearTimeout(timer);
    }
  }, [status, recipeId, removeCreating]);

  return null;
}

/**
 * store에 등록된 모든 생성 중 레시피의 진행을 폴링.
 * 홈 화면에 한 번만 마운트.
 */
export function CreatingRecipeWatcher() {
  const creating = useRecipeCreateStore((s) => s.creatingRecipes);
  return (
    <>
      {creating.map((r) => (
        <WatcherItem key={r.recipeId} recipeId={r.recipeId} />
      ))}
    </>
  );
}
