import type { WebViewMessageEvent } from 'react-native-webview';
import type { WebView } from 'react-native-webview';
import type { TimerSheetRef } from '@/src/pages/native-step/components/TimerBottomSheet';

export type DescriptionItem = {
  content: string;
  start?: string;
}

export type Scene = {
  label: string;
  start: string;
  end: string;
}

/** Shorts/Normal 공통 props — RecipeStepScreen에서 훅 결과를 주입 */
export type StepScreenSharedProps = {
  videoId: string;
  youtubeUri: string;

  stepNav: {
    steps: any[];
    totalSteps: number;
    currentStepIndex: number;
    currentStep: any;
    isFirstStep: boolean;
    isLastStep: boolean;
    navigateStep: (i: number, sceneIdx?: number) => void;
  };

  videoControl: {
    isPlaying: boolean;
    isVideoLoaded: boolean;
    setIsVideoLoaded: (v: boolean) => void;
    setIsPlaying: (v: boolean) => void;
    togglePlay: () => void;
  };

  voiceState: {
    isListening: boolean;
    transcript: string;
    pipelineState: string;
    intentFeedback: { text: string; intent: string } | null;
    toggleListening: () => void;
    handleWebViewMessage: (e: any) => void;
    onWebViewReady: () => void;
  };

  // timer
  timerResult: any;
  timerSheetRef: React.RefObject<TimerSheetRef | null>;

  // handlers
  handleManualPrev: () => void;
  handleManualNext: () => void;
  handleBack: () => void;
  handleYouTubeMessage: (e: WebViewMessageEvent) => void;

  // webview
  webviewRef: React.RefObject<WebView | null>;
}
