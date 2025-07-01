// src/stores/youtubePlayerStore.ts
import { YoutubeIframeRef } from "react-native-youtube-iframe";
import { create } from "zustand";
import React from "react";

interface YoutubePlayerState {
  playerRef: React.RefObject<YoutubeIframeRef | null>;
  setPlayerRef: (ref: React.RefObject<YoutubeIframeRef | null>) => void;

  youtubeId: string;
  setYoutubeId: (v: string) => void;
}

export const useYoutubePlayerStore = create<YoutubePlayerState>((set) => ({
  playerRef: React.createRef<YoutubeIframeRef>(),
  setPlayerRef: (ref) => set({ playerRef: ref }),

  youtubeId: "",
  setYoutubeId: (v) => set({ youtubeId: v }),
}));
