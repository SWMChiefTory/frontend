# Cheftory Frontend

React Native + Expo 기반 모바일 앱

## 개발 환경 실행

```bash
npm install
npm start
```

## 빌드

### Android (로컬 빌드)

```bash
npm run build:android
```

`app.config.js`에서 버전 정보를 읽어 자동으로 파일명을 생성합니다.

- 출력 경로: `builds/cheftory-v{version}-{날짜}-vc{versionCode}.aab`
- 예시: `builds/cheftory-v1.0.13-20260302-vc45.aab`

빌드 완료 후 `.aab` 파일을 Google Play Console에 업로드합니다.

#### 버전 업데이트 시

`app.config.js`에서 아래 두 값을 수정합니다.

```javascript
version: "1.0.14",           // 사용자에게 보이는 버전
android: {
  versionCode: 46,           // Play Store 내부 빌드 번호 (매 빌드마다 +1)
}
```

### iOS

```bash
eas build --platform ios --profile production
```

## 키스토어 관리

- Android 서명용 키스토어: `@cheftory__cheftory.jks`
- EAS credentials에 등록되어 있으며, 로컬 빌드 시 자동으로 사용됨
- 키스토어 분실 시 Play Store에 앱 업데이트가 불가능하므로 안전하게 보관 필요
