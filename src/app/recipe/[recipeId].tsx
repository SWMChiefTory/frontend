import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import React, { useRef } from "react";
import { useRecipeFlowViewModel } from "@/src/modules/recipeFlow/viewmodels/useRecipeFlowViewModel";
import { LoadingView } from "@/src/modules/shared/components/layout/LoadingView";
import { YoutubeVideoPlayer } from "@/src/modules/shared/components/video/YoutubeVideoPlayer";
import { RecipeDetailView } from "@/src/modules/recipe/detail/components/RecipeDetailView";
import { CookStepsView } from "@/src/modules/cook/components/CookStepsView";
import { YoutubeIframeRef } from "react-native-youtube-iframe";
import { RecipeFlowMode } from "@/src/modules/recipeFlow/types/RecipeFlowMode";
import { RecipeFlowHeader } from "@/src/modules/recipeFlow/components/RecipeFlowHeader";

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
  const [mode, setMode] = React.useState<RecipeFlowMode>(RecipeFlowMode.Detail);
  const playerRef = useRef<YoutubeIframeRef>(null);

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.title,
          headerLeft: () => (
            <RecipeFlowHeader
              mode={mode}
              onBack={() => setMode(RecipeFlowMode.Detail)}
            />
          ),
        }}
      />

      <View style={styles.wrapper}>
        <YoutubeVideoPlayer videoId={recipe.youtubeId} ref={playerRef} />
        <LoadingView loading={loading}>
          {mode === RecipeFlowMode.Detail ? (
            <RecipeDetailView
              recipe={recipe}
              onStart={() => setMode(RecipeFlowMode.Cook)}
            />
          ) : mode === RecipeFlowMode.Cook ? (
            <CookStepsView
              recipe={recipe}
              playerRef={playerRef}
              onExit={() => setMode(RecipeFlowMode.Detail)}
            />
          ) : null}
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
