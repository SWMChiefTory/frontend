import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import { CustomBackButton } from "@/src/modules/shared/components/layout/CustomBackButton";
import { View } from "react-native";
import { YoutubeVideoPlayer } from "@/src/modules/shared/components/video/YoutubeVideoPlayer";
import { YoutubeIframeRef } from "react-native-youtube-iframe";
import { useYoutubePlayerStore } from "@/src/modules/shared/components/video/youtubePlayerStore";
import { useRecipeFlowViewModel } from "@/src/modules/recipeFlow/viewmodels/useRecipeFlowViewModel";
import { useRecipeFlowStore } from "@/src/modules/recipeFlow/store/recipeFlowStore";

export default function RecipeFlowLayout() {
  const { recipeId, youtubeId, title } = useLocalSearchParams<{
    recipeId: string;
    youtubeId?: string;
    title?: string;
  }>();

  const { recipe, loading } = useRecipeFlowViewModel(
    recipeId,
    youtubeId,
    title,
  );

  const localPlayerRef = useRef<YoutubeIframeRef | null>(null);

  const { setPlayerRef, setYoutubeId } = useYoutubePlayerStore();
  const { setRecipe, setLoading } = useRecipeFlowStore();

  useEffect(() => {
    setLoading(loading);
  }, [loading]);

  useEffect(() => {
    setPlayerRef(localPlayerRef);
    setYoutubeId(recipe.youtubeId);
    setRecipe(recipe);
  }, [recipe]);

  return (
    <>
      <View style={{ backgroundColor: "#fff" }}>
        <YoutubeVideoPlayer videoId={recipe.youtubeId} ref={localPlayerRef} />
      </View>
      <Stack.Screen
        options={{
          title: recipe.title,
          headerLeft: () => <CustomBackButton />,
        }}
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="detail" />
        <Stack.Screen name="cook" />
      </Stack>
    </>
  );
}
