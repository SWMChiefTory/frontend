import { Dimensions, StyleSheet, View, Text } from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { CookStepCard } from "@/src/modules/cook/components/CookStepCard";
import React, { useEffect, useRef, useState } from "react";
import { YoutubeIframeRef } from "react-native-youtube-iframe";
import { RecipeFlow } from "@/src/modules/recipeFlow/types/RecipeFlow";
import {
  AudioDataEvent,
  ExpoAudioStreamModule,
  RecordingConfig,
  useAudioRecorder,
} from "@siteed/expo-audio-studio";

const { width: screenWidth } = Dimensions.get("window");

interface Props {
  recipe: RecipeFlow;
  playerRef: React.RefObject<YoutubeIframeRef | null>;
  onExit: () => void;
}

export function CookStepsView2({ recipe, playerRef, onExit }: Props) {
  const recipeSteps = recipe.steps;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const carouselRef = useRef<ICarouselInstance>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { startRecording, stopRecording } = useAudioRecorder();

  const currentStep = recipeSteps[currentStepIndex];

  useEffect(() => {
    wsRef.current = new WebSocket("wss://c84c-121-162-157-81.ngrok-free.app"); // 👈 변경된 주소

    wsRef.current.onopen = () => {
      console.log("✅ WebSocket to DTLN server opened");
    };

    wsRef.current.onmessage = (event) => {
      const message = event.data;
      console.log("📩 Received transcript:", message);
      setTranscript((prevState) => prevState + " " + message); // 👈 transcript 누적 업데이트
    };

    wsRef.current.onclose = () => {
      console.warn("❌ WebSocket closed");
    };

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (transcript.includes("다음")) {
      console.log("다음 step 이동");

      const newIndex = Math.min(currentStepIndex + 1, recipeSteps.length - 1);
      setCurrentStepIndex(newIndex);
      carouselRef.current?.scrollTo({ index: newIndex });

      setTranscript("");
    } else if (transcript.includes("이전")) {
      console.log("이전 step 이동");

      const newIndex = Math.max(currentStepIndex - 1, 0);
      setCurrentStepIndex(newIndex);
      carouselRef.current?.scrollTo({ index: newIndex });

      setTranscript("");
    }
  }, [transcript]);

  function base64ToFloat32Array(base64: string): Float32Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer); // 16비트로 해석
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768; // [-1, 1] 범위로 정규화
    }
    return float32;
  }

  useEffect(() => {
    const setup = async () => {
      const { granted } = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (!granted) return console.warn("Microphone permissions denied");

      console.log("Microphone permissions granted");

      const config: RecordingConfig = {
        interval: 300,
        enableProcessing: true,
        sampleRate: 16000,
        channels: 1,
        encoding: "pcm_16bit",
        output: { primary: { enabled: false }, compressed: { enabled: false } },
        onAudioStream: async (audioData: AudioDataEvent) => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) return;

          const timestamp = await playerRef.current?.getCurrentTime?.();
          if (timestamp == null) return;

          const raw = audioData.data;
          let micArray: Float32Array;

          if (typeof raw === "string") {
            micArray = base64ToFloat32Array(raw);
          } else {
            console.warn("❌ Unexpected audio format:", typeof raw);
            return;
          }

          if (!micArray || micArray.length === 0) {
            console.warn("❗ micArray is empty");
            return;
          }

          console.log("✅ micArray length:", micArray.length);
          console.log("✅ micArray.byteLength:", micArray.byteLength);

          const tsBuffer = new ArrayBuffer(4);
          new DataView(tsBuffer).setFloat32(0, timestamp, true); // little-endian
          const chunkBuffer = new Uint8Array(
            micArray.buffer,
            micArray.byteOffset,
            micArray.byteLength,
          );

          const fullPacket = new Uint8Array(4 + chunkBuffer.length);
          fullPacket.set(new Uint8Array(tsBuffer), 0); // 4바이트 timestamp
          fullPacket.set(chunkBuffer, 4); // 뒤에 raw audio

          console.log("📦 Sending fullPacket of length:", fullPacket.length);
          wsRef.current.send(fullPacket);
        },
        onAudioAnalysis: async (analysisEvent) => {},
        onRecordingInterrupted: (e) => console.log("Interrupted:", e.reason),
        autoResumeAfterInterruption: true,
        bufferDurationSeconds: 0.1,
      };
      await startRecording(config);
    };
    void setup();
    return () => {
      console.log("Stopping speech recognition");
      void stopRecording();
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
