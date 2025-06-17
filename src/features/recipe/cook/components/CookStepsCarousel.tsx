import { Dimensions, StyleSheet, View } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { CookStepCard } from "@/src/features/recipe/cook/components/CookStepCard";
import React, { useEffect, useState } from "react";
import { YoutubeIframeRef } from "react-native-youtube-iframe";
import { RecipeDetail } from "@/src/features/recipe/types/RecipeDetail";

const { width: screenWidth } = Dimensions.get("window");

interface Props {
  recipe: RecipeDetail;
  playerRef: React.RefObject<YoutubeIframeRef | null>;
  onExit: () => void;
}

export function CookStepsCarousel({ recipe, playerRef, onExit }: Props) {
  const recipeSteps = recipe.steps;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = recipeSteps[currentStepIndex];

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const elapsedSec = (await playerRef.current?.getCurrentTime?.()) ?? 0;
        if (
          currentStep.startTime > elapsedSec ||
          currentStep.endTime <= elapsedSec
        ) {
          playerRef.current?.seekTo(currentStep.startTime, true);
        }
      } catch (e) {
        console.error("Error getting current time:", e);
      }
    }, 500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  return (
    <View style={styles.wrapper}>
      <Carousel
        width={screenWidth}
        height={500}
        data={recipeSteps}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.85,
          parallaxScrollingOffset: 80,
        }}
        loop={false}
        overscrollEnabled={false}
        scrollAnimationDuration={600}
        snapEnabled={true}
        onSnapToItem={(index) => {
          setCurrentStepIndex(index);
          const step = recipeSteps[index];
          playerRef.current?.seekTo(step.startTime, true);
        }}
        renderItem={({ item, animationValue }) => {
          return (
            <CookStepCard
              key={item.stepId}
              item={item}
              animationValue={animationValue}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
});
