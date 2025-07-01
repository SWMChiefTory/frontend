import { Stack, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import React from "react";
import * as Progress from "react-native-progress";
import { LoadingView } from "@/src/modules/shared/components/layout/LoadingView";
import { CookStepsView } from "@/src/modules/cook/components/CookStepsView";
import { CustomBackButton } from "@/src/modules/shared/components/layout/CustomBackButton";
import { CookStepsView2 } from "@/src/modules/cook/components/CookStepsView2";
import { useYoutubePlayerStore } from "@/src/modules/shared/components/video/youtubePlayerStore";
import { useRecipeFlowStore } from "@/src/modules/recipeFlow/store/recipeFlowStore";

export default function RecipeFlowCookScreen() {
  const { recipe, loading } = useRecipeFlowStore();
  const router = useRouter();
  const currentPlayerRef = useYoutubePlayerStore((state) => state.playerRef);

  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);

  return (
    <>
      <View style={styles.wrapper}>
        <LoadingView loading={loading}>
          <CookStepsView2
            recipe={recipe}
            playerRef={currentPlayerRef}
            onExit={() => router.back()}
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
});
