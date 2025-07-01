import { router, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import React, { useEffect, useRef } from "react";
import { useRecipeFlowViewModel } from "@/src/modules/recipeFlow/viewmodels/useRecipeFlowViewModel";
import { LoadingView } from "@/src/modules/shared/components/layout/LoadingView";
import { YoutubeVideoPlayer } from "@/src/modules/shared/components/video/YoutubeVideoPlayer";
import { RecipeDetailView } from "@/src/modules/recipe/detail/components/RecipeDetailView";
import { YoutubeIframeRef } from "react-native-youtube-iframe";
import { useYoutubePlayerStore } from "@/src/modules/shared/components/video/youtubePlayerStore";

export default function RecipeFlowScreen() {
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
  const currentYoutubeId = useYoutubePlayerStore((state) => state.youtubeId);
  const currentPlayerRef = useYoutubePlayerStore((state) => state.playerRef);

  useEffect(() => {
    setPlayerRef(localPlayerRef);
    setYoutubeId(recipe.youtubeId);
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.title,
        }}
      />

      <View style={styles.wrapper}>
        <YoutubeVideoPlayer videoId={currentYoutubeId} ref={currentPlayerRef} />
        <LoadingView loading={loading}>
          <RecipeDetailView
            recipe={recipe}
            onStart={() =>
              router.push({
                pathname: "/recipe/cook",
                params: { recipeId, youtubeId, title },
              })
            }
          />
        </LoadingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    paddingBottom: 100,
  },
  detail: {
    padding: 20,
  },
  startButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f33",
    paddingVertical: 18,
    alignItems: "center",
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  summary: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },
  content: {
    fontSize: 15,
    color: "#333",
    marginBottom: 4,
  },
});
