import {Stack, useLocalSearchParams} from 'expo-router';
import {StyleSheet, View} from 'react-native';
import React, {useRef} from 'react';
import { useRecipeDetailViewModel } from '@/src/features/recipe/viewmodels/useRecipeDetailViewModel';
import {LoadingView} from "@/src/shared/components/LoadingView";
import {RecipeVideo} from "@/src/features/recipe/components/RecipeVideo";
import {RecipeOverview} from "@/src/features/recipe/components/RecipeOverview";
import {CookStepsCarousel} from "@/src/features/recipe/cook/components/CookStepsCarousel";
import {YoutubeIframeRef} from "react-native-youtube-iframe";
import {RecipeMode} from "@/src/features/recipe/types/RecipeMode";

export default function RecipeDetailScreen() {
    const { recipeId, youtubeId, title } = useLocalSearchParams<{ recipeId: string, youtubeId?: string, title?: string }>();
    const { recipe, loading } = useRecipeDetailViewModel(recipeId, youtubeId, title);
    const [mode, setMode] = React.useState<RecipeMode>(RecipeMode.Detail);
    const playerRef = useRef<YoutubeIframeRef>(null);


    return (
        <>
            <Stack.Screen options={{ title: recipe.title }} />
            <View style={styles.wrapper}>
                <RecipeVideo
                    videoId={recipe.youtubeId}
                    ref={playerRef}
                />
                <LoadingView loading={loading}>
                    {mode === RecipeMode.Detail ? (
                        <RecipeOverview
                            recipe={recipe}
                            onStart={() => setMode(RecipeMode.Cook)}
                        />
                    ) : mode === RecipeMode.Cook ? (
                        <CookStepsCarousel
                            recipe={recipe}
                            playerRef={playerRef}
                            onExit={() => setMode(RecipeMode.Detail)}
                        />
                    ) : null}
                </LoadingView>
            </View>
        </>
    );

}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        paddingBottom: 100,
    },
    detail: {
        padding: 20,
    },
    startButton: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f33',
        paddingVertical: 18,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    summary: {
        fontSize: 16,
        color: '#555',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 6,
    },
    content: {
        fontSize: 15,
        color: '#333',
        marginBottom: 4,
    },
});
