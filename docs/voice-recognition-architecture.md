# ChefTory Android 음성 인식 아키텍처 & 워크플로우

## 목차

- [1. 전체 아키텍처](#1-전체-아키텍처)
- [2. 레이어별 상세 설명](#2-레이어별-상세-설명)
- [3. 유저 플로우](#3-유저-플로우)
- [4. 파일 인벤토리](#4-파일-인벤토리)
- [5. 의도 분류 3단계](#5-의도-분류-3단계)
- [6. STT 모드 분기](#6-stt-모드-분기)
- [7. ONNX 모델 상세](#7-onnx-모델-상세)
- [8. 설정값 & 임계치](#8-설정값--임계치)
- [9. 상태 관리 & 동기화](#9-상태-관리--동기화)
- [10. End-to-End 예시](#10-end-to-end-예시)
- [11. 에러 처리](#11-에러-처리)

---

## 1. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        React Native (Expo)                             │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────────┐  │
│  │  Step Page    │   │ useVoiceCommand  │   │  useWebAudioPipeline   │  │
│  │  [id].tsx     │──▶│  (오케스트레이터)  │──▶│  (오디오 브릿지/VAD/STT) │  │
│  └──────┬───────┘   └────────┬─────────┘   └───────────┬────────────┘  │
│         │                    │                          │               │
│         │    ┌───────────────┼──────────────────────────┤               │
│         ▼    ▼               ▼                          ▼               │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ Silero VAD    │  │ ONNX NLU     │  │ ONNX Embedding (MiniLM)    │  │
│  │ (음성 감지)    │  │ (의도 분류)   │  │ (시맨틱 씬 매칭)             │  │
│  └───────────────┘  └──────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                     WebView (Next.js - VideoPage)                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  getUserMedia() → AudioContext(16kHz) → AudioWorkletNode        │   │
│  │  → pcm-worklet.js (Float32→Int16) → postMessage → postToNative │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                     Native Android                                     │
│  ┌──────────────────────────┐  ┌────────────────────────────────────┐  │
│  │ RECORD_AUDIO Permission  │  │ expo-speech-transcriber             │  │
│  │ (AndroidManifest.xml)    │  │ (Google SpeechRecognizer wrapper)   │  │
│  └──────────────────────────┘  └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 레이어별 상세 설명

### 2.1 WebView Layer

| 모듈 | 기술 | 역할 |
|------|------|------|
| `VideoPage.tsx` (Next.js) | `getUserMedia()`, Web Audio API | 마이크 접근 및 오디오 캡처 |
| `pcm-worklet.js` | `AudioWorkletProcessor` | Float32 → Int16 변환, 640샘플(40ms) 청킹 |
| 메시지 브릿지 | `postMessage` / base64 인코딩 | React Native로 오디오 청크 전송 |

**왜 WebView에서 오디오를 캡처하는가?**

Android React Native에는 직접적인 실시간 오디오 스트리밍 API가 없기 때문에, WebView의 Web Audio API + AudioWorklet을 브릿지로 활용한다. 이를 통해 커스텀 네이티브 모듈 없이 순수 JS/TS 레벨에서 전체 음성 파이프라인을 제어할 수 있다.

**WebView 브릿지 메시지 프로토콜:**

```
WebView → React Native:
  {type: 'debug', msg: 'mic_ready'}           // WebView 준비 완료
  {type: 'audio_stream_start'}                 // 스트림 시작
  {type: 'audio_stream_chunk', base64, bytes}  // 오디오 청크 (640 samples)
  {type: 'audio_stream_end'}                   // 스트림 종료

React Native → WebView (inject):
  window.__startRecording()   // 마이크 캡처 시작
  window.__stopRecording()    // 마이크 캡처 중지
```

### 2.2 React Native Layer

| 모듈 | 기술 | 역할 |
|------|------|------|
| `useWebAudioPipeline.ts` | Ring Buffer, base64 디코딩 | 오디오 스트림 수신 및 관리 |
| `sileroVAD.ts` | `onnxruntime-react-native`, Silero VAD v4 | 음성 구간 감지 (VAD) |
| `useVoiceCommand.ts` | 오케스트레이터 | 전체 음성 명령 파이프라인 조율 |
| `useLocalNLU.ts` | 키워드 매칭 | 즉시 의도 분류 (Layer 1) |
| `onnxNLU.ts` | `onnxruntime-react-native`, Electra | 의도 분류 7종 (Layer 2) |
| `onnxEmbedding.ts` | `onnxruntime-react-native`, MiniLM | 384차원 임베딩, 씬 매칭 (Layer 3) |
| `useSceneMatcher.ts` | 코사인 유사도 | 발화 ↔ 씬 설명 매칭 |
| `audioUtils.ts` | base64 → Float32 변환 | 오디오 데이터 포맷 변환 |

### 2.3 Native Android Layer

| 모듈 | 기술 | 역할 |
|------|------|------|
| `expo-speech-transcriber` | Google `SpeechRecognizer` API | 음성 → 텍스트 변환 (STT) |
| `AndroidManifest.xml` | `RECORD_AUDIO` permission | 마이크 권한 |

---

## 3. 유저 플로우

### Step 1. 사용자 마이크 버튼 탭

```
사용자: 🎤 마이크 버튼 탭
         │
         ▼
 React Native Layer
 useVoiceCommand.toggleListening()
 ├─ 마이크 권한 확인 (Audio.requestPermissionsAsync)
 ├─ Silero VAD ONNX 모델 로드
 └─ useWebAudioPipeline.start() 호출
         │
         │  webViewRef.injectJavaScript('__startRecording()')
         ▼
```

### Step 2. WebView 오디오 캡처

```
 WebView Layer (Next.js VideoPage)
 │
 │  __startRecording()
 │  ├─ navigator.mediaDevices.getUserMedia({ audio: true })
 │  ├─ new AudioContext({ sampleRate: 16000 })
 │  ├─ createMediaStreamSource(stream)
 │  ├─ audioContext.audioWorklet.addModule('/pcm-worklet.js')
 │  └─ new AudioWorkletNode('pcm-16k-worklet')
 │
 │  pcm-worklet.js (AudioWorkletProcessor)
 │  ├─ Float32 → Int16 PCM 변환
 │  ├─ 640 샘플씩 청킹 (40ms @ 16kHz)
 │  └─ port.postMessage(Int16 ArrayBuffer)
 │
 │  onmessage → base64 인코딩
 │  └─ postToNative({ type: 'audio_stream_chunk', base64 })
 │
 ▼
```

### Step 3. React Native 오디오 수신 & VAD

```
 React Native Layer (useWebAudioPipeline)
 │
 │  handleWebViewMessage()
 │  ├─ base64PcmToFloat32() 디코딩
 │  ├─ Ring Buffer에 오디오 쓰기 (0.5초 프리버퍼)
 │  │
 │  └─ Silero VAD 처리 (512 샘플 = 32ms 프레임)
 │     ├─ speechProb > 0.7 → 음성 감지됨
 │     └─ 3+ 연속 프레임(~96ms) → 발화 시작 확정
 │
 ▼
```

### Step 4. STT 모드 분기 (상세: 섹션 6 참고)

```
 ┌────────────────────┬────────────────────┬────────────────────┐
 │  streaming 모드     │  batch 모드         │  native 모드       │
 │  (API 33+)          │  (API 33+)          │  (API < 33)        │
 ├────────────────────┼────────────────────┼────────────────────┤
 │  실시간 STT 전송    │  0.5초 무음 감지 시  │  WebView mic off   │
 │                    │  일괄 전송           │  Android Native    │
 │                    │                    │  SpeechRecognizer  │
 ├────────────────────┼────────────────────┼────────────────────┤
 │  expo-speech-      │  expo-speech-      │  Android Native    │
 │  transcriber       │  transcriber       │  SpeechRecognizer  │
 │  .realtimeBuffer   │  .realtimeBuffer   │  API 직접 호출      │
 │  Transcribe()      │  Transcribe()      │                    │
 ├────────────────────┼────────────────────┼────────────────────┤
 │  interim 결과 반환  │  final 결과 반환    │  final 결과 반환    │
 └────────┬───────────┴─────────┬──────────┴─────────┬──────────┘
          └─────────────────────┼────────────────────┘
                                ▼
```

### Step 5. 의도 분류 (상세: 섹션 5 참고)

```
 텍스트 입력
 │
 ├─ Layer 1: 키워드 매칭 (즉시, ~1ms)
 │  ├─ "다음" → NEXT_STEP
 │  ├─ "이전" → PREV_STEP
 │  ├─ "재생" → PLAY / "정지" → PAUSE
 │  └─ "두번째 단계" → GO_TO_STEP(2)
 │
 ├─ Layer 2: ONNX NLU Electra (~100-200ms)
 │  └─ 의도 분류 7종 (confidence >= 0.7)
 │
 └─ Layer 3: ONNX Embedding MiniLM (~200-500ms)
    └─ 384차원 벡터 → 코사인 유사도 → 씬 매칭
```

### Step 6. 명령 실행

```
 분류된 의도
 │
 ├─ NEXT_STEP / PREV_STEP  → 스텝 네비게이션
 ├─ PLAY / PAUSE           → YouTube 영상 제어 (WebView 메시지)
 ├─ GO_TO_STEP             → 특정 스텝으로 이동
 ├─ GO_TO_SCENE            → 영상 타임스탬프 이동
 └─ EXTRA                  → 추가 정보 표시
 │
 └─ IntentFeedbackToast 표시 (1800ms)
```

---

## 4. 파일 인벤토리

### 핵심 파일

| 파일 | 경로 | 역할 |
|------|------|------|
| Step Page | `src/app/(app)/native-step/[id].tsx` | 메인 레시피 스텝 뷰 + 음성 제어 통합 |
| Voice Command | `src/pages/native-step/hooks/useVoiceCommand.ts` | 전체 파이프라인 오케스트레이터 |
| Audio Pipeline | `src/pages/native-step/hooks/useWebAudioPipeline.ts` | WebView 오디오 브릿지 + VAD + STT |
| Audio Utils | `src/pages/native-step/hooks/audioUtils.ts` | base64 PCM → Float32 변환 |
| Silero VAD | `src/pages/native-step/hooks/sileroVAD.ts` | 음성 구간 감지 (ONNX) |
| Local NLU | `src/pages/native-step/hooks/useLocalNLU.ts` | 키워드 기반 즉시 분류 |
| ONNX NLU | `src/pages/native-step/hooks/onnxNLU.ts` | Electra 기반 의도 분류 |
| ONNX Embedding | `src/pages/native-step/hooks/onnxEmbedding.ts` | MiniLM 임베딩 + 코사인 유사도 |
| Scene Matcher | `src/pages/native-step/hooks/useSceneMatcher.ts` | 씬 시맨틱 매칭 |
| WebView Message | `src/pages/webview/message/useHandleMessage.ts` | WebView 메시지 라우터 |

### UI 컴포넌트

| 파일 | 경로 | 역할 |
|------|------|------|
| Speech Caption | `src/pages/native-step/components/SpeechCaptionBar.tsx` | STT 상태 표시 (듣는 중 / 텍스트) |
| Intent Toast | `src/pages/native-step/components/IntentFeedbackToast.tsx` | 의도 인식 결과 토스트 |

---

## 5. 의도 분류 3단계

### Layer 1: 키워드 매칭 (`useLocalNLU.ts`)

**속도:** 즉시 (~1ms)

```
NEXT_KEYWORDS:  ['다음', '넘어가', '넘겨', '다음 단계', '다음 스텝', 'next']
PREV_KEYWORDS:  ['이전', '뒤로', '이전 단계', '이전 스텝', '앞으로', 'previous', 'back']
PLAY_KEYWORDS:  ['재생', '시작', '플레이', 'play', 'start']
PAUSE_KEYWORDS: ['정지', '멈춰', '일시정지', '스탑', '멈춤', 'stop', 'pause']
GOTO_KEYWORDS:  ['단계', '스텝', 'step']

한국어 숫자 매핑:
  첫/하나/한/일 → 1,  두/둘/이 → 2,  세/셋/삼 → 3,
  네/넷/사 → 4,       다섯/오 → 5,    여섯/육 → 6,
  일곱/칠 → 7,        여덟/팔 → 8,    아홉/구 → 9,
  열/십 → 10
```

**분류 우선순위:** GO_TO_STEP → NEXT_STEP → PREV_STEP → PLAY → PAUSE

매칭 실패 시 Layer 2로 폴백.

### Layer 2: ONNX NLU (`onnxNLU.ts`)

**속도:** ~100-200ms

- **모델:** Electra (quantized ONNX)
- **토크나이저:** WordPiece (`[CLS]` + tokens + `[SEP]`, max 32 tokens)
- **출력:** 7종 인텐트 + confidence score

```
Intent Labels:
  0: NEXT_STEP    1: PREV_STEP    2: GO_TO_STEP
  3: PLAY         4: PAUSE        5: EXTRA
  6: GO_TO_SCENE
```

confidence >= 0.7 이면 실행. GO_TO_SCENE이면 Layer 3으로 진행.

### Layer 3: 씬 임베딩 매칭 (`onnxEmbedding.ts` + `useSceneMatcher.ts`)

**속도:** ~200-500ms

- **모델:** MiniLM (quantized ONNX)
- **토크나이저:** SentencePiece Unigram
- **출력:** 384차원 벡터 → 코사인 유사도

```
Flow:
  1. 레시피 씬 라벨 사전 임베딩 (캐싱)
     "장면1. 양파 썰기", "장면2. 계란 넣기", ...
  2. 사용자 발화 임베딩
  3. 코사인 유사도 계산
  4. score > 0.3 이면 해당 씬으로 이동
```

### 분류 흐름도

```
interim/final 텍스트
         │
         ▼
  ┌─ classifyLocal() ─┐
  │  키워드 매칭       │
  └────────┬───────────┘
           │
     match? ──YES──▶ 즉시 실행 ✅
           │
           NO
           │
           ▼
  ┌─ NLU classify() ──┐
  │  Electra ONNX     │
  └────────┬───────────┘
           │
  conf >= 0.7? ──YES──┬──▶ GO_TO_SCENE? ──YES──▶ findBestScene() ▶ 실행 ✅
           │          │
           │          └──▶ 기타 intent ▶ 실행 ✅
           NO
           │
           ▼
  ┌─ findBestScene() ─┐
  │  MiniLM 임베딩     │
  │  코사인 유사도     │
  └────────┬───────────┘
           │
  score > 0.3? ──YES──▶ seekToScene() ✅
           │
           NO ──▶ 무시 (인식 실패)
```

---

## 6. STT 모드 분기

### 모드 결정 기준

| 모드 | 조건 | STT 방식 |
|------|------|----------|
| `streaming` | iOS 전체 + Android API 33+ (on-device) | 실시간 오디오 청크 전송 |
| `batch` | Android API 33+ (cloud fallback) | 0.5초 무음 감지 후 일괄 전송 |
| `native` | Android API < 33 | WebView mic 중단 → 네이티브 SpeechRecognizer |

### Streaming 모드

```
VAD 음성 감지 → 프리버퍼(0.5s) + 실시간 청크 → expo-speech-transcriber
                                                 ├─ interim 결과 → 즉시 분류
                                                 └─ final 결과 → 최종 분류
```

### Batch 모드

```
VAD 음성 감지 → speechBuffer에 축적
                    │
                0.5초 무음 (SILENCE_FRAMES_FOR_BATCH = 16)
                    │
                    ▼
              flushBatchBuffer()
              ├─ 전체 오디오 일괄 전송
              ├─ 300ms 후 stopBufferTranscription
              └─ final 결과 대기
```

### Native 모드

```
VAD 음성 감지 → WebView 마이크 중단
                    │
                    ▼
              Android SpeechRecognizer 직접 호출
              └─ final 결과 반환
```

---

## 7. ONNX 모델 상세

### Silero VAD v4

| 항목 | 값 |
|------|-----|
| 파일 | `assets/models/silero_vad.onnx` |
| 크기 | ~2MB |
| 입력 | input[1,512], sr(int64), h[2,1,64], c[2,1,64] |
| 출력 | output[1,1] (확률), hn[2,1,64], cn[2,1,64] |
| EP | CPU (CoreML/NNAPI LSTM 이슈 회피) |
| 프레임 | 512 samples = 32ms @ 16kHz |
| 상태 | Stateful LSTM (hidden/cell 유지) |

### NLU Electra

| 항목 | 값 |
|------|-----|
| 파일 | `assets/models/nlu/model_quantized.onnx` |
| 토크나이저 | `assets/models/nlu/tokenizer.json` (WordPiece) |
| 크기 | ~8-15MB |
| 입력 | input_ids(int64), attention_mask(int64) |
| 출력 | logits(float32) → softmax → 7종 인텐트 |
| Max tokens | 32 |
| 싱글톤 | 전역 캐싱 (`_instance`) |

### MiniLM Embedding

| 항목 | 값 |
|------|-----|
| 파일 | `assets/models/embedding/model_quantized.onnx` |
| 토크나이저 | `assets/models/embedding/tokenizer.json` (SentencePiece Unigram) |
| 크기 | ~30-50MB |
| 입력 | input_ids, attention_mask, token_type_ids (all int64) |
| 출력 | last_hidden_state → mean pooling → L2 정규화 → 384차원 |
| Max tokens | 128 |
| 싱글톤 | 전역 캐싱 (`_instance`) |

---

## 8. 설정값 & 임계치

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| `SAMPLE_RATE` | 16000 Hz | 오디오 샘플레이트 |
| `WINDOW_SIZE` | 512 samples | VAD 프레임 크기 (32ms) |
| `PRE_BUFFER_SAMPLES` | 8000 (0.5s) | 발화 시작 전 프리버퍼 |
| `MAX_UTTERANCE_SAMPLES` | 160000 (10s) | 최대 발화 길이 |
| `SPEECH_THRESHOLD` | 0.7 | VAD 음성 감지 확률 임계치 |
| `SPEECH_FRAMES_TO_ACTIVATE` | 3 (~96ms) | 발화 시작 확정 프레임 수 |
| `SILENCE_FRAMES_FOR_BATCH` | 16 (~0.5s) | Batch 모드 무음 감지 |
| `NLU_CONFIDENCE_THRESHOLD` | 0.7 | NLU 의도 분류 신뢰도 |
| `SCENE_MATCH_THRESHOLD` | 0.3 | 씬 매칭 코사인 유사도 |
| `FEEDBACK_DURATION` | 1800ms | 인텐트 피드백 토스트 |
| WebView Ready Delay | 1500ms | 비디오 로드 후 대기 |

---

## 9. 상태 관리 & 동기화

### 상태 머신

```
IDLE ──start()──▶ LISTENING
                      │
                 VAD 음성 감지 (3 연속 프레임 > 0.7)
                      │
                      ▼
                 TRANSCRIBING
                 ├─ STT 실행 중
                 ├─ interim/final 결과 수신
                 └─ 의도 분류 & 실행
                      │
                 stop() 또는 발화 종료
                      │
                      ▼
                   IDLE (또는 LISTENING으로 복귀)
```

### Race Condition 방지 Ref

```typescript
// useWebAudioPipeline
processingRef: boolean     // VAD 동시 처리 방지
transcribingRef: boolean   // 다중 STT 세션 방지
batchFlushingRef: boolean  // Batch flush 재진입 방지
webViewReadyRef: boolean   // 녹음 인젝션 게이트

// useVoiceCommand
isListeningRef: boolean           // 실제 리스닝 상태 (state 지연 보정)
handledInInterimRef: boolean      // interim에서 처리 시 final 중복 실행 방지
nluReadyRef: boolean              // NLU 모델 로드 완료 플래그
```

### Interim vs Final 중복 실행 방지

```
interim 결과 수신
  ├─ 의도 분류 성공 → 실행 + handledInInterimRef = true
  └─ 의도 분류 실패 → 대기

final 결과 수신
  ├─ handledInInterimRef === true → SKIP (중복 방지)
  └─ handledInInterimRef === false → 최종 분류 시도
```

### Boost Words (STT 정확도 향상)

```
기본 단어: [다음, 이전, 재생, 정지, 멈춰, 넘어가, ...]
한국어 숫자: [일, 이, 삼, ..., 십, 하나, 둘, ...]
씬 라벨: split by whitespace → 2글자 이상 단어만
총 최대 100단어 → expo-speech-transcriber boost 전달
```

---

## 10. End-to-End 예시

### 예시 1: "다음 단계" (키워드 매칭)

```
1.  WebView pcm-worklet → 640 sample Int16 PCM 청크
2.  base64 인코딩 → postToNative({type: 'audio_stream_chunk'})
3.  handleWebViewMessage → base64PcmToFloat32()
4.  Ring Buffer에 저장 (0.5s 프리버퍼)
5.  VAD: prob 0.82, 0.91, 0.88 (3 연속 > 0.7)
6.  → 발화 시작! LISTENING → TRANSCRIBING
7.  프리버퍼 + 실시간 청크 → expo-speech-transcriber
8.  interim: "다음"
9.  classifyLocal("다음") → NEXT_STEP ✅
10. executeIntent(NEXT_STEP) → goToNextStep()
11. handledInInterimRef = true
12. final: "다음 단계"
13. handledInInterimRef === true → SKIP
14. Toast: "다음 단계 →" (1800ms)
15. finishTranscription → TRANSCRIBING → LISTENING
```

### 예시 2: "계란 넣는 부분" (씬 매칭)

```
1-7.  [동일]
8.  interim: "계란 넣는"
9.  classifyLocal("계란 넣는") → null (매칭 실패)
10. NLU classify("계란 넣는") → GO_TO_SCENE (conf: 0.85)
11. findBestScene("계란 넣는")
    a. embed("계란 넣는") → [0.12, -0.34, ...] (384d)
    b. 캐싱된 씬 임베딩과 코사인 유사도 비교
    c. "장면2. 계란 넣기" → score: 0.92 (> 0.3)
12. seekToScene(1) → SEEK_TO 타임스탬프
13. Toast: "계란 넣기" (1800ms)
```

---

## 11. 에러 처리

| 상황 | 처리 |
|------|------|
| 마이크 권한 거부 | Alert 표시, error state 설정 |
| VAD 모델 로드 실패 | Warning 로그, 음성 감지 불가 |
| NLU 모델 로드 실패 | Warning 로그, 키워드 + 씬 매칭만 사용 |
| Embedding 모델 로드 실패 | Error 로그, 씬 매칭 null 반환 |
| STT 에러 | finishTranscription(), error state |
| NLU classify 에러 | Warning 로그, 폴백 매칭 계속 |
| WebView __startRecording 없음 | Warning 로그, 재시도 없음 |
| WebView 메시지 JSON 파싱 실패 | Silent ignore |
| 10초 초과 발화 | 강제 finishTranscription (OOM 방지) |

### 성능 로깅

```
[Perf:VAD]  frame #N | {duration}ms | prob: {value}
[Perf:STT]  interim/final "text" | VAD→STT: {elapsed}ms
[WebAudioPipeline] Batch: sending {samples} samples ({seconds}s)
```
