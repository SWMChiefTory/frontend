import React from "react";
import YoutubePlayer, { YoutubeIframeRef } from "react-native-youtube-iframe";

type Props = {
  ref: React.Ref<YoutubeIframeRef | null>;
  videoId: string;
};

export function YoutubeVideoPlayer({ videoId, ref }: Props) {
  return <YoutubePlayer height={250} ref={ref} play={true} videoId={videoId} />;
}
