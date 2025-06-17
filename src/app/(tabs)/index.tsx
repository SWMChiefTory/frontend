import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { PopularRecipeList } from "@/src/features/recipe/components/PopularRecipeList";
import { useRecipeListViewModel } from "@/src/features/recipe/viewmodels/useRecipeListViewModel";
import { LinkInput } from "@/src/features/summary/components/LinkInput";
import { HomeSectionHeader } from "@/src/shared/components/HomeSectionHeader";
import { useRouter } from "expo-router";
import { PopularRecipe } from "@/src/features/recipe/types/PopularRecipe";
import { LoadingView } from "@/src/shared/components/LoadingView";
import RecentRecipeList from "@/src/features/recipe/components/RecentRecipeList";
import { RecentRecipe } from "@/src/features/recipe/types/RecentRecipe";

export default function HomeScreen() {
  const { popularRecipes, recentRecipes, loading } = useRecipeListViewModel();
  const router = useRouter();

  const handleRecipePress = ({
    recipeId,
    youtubeId,
    title,
  }: PopularRecipe | RecentRecipe) => {
    router.push({
      pathname: "/recipe/[recipeId]",
      params: { recipeId, youtubeId, title },
    });
  };

  return (
    <LoadingView loading={loading}>
      <View style={styles.wrapper}>
        <Text style={styles.title}>레시피를 요약하고, 저장하세요</Text>
        <LinkInput placeholder={"링크를 입력하세요... youtube, 블로그 etc"} />
        <HomeSectionHeader title="최근 시청한 레시피" onPress={() => {}} />
        <RecentRecipeList recipes={recentRecipes} onPress={handleRecipePress} />
        <HomeSectionHeader title="추천 레시피" onPress={() => {}} />
        <PopularRecipeList
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
