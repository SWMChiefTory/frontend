/**
 * onnxEmbedding – On-device sentence embedding (MiniLM) via onnxruntime-react-native
 *
 * tokenizer: Unigram (SentencePiece) 로컬 구현 – CDN 불필요
 * inference: onnxruntime-react-native InferenceSession
 * output: 384-dim normalized vector (mean pooling)
 */

import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';

// ─── Singleton ───
let _instance: EmbeddingInstance | null = null;
let _loading: Promise<EmbeddingInstance> | null = null;

export type EmbeddingInstance = {
  embed: (text: string) => Promise<number[] | null>;
  dispose: () => Promise<void>;
}

// ─── Unigram (SentencePiece) Tokenizer ───

type UnigramTokenizerJSON = {
  model: {
    type: string;
    vocab: [string, number][];
  };
  added_tokens: Array<{ id: number; content: string }>;
  truncation?: { max_length: number };
}

class UnigramTokenizer {
  private vocab: Map<string, { id: number; score: number }>;
  private maxLength: number;
  private clsId: number;
  private sepId: number;
  private unkId: number;
  private maxPieceLen: number;

  constructor(tokenizerJson: UnigramTokenizerJSON) {
    this.vocab = new Map();
    const vocabList = tokenizerJson.model.vocab;

    for (let i = 0; i < vocabList.length; i++) {
      const [token, score] = vocabList[i];
      this.vocab.set(token, { id: i, score });
    }

    this.clsId = tokenizerJson.added_tokens.find(t => t.content === '<s>')?.id ?? 0;
    this.sepId = tokenizerJson.added_tokens.find(t => t.content === '</s>')?.id ?? 2;
    this.unkId = tokenizerJson.added_tokens.find(t => t.content === '<unk>')?.id ?? 3;
    this.maxLength = tokenizerJson.truncation?.max_length ?? 128;

    this.maxPieceLen = 0;
    for (const [token] of vocabList) {
      if (token.length > this.maxPieceLen && !token.startsWith('<')) {
        this.maxPieceLen = token.length;
      }
    }
    if (this.maxPieceLen > 32) this.maxPieceLen = 32;
  }

  encode(text: string): { input_ids: number[]; attention_mask: number[] } {
    const processed = '▁' + text.trim().replace(/ /g, '▁');

    const tokens: number[] = [this.clsId];
    let pos = 0;

    while (pos < processed.length) {
      let bestLen = 0;
      let bestId = this.unkId;
      let bestScore = -Infinity;

      const maxLen = Math.min(this.maxPieceLen, processed.length - pos);
      for (let len = maxLen; len >= 1; len--) {
        const piece = processed.slice(pos, pos + len);
        const entry = this.vocab.get(piece);
        if (entry && entry.score > bestScore) {
          bestScore = entry.score;
          bestId = entry.id;
          bestLen = len;
        }
      }

      if (bestLen === 0) {
        tokens.push(this.unkId);
        pos += 1;
      } else {
        tokens.push(bestId);
        pos += bestLen;
      }
    }

    tokens.push(this.sepId);

    if (tokens.length > this.maxLength) {
      tokens.length = this.maxLength;
      tokens[this.maxLength - 1] = this.sepId;
    }

    const attention_mask = new Array(tokens.length).fill(1);
    return { input_ids: tokens, attention_mask };
  }
}

// ─── Mean Pooling + L2 Normalize ───

function meanPoolAndNormalize(
  hiddenState: Float32Array,
  attentionMask: number[],
  seqLen: number,
  hiddenSize: number,
): number[] {
  const result = new Array(hiddenSize).fill(0);
  let count = 0;

  for (let t = 0; t < seqLen; t++) {
    if (attentionMask[t] === 0) continue;
    count++;
    const offset = t * hiddenSize;
    for (let d = 0; d < hiddenSize; d++) {
      result[d] += hiddenState[offset + d];
    }
  }

  if (count > 0) {
    for (let d = 0; d < hiddenSize; d++) {
      result[d] /= count;
    }
  }

  // L2 normalize
  let norm = 0;
  for (let d = 0; d < hiddenSize; d++) {
    norm += result[d] * result[d];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let d = 0; d < hiddenSize; d++) {
      result[d] /= norm;
    }
  }

  return result;
}

// ─── Cosine Similarity ───

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Factory ───

export async function createEmbedding(): Promise<EmbeddingInstance> {
  if (_instance) return _instance;
  if (_loading) return _loading;

  _loading = (async () => {
    const startMs = Date.now();

    const tokenizerData: UnigramTokenizerJSON = require('../../../../assets/models/embedding/tokenizer.json');
    const tokenizer = new UnigramTokenizer(tokenizerData);

    const modelAsset = Asset.fromModule(require('../../../../assets/models/embedding/model_quantized.onnx'));
    await modelAsset.downloadAsync();
    const session = await InferenceSession.create(modelAsset.localUri!);

    console.log(
      `[Embedding] Model loaded in ${Date.now() - startMs}ms, inputs:`,
      session.inputNames,
      'outputs:',
      session.outputNames,
    );

    const HIDDEN_SIZE = 384;

    const embed = async (text: string): Promise<number[] | null> => {
      try {
        const t0 = Date.now();

        const { input_ids, attention_mask } = tokenizer.encode(text);
        const seqLen = input_ids.length;

        const inputIdsTensor = new Tensor(
          'int64',
          BigInt64Array.from(input_ids.map(id => BigInt(id))),
          [1, seqLen],
        );
        const attentionMaskTensor = new Tensor(
          'int64',
          BigInt64Array.from(attention_mask.map(m => BigInt(m))),
          [1, seqLen],
        );
        const tokenTypeIdsTensor = new Tensor(
          'int64',
          BigInt64Array.from(new Array(seqLen).fill(0).map(() => BigInt(0))),
          [1, seqLen],
        );

        const results = await session.run({
          input_ids: inputIdsTensor,
          attention_mask: attentionMaskTensor,
          token_type_ids: tokenTypeIdsTensor,
        });

        const hiddenState = results.last_hidden_state.data as Float32Array;
        const vector = meanPoolAndNormalize(hiddenState, attention_mask, seqLen, HIDDEN_SIZE);

        const elapsed = Date.now() - t0;
        console.log(`[Embedding] ${elapsed}ms, ${seqLen} tokens → ${HIDDEN_SIZE}d vector`);

        return vector;
      } catch (e) {
        console.error('[Embedding] embed error:', e);
        return null;
      }
    };

    const dispose = async () => {
      await session.release();
      _instance = null;
      _loading = null;
    };

    _instance = { embed, dispose };
    return _instance;
  })();

  return _loading;
}
