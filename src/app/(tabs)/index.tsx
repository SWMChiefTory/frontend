import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { PopularRecipeSummaryList } from "@/src/modules/recipe/summary/popular/components/PopularRecipeSummaryList";
import { useRecipeSummaryViewModel } from "@/src/modules/recipe/summary/viewmodels/useRecipeSummaryViewModel";
import { RecipeSectionHeader } from "@/src/modules/recipe/summary/shared/components/RecipeSectionHeader";
import { useRouter } from "expo-router";
import { PopularRecipeSummary } from "@/src/modules/recipe/summary/popular/types/PopularRecipeSummary";
import { LoadingView } from "@/src/modules/shared/components/layout/LoadingView";
import RecentRecipeSummaryList from "@/src/modules/recipe/summary/recent/components/RecentRecipeSummaryList";
import { RecentSummaryRecipe } from "@/src/modules/recipe/summary/recent/types/RecentSummaryRecipe";
import { RecipeLinkInput } from "@/src/modules/recipe/link/components/RecipeLinkInput";

export default function HomeScreen() {
  const { popularRecipes, recentRecipes, loading } =
    useRecipeSummaryViewModel();
  const router = useRouter();

  const handleRecipePress = ({
    recipeId,
    youtubeId,
    title,
  }: PopularRecipeSummary | RecentSummaryRecipe) => {
    router.push({
      pathname: "/recipe/[recipeId]",
      params: { recipeId, youtubeId, title },
    });
  };

  return (
    <LoadingView loading={loading}>
      <View style={styles.wrapper}>
        <Text style={styles.title}>레시피를 요약하고, 저장하세요</Text>
        <RecipeLinkInput
          placeholder={"링크를 입력하세요... youtube, 블로그 etc"}
        />
        <RecipeSectionHeader title="최근 시청한 레시피" onPress={() => {}} />
        <RecentRecipeSummaryList
          recipes={recentRecipes}
          onPress={handleRecipePress}
        />
        <RecipeSectionHeader title="추천 레시피" onPress={() => {}} />
        <PopularRecipeSummaryList
          recipes={popularRecipes}
          onPress={handleRecipePress}
        />
      </View>
    </LoadingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
});
