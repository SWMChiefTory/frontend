import React from 'react';
import {Image, Pressable, StyleSheet, Text} from 'react-native';
import { RecipeSummary } from "@/src/features/recipe/types/RecipeSummary";
import {useRecipeMeta} from "@/src/features/recipe/hooks/useRecipeMeta";

type Props = {
    recipe: RecipeSummary;
    onPress: (recipe: RecipeSummary) => void;
};

export function RecipeCard({ recipe, onPress }: Props) {

    const { thumbnail } = useRecipeMeta(recipe.youtubeId);

    return (
        <Pressable
            testID={`recipe-card-${recipe.recipeId}`}
            onPress={() => onPress(recipe)}
            style={styles.card}
        >
            <Image testID="recipe-image" source={{ uri: thumbnail }} style={styles.image} />
            <Text numberOfLines={2} style={styles.cardText}>{recipe.title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: { width: '48%', marginTop: 12 },
    image: { width: '100%', height: 100, borderRadius: 12 },
    cardText: { marginTop: 6, fontSize: 13 },
});