import { useEffect, useState } from "react";
import { getYoutubeMeta } from "react-native-youtube-iframe";
import { PopularRecipeSummary } from "@/src/modules/recipe/summary/popular/types/PopularRecipeSummary";
import { RecentSummaryRecipe } from "@/src/modules/recipe/summary/recent/types/RecentSummaryRecipe";

export function useRecipeThumbnail(
  recipe: PopularRecipeSummary | RecentSummaryRecipe,
) {
  const [thumbnail, setThumbnail] = useState(recipe.thumbnailUrl);

  useEffect(() => {
    getYoutubeMeta(recipe.youtubeId).then((meta) => {
      if (meta.thumbnail_url) setThumbnail(meta.thumbnail_url);
    });
  }, [recipe.youtubeId]);

  return { thumbnail };
}
