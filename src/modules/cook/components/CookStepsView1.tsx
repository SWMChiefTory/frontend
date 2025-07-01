import { Dimensions, StyleSheet, View, Text } from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { CookStepCard } from "@/src/modules/cook/components/CookStepCard";
import React, { useEffect, useRef, useState } from "react";
import { YoutubeIframeRef } from "react-native-youtube-iframe";
import { RecipeFlow } from "@/src/modules/recipeFlow/types/RecipeFlow";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

const { width: screenWidth } = Dimensions.get("window");

interface Props {
  recipe: RecipeFlow;
  playerRef: React.RefObject<YoutubeIframeRef | null>;
  onExit: () => void;
}

export function CookStepsView1({ recipe, playerRef, onExit }: Props) {
  const recipeSteps = recipe.steps;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const carouselRef = useRef<ICarouselInstance>(null);

  const currentStep = recipeSteps[currentStepIndex];

  useSpeechRecognitionEvent("result", async (event) => {
    const text = event.results[0]?.transcript ?? "";
    console.log("transcript:", text);
    setTranscript(text);

    if (text.includes("다음")) {
      console.log("다음 step 이동");
      const newIndex = Math.min(currentStepIndex + 1, recipeSteps.length - 1);
      setCurrentStepIndex(newIndex);
      carouselRef.current?.scrollTo({ index: newIndex });
      ExpoSpeechRecognitionModule.abort();
      await new Promise((res) => setTimeout(res, 1000));
      ExpoSpeechRecognitionModule.start({
        lang: "ko-KR",
        interimResults: true,
        continuous: true,
      });
    } else if (text.includes("이전")) {
      console.log("이전 step 이동");
      const newIndex = Math.max(currentStepIndex - 1, 0);
      setCurrentStepIndex(newIndex);
      carouselRef.current?.scrollTo({ index: newIndex });
      ExpoSpeechRecognitionModule.abort();
      await new Promise((res) => setTimeout(res, 1000));
      ExpoSpeechRecognitionModule.start({
        lang: "ko-KR",
        interimResults: true,
        continuous: true,
      });
    }
  });

  useEffect(() => {
    const startSpeechRecognition = async () => {
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        console.warn("Permissions not granted", result);
        onExit();
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: "ko-KR",
        interimResults: true,
        continuous: true,
        iosCategory: {
          mode: "voiceChat",
          category: "playAndRecord",
          categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
        },
        iosVoiceProcessingEnabled: true,
        androidIntent: "android.speech.action.RECOGNIZE_SPEECH",
      });
    };

    startSpeechRecognition();

    return () => {
      console.log("Stopping speech recognition");
      ExpoSpeechRecognitionModule.stop();
    };
  }, []);

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
      <Text style={styles.transcript}>{transcript}</Text>
      <Carousel
        ref={carouselRef}
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
  transcript: {
    fontSize: 18,
    color: "#333",
    padding: 12,
    textAlign: "center",
  },
});
