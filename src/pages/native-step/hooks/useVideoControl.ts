import { useCallback, useState } from 'react';

type PostToYouTubeFn = (msg: object) => void;

export function useVideoControl(postToYouTube: PostToYouTubeFn) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const playVideo = useCallback(() => {
    postToYouTube({ type: 'PLAY_VIDEO' });
    setIsPlaying(true);
  }, [postToYouTube]);

  const pauseVideo = useCallback(() => {
    postToYouTube({ type: 'PAUSE_VIDEO' });
    setIsPlaying(false);
  }, [postToYouTube]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pauseVideo();
    else playVideo();
  }, [isPlaying, playVideo, pauseVideo]);

  return {
    isPlaying,
    setIsPlaying,
    isVideoLoaded,
    setIsVideoLoaded,
    playVideo,
    pauseVideo,
    togglePlay,
  };
}
