import { RecipeFlow } from "@/src/modules/recipeFlow/types/RecipeFlow";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import React from "react";

type Props = {
  recipe: RecipeFlow;
  onStart: () => void;
};

export function RecipeDetailView({ recipe, onStart }: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.detail}>
          <Text style={styles.title}>{recipe.title}</Text>
          <Text style={styles.summary}>{recipe.summary}</Text>

          <Text style={styles.sectionTitle}>소요 시간</Text>
          <Text style={styles.content}>{recipe.totalTime}</Text>

          <Text style={styles.sectionTitle}>재료</Text>
          {recipe.ingredients.map((item, index) => (
            <Text key={index} style={styles.content}>
              {index + 1}. {item}
            </Text>
          ))}

          <Text style={styles.sectionTitle}>조리 단계</Text>
          {recipe.steps.map((step, index) => (
            <Text key={index} style={styles.content}>
              {index + 1}. {step.description}
            </Text>
          ))}
        </View>
      </ScrollView>

      <Pressable style={styles.startButton} onPress={onStart}>
        <Text style={styles.startButtonText}>조리 시작하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
  container: { paddingBottom: 100 },
  detail: { padding: 20 },
  startButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f33",
    paddingVertical: 18,
    alignItems: "center",
  },
  startButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  summary: { fontSize: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },
  content: { fontSize: 15, marginBottom: 4 },
});
