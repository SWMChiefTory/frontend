# 리팩토링: 임베딩 모델 제거 + action 워크플로우 재설계

## 라벨
`native-step` `onnx` `embedding` `architecture` `HIGH`

## 현상
- `embedding/model_quantized.onnx` (113MB) — 앱 크기의 46%
- scene tag 매칭이 없어서 임베딩 기반 장면 매칭(`useSceneMatcher`)이 불필요
- 장면 1/2 단계 매칭은 이미 동작 중

## 제거 대상
1. `assets/models/embedding/model_quantized.onnx` (113MB)
2. `assets/models/embedding/tokenizer.json`
3. `assets/models/embedding/config.json`
4. `src/pages/native-step/hooks/onnxEmbedding.ts` — 전체 파일
5. `src/pages/native-step/hooks/useSceneMatcher.ts` — 전체 파일
6. `src/pages/native-step/hooks/useVoiceCommand.ts` — `useSceneMatcher` import/사용 제거

## action 워크플로우 재설계 필요
- `useVoiceCommand`에서 `findBestScene` 제거 후 대체 로직 필요
- scene tag 기반이 아닌 step index 기반 매칭으로 전환?
- 또는 단순 키워드 매칭으로 대체?
→ 사용자와 논의 필요

## 효과
- 앱 크기: 242MB → ~129MB (53% 감소)
- ONNX 런타임 메모리 사용량 감소
- Release 빌드 ONNX 로딩 이슈 1개 해소

## 발견 경위
사용자 직접 지적 — "임베딩이 필요 없어, action 워크플로우 다시 짜야 할듯"
