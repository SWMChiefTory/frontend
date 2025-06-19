import React from "react";
import { Image, Pressable, StyleSheet, Text } from "react-native";
import { PopularRecipeSummary } from "@/src/modules/recipe/summary/popular/types/PopularRecipeSummary";
import { useRecipeThumbnail } from "@/src/modules/recipe/summary/hooks/useRecipeThumbnail";

type Props = {
  recipe: PopularRecipeSummary;
  onPress: (recipe: PopularRecipeSummary) => void;
};

export function PopularRecipeSummaryCard({ recipe, onPress }: Props) {
  const { thumbnail } = useRecipeThumbnail(recipe);

  return (
    <Pressable
      testID={`recipe-card-${recipe.recipeId}`}
      onPress={() => onPress(recipe)}
      style={styles.card}
    >
      <Image
        testID="recipe-image"
        source={{ uri: thumbnail }}
        style={styles.image}
      />
      <Text numberOfLines={2} style={styles.cardText}>
        {recipe.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: "48%", marginTop: 12 },
  image: { width: "100%", height: 100, borderRadius: 12 },
  cardText: { marginTop: 6, fontSize: 13 },
});
