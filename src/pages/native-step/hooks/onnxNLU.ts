/**
 * onnxNLU – On-device NLU (Electra) via onnxruntime-react-native
 *
 * tokenizer: 직접 구현 (WordPiece/BERT)
 * inference: onnxruntime-react-native InferenceSession
 */

import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';

// ─── Types ───
export type IntentLabel =
  | 'NEXT_STEP'
  | 'PREV_STEP'
  | 'GO_TO_STEP'
  | 'GO_TO_SCENE_NUMBER'
  | 'PLAY'
  | 'PAUSE'
  | 'EXTRA'
  | 'GO_TO_SCENE'
  | 'TIMER_START'
  | 'TIMER_CANCEL'
  | 'TIMER_PAUSE'
  | 'TIMER_RESUME';

const ID2LABEL: Record<number, IntentLabel> = {
  0: 'NEXT_STEP',
  1: 'PREV_STEP',
  2: 'GO_TO_STEP',
  3: 'PLAY',
  4: 'PAUSE',
  5: 'EXTRA',
  6: 'GO_TO_SCENE',
};

export interface NLUResult {
  intent: IntentLabel;
  confidence: number;
  allScores: Record<IntentLabel, number>;
}

// ─── WordPiece Tokenizer ───

interface TokenizerJSON {
  model: {
    type: string;
    vocab: Record<string, number>;
    unk_token: string;
    continuing_subword_prefix: string;
    max_input_chars_per_word: number;
  };
  added_tokens: Array<{ id: number; content: string }>;
  truncation?: { max_length: number };
}

class WordPieceTokenizer {
  private vocab: Map<string, number>;
  private unkId: number;
  private clsId: number;
  private sepId: number;
  private prefix: string;
  private maxWordLen: number;
  private maxLength: number;

  constructor(tokenizerJson: TokenizerJSON) {
    this.vocab = new Map(Object.entries(tokenizerJson.model.vocab));
    this.unkId = this.vocab.get(tokenizerJson.model.unk_token) ?? 1;
    this.clsId = tokenizerJson.added_tokens.find(t => t.content === '[CLS]')?.id ?? 2;
    this.sepId = tokenizerJson.added_tokens.find(t => t.content === '[SEP]')?.id ?? 3;
    this.prefix = tokenizerJson.model.continuing_subword_prefix ?? '##';
    this.maxWordLen = tokenizerJson.model.max_input_chars_per_word ?? 100;
    this.maxLength = tokenizerJson.truncation?.max_length ?? 32;
  }

  encode(text: string): { input_ids: number[]; attention_mask: number[] } {
    const tokens: number[] = [this.clsId];

    const words = text
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 0);

    for (const word of words) {
      if (word.length > this.maxWordLen) {
        tokens.push(this.unkId);
        continue;
      }

      let start = 0;
      let isValid = true;

      while (start < word.length) {
        let end = word.length;
        let found = false;

        while (start < end) {
          let subword = word.slice(start, end);
          if (start > 0) subword = this.prefix + subword;

          const id = this.vocab.get(subword);
          if (id !== undefined) {
            tokens.push(id);
            found = true;
            start = end;
            break;
          }
          end--;
        }

        if (!found) {
          isValid = false;
          break;
        }
      }

      if (!isValid) {
        tokens.push(this.unkId);
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

// ─── Singleton ───
let _instance: NLUInstance | null = null;
let _loading: Promise<NLUInstance> | null = null;

interface NLUInstance {
  classify: (text: string) => Promise<NLUResult | null>;
  dispose: () => Promise<void>;
}

function softmax(logits: Float32Array): Float32Array {
  const max = Math.max(...logits);
  const exps = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    exps[i] = Math.exp(logits[i] - max);
    sum += exps[i];
  }
  for (let i = 0; i < exps.length; i++) {
    exps[i] /= sum;
  }
  return exps;
}

export async function createNLU(): Promise<NLUInstance> {
  if (_instance) return _instance;
  if (_loading) return _loading;

  _loading = (async () => {
    const startMs = Date.now();

    const tokenizerData: TokenizerJSON = require('../../../../assets/models/nlu/tokenizer.json');
    const tokenizer = new WordPieceTokenizer(tokenizerData);

    const modelAsset = Asset.fromModule(require('../../../../assets/models/nlu/model_quantized.onnx'));
    await modelAsset.downloadAsync();
    const session = await InferenceSession.create(modelAsset.localUri!);

    console.log(
      `[NLU] Model loaded in ${Date.now() - startMs}ms, inputs:`,
      session.inputNames,
      'outputs:',
      session.outputNames,
    );

    const classify = async (text: string): Promise<NLUResult | null> => {
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

        const results = await session.run({
          input_ids: inputIdsTensor,
          attention_mask: attentionMaskTensor,
        });

        const logits = results.logits.data as Float32Array;
        const probs = softmax(logits);

        let topIdx = 0;
        let topScore = 0;
        const allScores = {} as Record<IntentLabel, number>;

        for (let i = 0; i < probs.length; i++) {
          const label = ID2LABEL[i];
          allScores[label] = probs[i];
          if (probs[i] > topScore) {
            topScore = probs[i];
            topIdx = i;
          }
        }

        const elapsed = Date.now() - t0;
        console.log(
          `[NLU] ${elapsed}ms → ${ID2LABEL[topIdx]} (${(topScore * 100).toFixed(1)}%) text="${text}"`,
        );

        return { intent: ID2LABEL[topIdx], confidence: topScore, allScores };
      } catch (e) {
        console.error('[NLU] classify error:', e);
        return null;
      }
    };

    const dispose = async () => {
      await session.release();
      _instance = null;
      _loading = null;
    };

    _instance = { classify, dispose };
    return _instance;
  })();

  return _loading;
}
