import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { RecentRecipe } from "@/src/features/recipe/types/RecentRecipe";
import { RecentRecipeCard } from "@/src/features/recipe/components/RecentRecipeCard";

type Props = {
  recipes: RecentRecipe[];
  onPress: (recipe: RecentRecipe) => void;
};

export default function RecentRecipeList({ recipes, onPress }: Props) {
  return (
    <FlatList
      data={recipes}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.recipeId.toString()}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      style={styles.container}
      renderItem={({ item }) => (
        <RecentRecipeCard recipe={item} onPress={onPress} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  gap: { width: 12 },
  container: { height: 120 },
});
