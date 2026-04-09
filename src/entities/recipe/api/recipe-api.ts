import { z } from 'zod';
import { client } from '@/src/shared/api';
import { RECIPE_MAP, DEFAULT_RECIPE_ID } from './mock-data';
import type { RecipeEntry } from './types';

// ─── Raw schemas ─────────────────────────────────────────────────

const RawVideoInfoSchema = z
  .object({
    video_id: z.string().nullish(),
    video_type: z.enum(['SHORTS', 'NORMAL']).nullish(),
    video_title: z.string().nullish(),
  });

const RawMetaSchema = z
  .object({
    description: z.string().nullish(),
    servings: z.number().nullish(),
    cooking_time: z.number().nullish(),
  });

const RawAmountSchema = z
  .object({
    value: z.number().nullish(),
    unit: z.string().nullish(),
  });

const RawIngredientSchema = z
  .object({
    name: z.string(),
    amount: z.union([z.number(), RawAmountSchema]).nullish(),
    unit: z.string().nullish(),
    substitute: z.string().nullish(),
    selection_tip: z.string().nullish(),
  });

const RawStepDetailSchema = z
  .object({
    text: z.string().nullish(),
    start: z.number().nullish(),
  });

const RawSceneSchema = z
  .object({
    label: z.string().nullish(),
    start_time: z.number().nullish(),
    end_time: z.number().nullish(),
  });

const RawStepSchema = z
  .object({
    step_order: z.number().nullish(),
    subtitle: z.string().nullish(),
    details: z.array(RawStepDetailSchema).default([]),
    scenes: z.array(RawSceneSchema).nullish(),
    tip: z.any().nullish(),
    knowledge: z.any().nullish(),
    timer_seconds: z.number().nullish(),
    heat_level: z.string().nullish(),
  });

const RawRecipeResponseSchema = z
  .object({
    video_info: RawVideoInfoSchema.optional(),
    recipe_detail_meta: RawMetaSchema.optional(),
    recipe_ingredient: z.array(RawIngredientSchema).default([]),
    recipe_steps: z.array(RawStepSchema).default([]),
  });

type RawIngredient = z.infer<typeof RawIngredientSchema>;
type RawStep = z.infer<typeof RawStepSchema>;
type RawStepDetail = z.infer<typeof RawStepDetailSchema>;
type RawScene = z.infer<typeof RawSceneSchema>;

// ─── Transformers ────────────────────────────────────────────────

function formatSeconds(totalSeconds: number | null | undefined): string {
  const s = totalSeconds ?? 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function toIngredient(raw: RawIngredient) {
  const isObjAmount = raw.amount && typeof raw.amount === 'object';
  return {
    name: raw.name,
    amount: {
      value: isObjAmount ? (raw.amount as any).value ?? null : (raw.amount as number | null) ?? null,
      unit: isObjAmount ? (raw.amount as any).unit ?? null : raw.unit ?? null,
    },
    substitute: raw.substitute ?? null,
    selectionTip: raw.selection_tip ?? null,
  };
}

function toScenesFromDetails(details: RawStepDetail[]) {
  return details.map((d, idx) => ({
    label: d.text ?? `장면 ${idx + 1}`,
    start: formatSeconds(d.start ?? 0),
    end: formatSeconds((details[idx + 1]?.start ?? d.start ?? 0) + 1),
  }));
}

function toScenesFromScenes(scenes: RawScene[]) {
  return scenes.map((sc) => ({
    label: sc.label ?? '',
    start: formatSeconds(sc.start_time ?? 0),
    end: formatSeconds(sc.end_time ?? 0),
  }));
}

function toStep(raw: RawStep) {
  return {
    order: raw.step_order ?? 0,
    title: raw.subtitle ?? '',
    description: (raw.details ?? []).map((d) => ({
      content: d.text ?? '',
      start: formatSeconds(d.start ?? 0),
    })),
    tip: raw.tip ?? null,
    knowledge: raw.knowledge ?? null,
    scenes: raw.scenes?.length ? toScenesFromScenes(raw.scenes) : toScenesFromDetails(raw.details ?? []),
    timerSeconds: raw.timer_seconds ?? null,
    heatLevel: raw.heat_level ?? null,
  };
}

// ─── API ─────────────────────────────────────────────────────────

export async function fetchRecipeById(recipeId: string): Promise<RecipeEntry> {
  try {
    const res = await client.get(`/recipes/${recipeId}`);
    const parsed = RawRecipeResponseSchema.parse(res.data);

    return {
      videoId: parsed.video_info?.video_id ?? '',
      videoType: parsed.video_info?.video_type ?? 'NORMAL',
      recipe: {
        title: parsed.video_info?.video_title ?? '',
        description: parsed.recipe_detail_meta?.description ?? null,
        servings: parsed.recipe_detail_meta?.servings ?? null,
        cookingTimeMinutes: parsed.recipe_detail_meta?.cooking_time ?? null,
        difficulty: '',
        category: '',
        ingredients: parsed.recipe_ingredient.map(toIngredient),
        tools: [],
        steps: parsed.recipe_steps.map(toStep),
      },
    };
  } catch (err: any) {
    console.warn(`[RecipeAPI] fetchRecipeById(${recipeId}) failed:`, err?.response?.status, err?.message);
    const entry = RECIPE_MAP[recipeId] ?? RECIPE_MAP[DEFAULT_RECIPE_ID];
    if (!entry) throw new Error(`Recipe not found: ${recipeId}`);
    return entry;
  }
}
