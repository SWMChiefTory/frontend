## 변경 사항

- 

## 영향 범위

- [ ] JS/asset 변경만 (OTA 가능)
- [ ] 네이티브 변경 (새 빌드 필요 + version bump)
- [ ] 의존성 추가/변경
- [ ] schema/DB 변경

## 수동 테스트

해당하는 항목 체크. 전체 체크리스트: [docs/manual-test.md](../docs/manual-test.md)

### P0 — 핵심 흐름
- [ ] 인증 (로그인 / 로그아웃)
- [ ] 레시피 생성 → 생성중 표시 → 성공/실패 표시
- [ ] 베리 차감 / 충전 후 캐시 갱신
- [ ] 레시피 상세 / 음성 모드

### 영향받는 페이지
- [ ] 

## 빌드/배포 메모

- [ ] tsc 통과 (`npx tsc --noEmit`)
- [ ] 패치 살아있음 (의존성 변경 시: `npm run postinstall` 후 확인)
- [ ] (네이티브 변경 시) `app.config.js` `version` 올림
