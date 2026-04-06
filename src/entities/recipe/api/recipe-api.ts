import { client } from '@/src/modules/shared/api/client';
import { RECIPE_MAP, DEFAULT_RECIPE_ID } from './mock-data';
import type { RecipeEntry } from './types';

/**
 * recipeId로 레시피 데이터를 가져옵니다.
 * 실제 API → RecipeEntry 변환. API 실패 시 목데이터 fallback.
 */
export async function fetchRecipeById(recipeId: string): Promise<RecipeEntry> {
  try {
    const res = await client.get(`/recipes/${recipeId}`);
    const raw = res.data;
    console.log(`[RecipeAPI] fetchRecipeById(${recipeId}) keys:`, Object.keys(raw));

    const videoInfo = raw.video_info ?? raw.videoInfo ?? {};
    const meta = raw.recipe_detail_meta ?? raw.recipeDetailMeta ?? {};
    const ingredients = raw.recipe_ingredient ?? raw.recipeIngredient ?? [];
    const steps = raw.recipe_steps ?? raw.recipeSteps ?? [];

    return {
      videoId: videoInfo.video_id ?? videoInfo.videoId ?? '',
      recipe: {
        title: videoInfo.video_title ?? videoInfo.videoTitle ?? '',
        description: meta.description ?? null,
        servings: meta.servings ?? null,
        cookingTimeMinutes: meta.cooking_time ?? meta.cookingTime ?? null,
        difficulty: '',
        category: '',
        ingredients: ingredients.map((i: any) => ({
          name: i.name ?? '',
          amount: {
            value: i.amount?.value ?? null,
            unit: i.amount?.unit ?? null,
          },
          substitute: i.substitute ?? null,
          selectionTip: i.selection_tip ?? i.selectionTip ?? null,
        })),
        tools: [],
        steps: steps.map((s: any) => ({
          order: s.step_order ?? s.stepOrder ?? s.order ?? 0,
          title: s.subtitle ?? s.title ?? '',
          description: (s.details ?? []).map((d: any) => ({
            content: d.text ?? d.content ?? '',
            start: formatSeconds(d.start ?? 0),
          })),
          tip: s.tip ?? null,
          knowledge: s.knowledge ?? null,
          scenes: (s.scenes ?? []).map((sc: any) => ({
            label: sc.label ?? '',
            start: formatSeconds(sc.start_time ?? sc.startTime ?? sc.start ?? 0),
            end: formatSeconds(sc.end_time ?? sc.endTime ?? sc.end ?? 0),
          })),
          timerSeconds: s.timer_seconds ?? s.timerSeconds ?? null,
          heatLevel: s.heat_level ?? s.heatLevel ?? null,
        })),
      },
    };
  } catch (err: any) {
    console.warn(`[RecipeAPI] fetchRecipeById(${recipeId}) failed:`, err?.response?.status, err?.message);

    // fallback: 목데이터
    const entry = RECIPE_MAP[recipeId] ?? RECIPE_MAP[DEFAULT_RECIPE_ID];
    if (!entry) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }
    return entry;
  }
}

function formatSeconds(totalSeconds: number): string {
  if (typeof totalSeconds === 'string') return totalSeconds;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
