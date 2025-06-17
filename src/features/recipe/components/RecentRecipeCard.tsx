import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRecipeMeta } from "@/src/features/recipe/hooks/useRecipeMeta";
import { RecentRecipe } from "@/src/features/recipe/types/RecentRecipe";

type Props = {
  recipe: RecentRecipe;
  onPress: (recipe: RecentRecipe) => void;
};

export function RecentRecipeCard({ recipe, onPress }: Props) {
  const { thumbnail } = useRecipeMeta(recipe);

  return (
    <Pressable style={styles.card} onPress={() => onPress(recipe)}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: thumbnail }} style={styles.image} />
        <View style={styles.overlay} />
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {recipe.title}
        </Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFg, { width: `${recipe.progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{recipe.watchedTime} 시청됨</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#FFB088",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  cardText: { fontSize: 13 },
  imageWrapper: {
    width: 160,
    height: 90,
    overflow: "hidden",
    borderRadius: 12,
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  body: { padding: 8 },
  title: { fontSize: 14, fontWeight: "600", color: "#1C1C1E" },
  row: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  meta: { fontSize: 12, color: "#8E8E93" },
  progressBg: {
    width: "100%",
    height: 4,
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
    marginTop: 8,
  },
  progressFg: { height: "100%", backgroundColor: "#FF6B3D", borderRadius: 4 },
  progressText: { fontSize: 12, color: "#8E8E93", marginTop: 4 },
});
