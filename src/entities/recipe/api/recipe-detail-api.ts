import { client } from '@/src/modules/shared/api/client';

export interface VideoInfo {
  videoId: string;
  videoThumbnailUrl: string;
  videoSeconds: number;
  videoTitle: string;
  channelTitle: string;
}

export interface Ingredient {
  name: string;
  amount: number | null;
  unit: string | null;
}

export interface StepDetail {
  text: string;
  start: number;
}

export interface RecipeStep {
  stepOrder: number;
  subtitle: string;
  startTime: number;
  details: StepDetail[];
}

export interface RecipeDetail {
  recipeId: string;
  videoInfo: VideoInfo;
  description: string;
  cookingTime: number;
  servings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tags: string[];
  isEnrolled: boolean;
}

export async function fetchRecipeDetail(id: string): Promise<RecipeDetail> {
  const res = await client.get(`/recipes/${id}`);
  const raw = res.data;

  const videoInfo = raw.video_info ?? raw.videoInfo ?? {};
  const meta = raw.recipe_detail_meta ?? raw.recipeDetailMeta ?? {};
  const ingredients = raw.recipe_ingredient ?? raw.recipeIngredient ?? [];
  const steps = raw.recipe_steps ?? raw.recipeSteps ?? [];
  const tags = raw.recipe_tags ?? raw.recipeTags ?? [];
  const viewStatus = raw.view_status ?? raw.viewStatus;

  return {
    recipeId: id,
    videoInfo: {
      videoId: videoInfo.video_id ?? videoInfo.videoId ?? '',
      videoThumbnailUrl: videoInfo.video_thumbnail_url ?? videoInfo.videoThumbnailUrl ?? '',
      videoSeconds: videoInfo.video_seconds ?? videoInfo.videoSeconds ?? 0,
      videoTitle: videoInfo.video_title ?? videoInfo.videoTitle ?? '',
      channelTitle: videoInfo.channel_title ?? videoInfo.channelTitle ?? '',
    },
    description: meta.description ?? '',
    cookingTime: meta.cooking_time ?? meta.cookingTime ?? 0,
    servings: meta.servings ?? 0,
    ingredients: ingredients.map((i: any) => ({
      name: i.name ?? '',
      amount: i.amount?.value ?? i.amount ?? null,
      unit: i.amount?.unit ?? i.unit ?? null,
    })),
    steps: steps.map((s: any) => ({
      stepOrder: s.step_order ?? s.stepOrder ?? s.order ?? 0,
      subtitle: s.subtitle ?? s.title ?? '',
      startTime: s.start_time ?? s.startTime ?? 0,
      details: (s.details ?? []).map((d: any) => ({
        text: d.text ?? d.content ?? '',
        start: d.start ?? 0,
      })),
    })),
    tags: tags.map((t: any) => t.name ?? t),
    isEnrolled: viewStatus != null,
  };
}
