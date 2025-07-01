import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import React from "react";
import { LoadingView } from "@/src/modules/shared/components/layout/LoadingView";
import { RecipeDetailView } from "@/src/modules/recipe/detail/components/RecipeDetailView";
import { useRecipeFlowStore } from "@/src/modules/recipeFlow/store/recipeFlowStore";

export default function RecipeFlowDetailScreen() {
  const { recipe, loading } = useRecipeFlowStore();

  const router = useRouter();

  return (
    <>
      <View style={styles.wrapper}>
        <LoadingView loading={loading}>
          <RecipeDetailView
            recipe={recipe}
            onStart={() =>
              router.push({
                pathname: "/recipeFlow/cook",
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
});
