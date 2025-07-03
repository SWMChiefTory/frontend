import { useEffect, useState } from "react";
import { getYoutubeMeta } from "react-native-youtube-iframe";
import { PopularSummaryRecipe } from "../popular/types/Recipe";
import { RecentSummaryRecipe } from "../recent/types/Recipe";

export function useRecipeThumbnail(
  recipe: PopularSummaryRecipe | RecentSummaryRecipe,
) {
  const [thumbnail, setThumbnail] = useState(recipe.thumbnailUrl);

  useEffect(() => {
    getYoutubeMeta(recipe.youtubeId).then((meta) => {
      if (meta.thumbnail_url) setThumbnail(meta.thumbnail_url);
    });
  }, [recipe.youtubeId]);

  return { thumbnail };
}
