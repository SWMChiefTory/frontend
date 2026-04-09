/**
 * useSceneMatcher – 네이티브 ONNX 임베딩 기반 장면 매칭
 *
 * onnxEmbedding.ts의 임베딩 함수를 사용하여
 * 음성 텍스트와 가장 유사한 장면을 찾음.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createEmbedding, cosineSimilarity, type EmbeddingInstance } from './onnxEmbedding';

export interface SceneMatchResult {
  index: number;
  score: number;
  label: string;
}

const SCENE_MATCH_THRESHOLD = 0.3;

export function useSceneMatcher(sceneLabels: string[]) {
  const [isReady, setIsReady] = useState(false);
  const sceneEmbeddingsRef = useRef<number[][] | null>(null);
  const embeddedLabelsRef = useRef<string>('');
  const embeddingRef = useRef<EmbeddingInstance | null>(null);
  const labelsKey = sceneLabels.join('|');

  // 라벨이 바뀌면 ready만 false (이전 임베딩은 유지하다가 새 값 준비되면 교체)
  useEffect(() => {
    if (embeddedLabelsRef.current !== labelsKey) {
      setIsReady(false);
    }
  }, [labelsKey]);

  // 임베딩 모델 로드 + 장면 라벨 임베딩 (lazy)
  const embedScenes = useCallback(async () => {
    if (embeddedLabelsRef.current === labelsKey && sceneEmbeddingsRef.current) {
      return;
    }

    try {
      if (!embeddingRef.current) {
        embeddingRef.current = await createEmbedding();
      }

      const embeddings: number[][] = [];
      for (let i = 0; i < sceneLabels.length; i++) {
        const labelWithPrefix = `장면${i + 1}. ${sceneLabels[i]}`;
        const embedding = await embeddingRef.current.embed(labelWithPrefix);
        if (embedding) {
          embeddings.push(embedding);
        }
      }

      sceneEmbeddingsRef.current = embeddings;
      embeddedLabelsRef.current = labelsKey;
      setIsReady(true);
      console.log(`[SceneMatcher] Embedded ${sceneLabels.length} scenes`);
    } catch (e) {
      console.error('[SceneMatcher] Embedding failed:', e);
    }
  }, [sceneLabels, labelsKey]);

  // 가장 유사한 장면 찾기
  const findBestScene = useCallback(
    async (userText: string): Promise<SceneMatchResult | null> => {
      if (!sceneEmbeddingsRef.current) {
        await embedScenes();
      }
      if (!sceneEmbeddingsRef.current || sceneEmbeddingsRef.current.length === 0) {
        return null;
      }

      try {
        if (!embeddingRef.current) {
          embeddingRef.current = await createEmbedding();
        }
        const queryEmbedding = await embeddingRef.current.embed(userText);
        if (!queryEmbedding) return null;

        let bestIdx = 0;
        let bestScore = -1;

        for (let i = 0; i < sceneEmbeddingsRef.current.length; i++) {
          const score = cosineSimilarity(queryEmbedding, sceneEmbeddingsRef.current[i]);
          if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        }

        if (bestScore < SCENE_MATCH_THRESHOLD) {
          return null;
        }

        return {
          index: bestIdx,
          score: bestScore,
          label: sceneLabels[bestIdx],
        };
      } catch (e) {
        console.error('[SceneMatcher] Match failed:', e);
        return null;
      }
    },
    [embedScenes, sceneLabels],
  );

  return { findBestScene, embedScenes, isLoading: false, isReady };
}
