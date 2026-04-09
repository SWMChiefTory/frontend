import { z } from 'zod';
import { client, parseOrNull } from '@/src/shared/api';

// ─── Raw schemas ─────────────────────────────────────────────────
const RawCoupangProductSchema = z
  .object({
    keyword: z.string().nullish(),
    rank: z.number().nullish(),
    isRocket: z.boolean().nullish(),
    isFreeShipping: z.boolean().nullish(),
    productId: z.number(),
    productImage: z.string(),
    productName: z.string(),
    productPrice: z.number(),
    productUrl: z.string(),
  });

const RawCoupangSearchResponseSchema = z
  .object({
    coupangProducts: z
      .object({
        coupangProducts: z.array(RawCoupangProductSchema).default([]),
      })
      .nullish(),
  });

type RawCoupangProduct = z.infer<typeof RawCoupangProductSchema>;

// ─── Client type ─────────────────────────────────────────────────
export type IngredientProduct = {
  id: string;
  name: string; // 재료명
  description: string; // 상품명
  price: number;
  imageUrl: string;
  purchaseUrl: string;
  isRocket: boolean;
}

// ─── Transformer ─────────────────────────────────────────────────
function toIngredientProduct(ingredientName: string, raw: RawCoupangProduct): IngredientProduct {
  return {
    id: String(raw.productId),
    name: ingredientName,
    description: raw.productName,
    price: raw.productPrice,
    imageUrl: raw.productImage,
    purchaseUrl: raw.productUrl,
    isRocket: raw.isRocket ?? false,
  };
}

// ─── API ─────────────────────────────────────────────────────────

/**
 * 단일 재료 검색 → 가장 저렴한 상품 1개 반환
 */
export async function searchCoupangCheapest(ingredientName: string): Promise<IngredientProduct | null> {
  try {
    const res = await client.get('/affiliate/search/coupang', {
      params: { keyword: ingredientName },
    });
    const parsed = parseOrNull(RawCoupangSearchResponseSchema, res.data, 'CoupangAPI');
    if (!parsed) return null;
    const products = parsed.coupangProducts?.coupangProducts ?? [];
    if (products.length === 0) return null;

    const cheapest = products.reduce((prev, curr) =>
      curr.productPrice < prev.productPrice ? curr : prev,
    );
    return toIngredientProduct(ingredientName, cheapest);
  } catch (err: any) {
    console.warn('[CoupangAPI] search error:', err?.response?.status, err?.message);
    return null;
  }
}

/**
 * 여러 재료를 동시 검색 → 각각 가장 저렴한 상품 반환 (null 제외)
 */
export async function searchCoupangIngredients(ingredientNames: string[]): Promise<IngredientProduct[]> {
  const results = await Promise.all(ingredientNames.map((name) => searchCoupangCheapest(name)));
  return results.filter((p): p is IngredientProduct => p !== null);
}
