# 리팩토링: 앱 버전 단일 소스 관리

## 라벨
`ios` `build` `version` `infoplist`

## 현상
오늘 배포 시 `project.pbxproj`의 `MARKETING_VERSION`을 1.1.0으로 바꿨는데, `Info.plist`의 `CFBundleShortVersionString`이 1.0.13으로 하드코딩 되어 있어서 Archive가 계속 1.0.13으로 빌드됨. 2곳에서 버전을 관리하는 구조.

## 개선 방향
`Info.plist`에서 하드코딩 값을 변수 참조로 변경:

```xml
<!-- Before -->
<key>CFBundleShortVersionString</key>
<string>1.1.0</string>

<!-- After -->
<key>CFBundleShortVersionString</key>
<string>$(MARKETING_VERSION)</string>
```

이러면 `project.pbxproj`의 `MARKETING_VERSION` 한 곳만 바꾸면 됨.
`CFBundleVersion` (빌드번호)도 마찬가지로 `$(CURRENT_PROJECT_VERSION)` 참조로 변경 가능.

## 영향 범위
- `ios/app/Info.plist`

## 발견 경위
v1.1.0 배포 과정에서 "왜 자꾸 1.0.13으로 빌드되지?" 실제 겪은 이슈
