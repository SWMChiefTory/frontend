/**
 * SpeechCaptionBar – 음성 인식 자막 바
 *
 * 하단에 표시. 음성 인식 중일 때만 노출.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PipelineState } from '../hooks/useAudioPipeline';
import { useMarketStore } from '@/src/shared/store/marketStore';

type SpeechCaptionBarProps = {
  isListening: boolean;
  transcript: string;
  pipelineState: PipelineState;
}

export function SpeechCaptionBar({ isListening, transcript, pipelineState }: SpeechCaptionBarProps) {
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
  if (!isListening) return null;

  const isTranscribing = pipelineState === 'TRANSCRIBING';

  return (
    <View style={styles.container}>
      <View style={[styles.dot, isTranscribing ? styles.dotActive : styles.dotIdle]} />
      <Text
        style={[styles.text, isTranscribing ? styles.textActive : styles.textIdle]}
        numberOfLines={1}
      >
        {isTranscribing
          ? transcript || t.listening
          : t.standby}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: '#22c55e',
  },
  dotIdle: {
    backgroundColor: '#6b7280',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  textActive: {
    color: '#fff',
  },
  textIdle: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

const TEXTS = {
  KOREA: {
    listening: '듣고 있어요...',
    standby: '대기 중... (AEC ON)',
  },
  GLOBAL: {
    listening: 'Listening...',
    standby: 'Standby... (AEC ON)',
  },
} as const;
