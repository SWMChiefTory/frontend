import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { RecentSummaryRecipe } from "@/src/modules/recipe/summary/recent/types/RecentSummaryRecipe";
import { RecentRecipeSummaryCard } from "@/src/modules/recipe/summary/recent/components/RecentRecipeSummaryCard";

type Props = {
  recipes: RecentSummaryRecipe[];
  onPress: (recipe: RecentSummaryRecipe) => void;
};

export default function RecentRecipeSummaryList({ recipes, onPress }: Props) {
  return (
    <FlatList
      data={recipes}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.recipeId.toString()}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      style={styles.container}
      renderItem={({ item }) => (
        <RecentRecipeSummaryCard recipe={item} onPress={onPress} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  gap: { width: 12 },
  container: { height: "25%" },
});
