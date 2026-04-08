import { z } from 'zod';
import { client } from '@/src/shared/api';

// ─── Raw schemas ─────────────────────────────────────────────────

const RawVideoInfoSchema = z
  .object({
    video_id: z.string().nullish(),
    video_thumbnail_url: z.string().nullish(),
    video_seconds: z.number().nullish(),
    video_title: z.string().nullish(),
    channel_title: z.string().nullish(),
  })
  .passthrough();

const RawIngredientAmountSchema = z
  .object({
    value: z.number().nullish(),
    unit: z.string().nullish(),
  })
  .passthrough();

const RawIngredientSchema = z
  .object({
    name: z.string(),
    amount: z.union([z.number(), RawIngredientAmountSchema]).nullish(),
    unit: z.string().nullish(),
  })
  .passthrough();

const RawStepDetailSchema = z
  .object({
    text: z.string().nullish(),
    content: z.string().nullish(),
    start: z.number().nullish(),
  })
  .passthrough();

const RawStepSchema = z
  .object({
    step_order: z.number().nullish(),
    order: z.number().nullish(),
    subtitle: z.string().nullish(),
    title: z.string().nullish(),
    start_time: z.number().nullish(),
    details: z.array(RawStepDetailSchema).default([]),
  })
  .passthrough();

const RawRecipeDetailMetaSchema = z
  .object({
    description: z.string().nullish(),
    cooking_time: z.number().nullish(),
    servings: z.number().nullish(),
  })
  .passthrough();

const RawRecipeTagSchema = z.union([
  z.string(),
  z.object({ name: z.string() }).passthrough(),
]);

const RawRecipeDetailResponseSchema = z
  .object({
    video_info: RawVideoInfoSchema.optional(),
    recipe_detail_meta: RawRecipeDetailMetaSchema.optional(),
    recipe_ingredient: z.array(RawIngredientSchema).default([]),
    recipe_steps: z.array(RawStepSchema).default([]),
    recipe_tags: z.array(RawRecipeTagSchema).default([]),
    view_status: z.any().nullish(),
  })
  .passthrough();

type RawIngredient = z.infer<typeof RawIngredientSchema>;
type RawStep = z.infer<typeof RawStepSchema>;
type RawStepDetail = z.infer<typeof RawStepDetailSchema>;
type RawVideoInfo = z.infer<typeof RawVideoInfoSchema>;

// ─── Client types ────────────────────────────────────────────────

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

// ─── Transformers ────────────────────────────────────────────────

function toVideoInfo(raw: RawVideoInfo | undefined): VideoInfo {
  return {
    videoId: raw?.video_id ?? '',
    videoThumbnailUrl: raw?.video_thumbnail_url ?? '',
    videoSeconds: raw?.video_seconds ?? 0,
    videoTitle: raw?.video_title ?? '',
    channelTitle: raw?.channel_title ?? '',
  };
}

function toIngredient(raw: RawIngredient): Ingredient {
  if (typeof raw.amount === 'number') {
    return { name: raw.name, amount: raw.amount, unit: raw.unit ?? null };
  }
  if (raw.amount && typeof raw.amount === 'object') {
    return {
      name: raw.name,
      amount: raw.amount.value ?? null,
      unit: raw.amount.unit ?? null,
    };
  }
  return { name: raw.name, amount: null, unit: raw.unit ?? null };
}

function toStepDetail(raw: RawStepDetail): StepDetail {
  return {
    text: raw.text ?? raw.content ?? '',
    start: raw.start ?? 0,
  };
}

function toStep(raw: RawStep): RecipeStep {
  return {
    stepOrder: raw.step_order ?? raw.order ?? 0,
    subtitle: raw.subtitle ?? raw.title ?? '',
    startTime: raw.start_time ?? 0,
    details: (raw.details ?? []).map(toStepDetail),
  };
}

// ─── API ─────────────────────────────────────────────────────────

export async function fetchRecipeDetail(id: string): Promise<RecipeDetail> {
  let res;
  try {
    res = await client.get(`/recipes/${id}`);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[fetchRecipeDetail] FAIL', {
      id,
      status: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
    });
    throw err;
  }
  const parsed = RawRecipeDetailResponseSchema.parse(res.data);

  return {
    recipeId: id,
    videoInfo: toVideoInfo(parsed.video_info),
    description: parsed.recipe_detail_meta?.description ?? '',
    cookingTime: parsed.recipe_detail_meta?.cooking_time ?? 0,
    servings: parsed.recipe_detail_meta?.servings ?? 0,
    ingredients: parsed.recipe_ingredient.map(toIngredient),
    steps: parsed.recipe_steps.map(toStep),
    tags: parsed.recipe_tags.map((t) => (typeof t === 'string' ? t : t.name)),
    isEnrolled: parsed.view_status != null,
  };
}
