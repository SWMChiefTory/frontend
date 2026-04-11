# 내가 직접 발견한 리팩토링 항목

코드 읽으면서 직접 찾은 개선 포인트. AI가 아닌 내가 발견한 것만 기록.

---

## 1. RecipeStepScreen — 불필요한 scenes 변수

**파일**: `src/pages/native-step/ui/RecipeStepScreen.tsx:74`

**현재**:
```tsx
const scenes: Scene[] = currentStep?.scenes ?? [];
const sceneLabels = useMemo(() => scenes.map((s: Scene) => s.label), [scenes]);
```

**문제**: `scenes` 변수는 `sceneLabels` 만들기 위해서만 존재. 다른 곳에서는 전부 `currentStep?.scenes?.[i]`로 직접 접근.

**개선**:
```tsx
const sceneLabels = useMemo(
  () => (currentStep?.scenes ?? []).map(s => s.label),
  [currentStep?.scenes],
);
```

`const scenes` 삭제 가능. 불필요한 중간 변수.

---

## 2. CookingMode END 이벤트 — 노이즈 데이터 정리

**파일**: `src/pages/native-step/ui/RecipeStepScreen.tsx:113~138`

**문제**: END 이벤트에 보내는 지표 대부분이 실제 분석에 활용되지 않는 노이즈.
- `duration_seconds` — 앱 이탈 시간 포함이라 부정확. Amplitude가 START/END 타임스탬프로 자체 계산 가능.
- `last_step_index`, `visited_steps_unique`, `step_completion_rate` — 실제로 이 데이터로 분석한 적 없음.
- `voice_command_count`, `touch_command_count` — command 이벤트에서 이미 개별 추적 중. END에서 합산할 필요 없음.

**개선**: END 이벤트 간소화. 또는 "이 데이터로 어떤 질문에 답할 건지" 정의한 후 필요한 것만 남기기.

**관련 ref 정리**: END 지표 제거 시 `sessionStartRef`, `visitedStepsRef`, `voiceCommandCountRef`, `touchCommandCountRef`도 불필요해질 수 있음.

---

## 3. RecipeStepScreen:64 — 상태를 미리 꺼내놓을 필요 없음

**Q**: "이렇게 미리 꺼내놓을 필요가 없음. 나중에 분해"

```tsx
const steps = recipe?.steps ?? [];
const totalSteps = steps.length;
const [currentStepIndex, setCurrentStepIndex] = useState(0);
const currentStep = steps[currentStepIndex] ?? steps[0];
const [activeSceneIndex, setActiveSceneIndex] = useState<number | null>(0);
const [isPlaying, setIsPlaying] = useState(false);
const [isVideoLoaded, setIsVideoLoaded] = useState(false);
```

**판단: ✅ 좋은 지적.** 이 7줄의 상태가 하나의 커스텀 훅 `useStepNavigation(recipe)`으로 묶일 수 있음. step/scene 상태 + isPlaying + isVideoLoaded가 전부 step 네비게이션과 관련. 메인 스크린이 800줄+인 이유 중 하나가 여기에 상태가 다 풀려있기 때문.

**개선**:
```tsx
const { steps, totalSteps, currentStep, currentStepIndex, setCurrentStepIndex, 
        activeSceneIndex, setActiveSceneIndex, isPlaying, setIsPlaying, 
        isVideoLoaded, setIsVideoLoaded, isFirstStep, isLastStep } 
  = useStepNavigation(recipe);
```

---

## 4. RecipeStepScreen:92 — CookingMode 트래킹 노이즈 제거

**Q**: "굳이 시간, 마지막 뭐였는지 등등 세세하게 분석하는 경우는 없으니까 우선 노이즈 제거"

**판단: ✅ 맞음.** 항목 2번과 동일 이슈. ref 6개 + useEffect 3개 + END 이벤트 전체가 노이즈. START/END 이벤트만 남기고 나머지 제거.

---

## 5. RecipeStepScreen:176 — Step Navigation을 커스텀 훅으로

**Q**: "이렇게 메인 스크린에서 훅을 정의하지말고 커스텀 훅 만들기, webviewRef를 넘기면 되니까"

```tsx
const navigateStep = useCallback((i, sceneIdx) => { ... }, [...]);
const goToPrevStep = useCallback(() => { ... }, [...]);
const goToNextStep = useCallback(() => { ... }, [...]);
```

**판단: ✅ 좋은 지적.** navigateStep/goToPrev/goToNext + seekToScene + seekToSceneNumber를 `useStepNavigation` 훅으로 묶으면 메인 스크린에서 ~50줄 제거. webviewRef와 postToYouTube를 넘기면 됨.

항목 3번의 상태 분리와 합치면 하나의 `useStepNavigation(recipe, webviewRef)` 훅으로 통합 가능.

---

## 6. RecipeStepScreen:195 — handleManual은 JSX에서 인라인

**Q**: "이거는 그냥 jsx에서 선언하면 됨. 왜냐하면 공통 로직이 아니기 때문에"

```tsx
const handleManualPrev = useCallback(() => {
  trackCookingCommand('navigation', 'PREV', 'touch');
  goToPrevStep();
}, [...]);
const handleManualNext = useCallback(() => { ... }, [...]);
```

**판단: ⚠️ 반은 맞고 반은 아님.** 

맞는 부분: 이 핸들러는 한 곳에서만 쓰이니 분리할 이유 약함.

주의: 다만 `trackCookingCommand` + `goToPrevStep` 2줄이라 JSX 인라인 `onPress`에 넣으면 가독성이 약간 떨어짐. 길이가 1줄이면 인라인 OK, 2줄 이상이면 현재처럼 분리하는 것도 나쁘지 않음.

**추천**: 항목 5에서 `useStepNavigation` 훅으로 묶을 때, 훅 안에서 tracking 포함 버전으로 내보내면 깔끔.
```tsx
const { handleTouchPrev, handleTouchNext } = useStepNavigation(...);
```

---

## 7. RecipeStepScreen:206 — voice 전용 로직 훅 분리

**Q**: "voice전용 로직 훅 만들어서 하나의 응답으로"

```tsx
const voiceGoToNext = useCallback(() => { trackCookingCommand(..., 'voice'); goToNextStep(); }, [...]);
const voiceGoToPrev = useCallback(() => { trackCookingCommand(..., 'voice'); goToPrevStep(); }, [...]);
```

**판단: ✅ 맞음.** voice 전용 래퍼(voiceGoToNext, voiceGoToPrev, voiceGoToStep, voiceSeekToScene, voicePlay, voicePause 등)가 메인 스크린에 ~40줄 풀려있음. 이걸 `useVoiceCommand`에서 직접 tracking 포함해서 내보내면 메인 스크린은 훅 하나만 호출.

현재 `useVoiceCommand`는 이미 존재하지만, seek/play/pause를 props로 받고 있어서 래퍼가 바깥에 남아있는 것. 훅 내부에서 tracking까지 처리하면 정리됨.

---

## 8. RecipeStepScreen:411 — renderDescription 노말 전용, 인라인 가능

**Q**: "이건 노말에서만 사용, 재사용하지도 않는데, 이것도 normal screen만 적용"

```tsx
const renderDescription = (desc: any) => { ... };
```

**판단: ✅ 맞음.** 두 가지 문제:
1. `desc: any` — 타입 없음 (항목과 별도로 any 제거 대상)
2. normal 전용인데 shorts 화면에서도 함수가 존재 — 조건부 렌더링 안에서 인라인하거나, normal 전용 컴포넌트로 분리

**추천**: RecipeStepScreen이 너무 크니까(800줄+), shorts/normal을 별도 컴포넌트로 분리하는 게 근본 해결. `renderDescription`은 NormalStepView 안에서 로컬 함수로.

---

## 9. WebAudioPipeline — injectJavaScript → postMessage 통일

**파일**: `src/pages/native-step/hooks/useWebAudioPipeline.ts:417`

**현재**:
```tsx
// RN → 웹뷰: injectJavaScript (웹뷰 내부 함수 직접 호출)
webViewRef.current.injectJavaScript(`
  if (window.__startRecording) { window.__startRecording(); }
`);

// 웹뷰 → RN: postMessage (구조화된 메시지)
postMessage({ type: 'audio_stream_chunk', base64: ... })
```

**문제**: 양방향 통신 방식 불일치.
- RN→웹뷰: `injectJavaScript` — RN이 웹뷰 구현(`window.__startRecording`)을 알아야 함
- 웹뷰→RN: `postMessage` — 정상적 메시지 패턴

RN이 웹뷰 내부 함수명을 하드코딩하고 있어서, 웹뷰 쪽에서 함수명 바꾸면 RN도 수정해야 함. 관심사 분리 위반.

**개선**: RN→웹뷰도 postMessage로 통일. RN은 의도만 전달, 실제 함수 호출은 웹뷰 책임.
```tsx
// RN → 웹뷰
webViewRef.current.postMessage(JSON.stringify({ type: 'START_RECORDING' }));
webViewRef.current.postMessage(JSON.stringify({ type: 'STOP_RECORDING' }));

// 웹뷰 onMessage에서
window.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'START_RECORDING') startRecording();
  if (msg.type === 'STOP_RECORDING') stopRecording();
});
```

**원칙**: Separation of Concerns — RN은 "무엇을 할지" 지시, 웹뷰는 "어떻게 할지" 구현.

---

## 10. speechModule let 5개 → IIFE const 1개

**파일**: `src/pages/native-step/hooks/useWebAudioPipeline.ts:14~26`

**현재**: `let` 5개로 선언 후 try/catch에서 재할당
```tsx
let realtimeBufferTranscribe: any = () => {};
let speechModule: any = null;
try { speechModule = require('expo-speech-transcriber'); ... } catch {}
```

**개선**: IIFE로 `const` 1개에 응집
```tsx
const { speechModule, realtimeBufferTranscribe, ... } = (() => {
  try {
    const mod = require('expo-speech-transcriber');
    return { speechModule: mod, realtimeBufferTranscribe: mod.realtimeBufferTranscribe ?? (() => {}), ... };
  } catch {
    return { speechModule: null, realtimeBufferTranscribe: () => {}, ... };
  }
})();
```

**장점**: let 재할당 불가 → 안전, 초기화 로직 한 블록에 응집
**원칙**: Immutability — const 우선, let 최소화

---

## 11. useWebAudioPipeline — 디버그 전용 코드 제거

**파일**: `src/pages/native-step/hooks/useWebAudioPipeline.ts`

**현재**:
```tsx
// 1. start/end 로그만 찍고 아무것도 안 함
if (msg.type === 'audio_stream_start') {
  console.log('[WebAudioPipeline] Stream started from web');
  chunkLogCountRef.current = 0;
  return;
}
if (msg.type === 'audio_stream_end') {
  console.log('[WebAudioPipeline] Stream ended from web');
  return;
}

// 2. 처음 10개 청크만 로그 (release에서 의미 없음)
chunkLogCountRef.current++;
if (chunkLogCountRef.current <= 10) {
  console.log(`[WebAudioPipeline] Chunk #${chunkLogCountRef.current}, bytes: ${msg.bytes}, state: ${stateRef.current}`);
}
```

**문제**: 
- `audio_stream_start`/`end`는 로그만 찍고 로직 없음 — dead code
- `chunkLogCountRef`는 처음 10개 청크 로그용 — 디버깅 끝나면 불필요
- release 빌드에서 console.log가 성능에 미세한 영향

**개선**: 
- `audio_stream_start`/`end` 핸들러 제거 (또는 `__DEV__` 가드)
- `chunkLogCountRef` + 관련 로그 제거
- 필요 시 `__DEV__ && console.log(...)` 패턴으로 개발 전용 유지

**원칙**: Dead Code Elimination — 동작에 영향 없는 디버그 코드 정리

---

## 12. useWebAudioPipeline — injectStartRecordingRef 불필요

**파일**: `src/pages/native-step/hooks/useWebAudioPipeline.ts:166, 344, 429`

**현재**:
```tsx
const injectStartRecordingRef = useRef<() => void>(() => {});
// ...
injectStartRecordingRef.current = injectStartRecording; // 매번 동기화
// ...
injectStartRecordingRef.current(); // ref로 호출
```

**ref를 쓴 원래 이유**: `handleWebViewMessage` useCallback deps에 `injectStartRecording`을 넣으면 리렌더 발생 → ref로 우회.

**지금은 불필요**: item 9에서 `injectJavaScript` → `postMessage`로 변경됨. `postMessage`는 `webViewRef.current?.postMessage(...)` 한 줄이라 deps가 빈 배열 → 함수가 안 바뀜 → ref 우회 필요 없음.

**개선**:
```tsx
// ref 제거, 직접 호출
const injectStartRecording = useCallback(() => {
  webViewRef.current?.postMessage(JSON.stringify({ type: 'START_RECORDING' }));
}, []);

// 사용처에서 그냥:
injectStartRecording();  // ref.current() 대신
```

`injectStartRecordingRef` + `injectStartRecordingRef.current = ...` 동기화 코드 삭제.

**원칙**: 불필요한 간접화 제거 — ref 우회가 필요했던 원인이 사라졌으면 ref도 제거
