import { useEffect, useState } from "react";
import { getYoutubeMeta } from "react-native-youtube-iframe";
import { PopularRecipe } from "@/src/features/recipe/types/PopularRecipe";
import { RecentRecipe } from "@/src/features/recipe/types/RecentRecipe";

export function useRecipeMeta(recipe: PopularRecipe | RecentRecipe) {
  const [thumbnail, setThumbnail] = useState(recipe.thumbnailUrl);

  useEffect(() => {
    getYoutubeMeta(recipe.youtubeId).then((meta) => {
      if (meta.thumbnail_url) setThumbnail(meta.thumbnail_url);
    });
  }, [recipe.youtubeId]);

  return { thumbnail };
}
