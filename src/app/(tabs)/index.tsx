
import {Text, View, StyleSheet } from 'react-native';
import React from "react";
import {RecipeList} from "@/src/features/recipe/components/RecipeList";
import {useRecipeListViewModel} from "@/src/features/recipe/viewmodels/useRecipeListViewModel";
import {LinkInput} from "@/src/features/summary/components/LinkInput";
import {HomeSectionHeader} from "@/src/shared/components/HomeSectionHeader";
import {useRouter} from "expo-router";
import {RecipeSummary} from "@/src/features/recipe/types/RecipeSummary";
import {LoadingView} from "@/src/shared/components/LoadingView";

export default function HomeScreen() {
    const { recipes, loading } = useRecipeListViewModel();
    const router = useRouter();

    const handleRecipePress = ({ recipeId, youtubeId, title } : RecipeSummary) => {
        router.push({
            pathname: '/recipe/[recipeId]',
            params: { recipeId, youtubeId, title },
        });
    };

    return (
        <LoadingView loading={loading}>
            <View style={styles.wrapper}>
                <Text style={styles.title}>레시피를 요약하고, 저장하세요</Text>
                <LinkInput placeholder={'링크를 입력하세요... youtube, 블로그 etc'} />
                <HomeSectionHeader title="추천 레시피" onPress={() => {}} />
                <RecipeList recipes={recipes} onPress={handleRecipePress} />
                <HomeSectionHeader title="최근 본 레시피" onPress={() => {}} />
                <RecipeList recipes={recipes} onPress={handleRecipePress} />
            </View>
        </LoadingView>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
});
