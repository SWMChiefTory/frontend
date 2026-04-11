import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';

type PostToYouTubeFn = (msg: object) => void;

type UseStepNavigationOptions = {
  recipe: any;
  postToYouTube: PostToYouTubeFn;
};

function parseTime(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

export function useStepNavigation({ recipe, postToYouTube }: UseStepNavigationOptions) {
  const steps = recipe?.steps ?? [];
  const totalSteps = steps.length;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex] ?? steps[0];

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const navigateStep = useCallback((i: number, sceneIdx: number = 0) => {
    if (i < 0 || i >= totalSteps) return;
    setCurrentStepIndex(i);
    const scene = steps[i]?.scenes?.[sceneIdx];
    if (scene) postToYouTube({ type: 'SEEK_TO', seconds: parseTime(scene.start) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [steps, totalSteps, postToYouTube]);

  const goToPrevStep = useCallback(() => {
    if (currentStepIndex > 0) navigateStep(currentStepIndex - 1);
  }, [currentStepIndex, navigateStep]);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) navigateStep(currentStepIndex + 1);
  }, [currentStepIndex, totalSteps, navigateStep]);

  const goToStep = useCallback((stepNumber: number) => {
    const idx = stepNumber - 1;
    if (idx >= 0 && idx < totalSteps) navigateStep(idx);
  }, [totalSteps, navigateStep]);

  const seekToScene = useCallback((i: number) => {
    const scene = currentStep?.scenes?.[i];
    if (scene) {
      postToYouTube({ type: 'SEEK_TO', seconds: parseTime(scene.start) });
      postToYouTube({ type: 'PLAY_VIDEO' });
    }
  }, [currentStep, postToYouTube]);

  const seekToSceneNumber = useCallback((sceneNum: number) => {
    const idx = sceneNum - 1;
    const scene = currentStep?.scenes?.[idx];
    if (scene) {
      postToYouTube({ type: 'SEEK_TO', seconds: parseTime(scene.start) });
      postToYouTube({ type: 'PLAY_VIDEO' });
    }
  }, [currentStep, postToYouTube]);

  return {
    steps,
    totalSteps,
    currentStepIndex,
    currentStep,
    isFirstStep,
    isLastStep,
    navigateStep,
    goToPrevStep,
    goToNextStep,
    goToStep,
    seekToScene,
    seekToSceneNumber,
  };
}
