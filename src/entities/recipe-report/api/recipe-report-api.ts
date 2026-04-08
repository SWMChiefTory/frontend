import { z } from 'zod';
import { client } from '@/src/shared/api';

export const RecipeReportReasonSchema = z.enum([
  'INAPPROPRIATE_CONTENT',
  'MISINFORMATION',
  'LOW_QUALITY',
  'OTHER',
]);

export type RecipeReportReason = z.infer<typeof RecipeReportReasonSchema>;

export interface RecipeReportRequest {
  reason: RecipeReportReason;
  description: string | null;
}

export async function reportRecipe(recipeId: string, body: RecipeReportRequest): Promise<void> {
  await client.post(`/recipes/${recipeId}/reports`, body);
}
