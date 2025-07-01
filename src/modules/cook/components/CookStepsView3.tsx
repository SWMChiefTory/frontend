import React, { useRef, useCallback, useEffect } from "react";
import { View, StyleSheet, Platform, PermissionsAndroid } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { RecipeFlow } from "@/src/modules/recipeFlow/types/RecipeFlow";
import * as FileSystem from "expo-file-system";
import Uuid from "expo-modules-core/src/uuid";
import { Audio } from "expo-av"; // iOS에서 오디오 권한 요청을 위해 사용

interface Props {
  recipe: RecipeFlow;
  onExit: () => void;
}

async function handleReceivedAudio(base64: string) {
  try {
    // 확장자 변경: iOS는 .webm 미지원 → .m4a 권장
    console.log(FileSystem.documentDirectory);
    const fileUri = FileSystem.documentDirectory + Uuid.v4() + ".m4a"; // ✅ 확장자 일치

    // base64 prefix 제거
    const base64WithoutPrefix = base64.replace(
      /^data:audio\/[a-zA-Z0-9-+]+;base64,/,
      "",
    );
    // 파일로 저장
    await FileSystem.writeAsStringAsync(fileUri, base64WithoutPrefix, {
      encoding: FileSystem.EncodingType.Base64,
    })
      .then(() => {
        console.log("✅ 파일 저장 완료됨");
      })
      .catch((err) => {
        console.error("❌ 파일 저장 실패:", err);
      });

    // 저장 확인
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      console.log("✅ 오디오 저장 완료:", fileUri);
    } else {
      console.warn("⚠️ 저장된 파일이 존재하지 않음:", fileUri);
    }
  } catch (e) {
    console.error("❌ 오디오 처리 실패:", e);
  }
}

export function CookStepsView3({ recipe, onExit }: Props) {
  const webViewRef = useRef<WebView>(null);

  const clearCache = () => {
    const jsCode = `
   window.location.reload(true); // Force reload without cache
   localStorage.clear(); // Clear localStorage
   sessionStorage.clear(); // Clear sessionStorage
 `;
    webViewRef?.current?.injectJavaScript(jsCode);
  };

  useEffect(() => {
    clearCache();
  }, []);

  useEffect(() => {
    async function requestMicrophonePermission() {
      if (Platform.OS === "android") {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: "마이크 접근 권한 요청",
              message: "레시피 녹음을 위해 마이크 접근 권한이 필요합니다.",
              buttonNeutral: "나중에",
              buttonNegative: "거부",
              buttonPositive: "허용",
            },
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("✅ 마이크 권한 허용됨");
          } else {
            console.warn("❌ 마이크 권한 거부됨");
          }
        } catch (err) {
          console.error("❌ 권한 요청 중 오류:", err);
        }
      } else if (Platform.OS === "ios") {
        const { status } = await Audio.requestPermissionsAsync();
        if (status === "granted") {
          console.log("✅ 마이크 권한 허용됨 (iOS)");
        } else {
          console.warn("❌ 마이크 권한 거부됨 (iOS)");
        }
      }
    }

    requestMicrophonePermission();
  }, []);

  const url =
    Platform.OS === "ios"
      ? "https://3b9c-14-33-6-132.ngrok-free.app/cook"
      : "https://3b9c-14-33-6-132.ngrok-free.app/cook";

  // 💡 WebView에서 메시지를 받았을 때 처리
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { type, value } = data;
      if (type === "ready") {
        webViewRef.current?.postMessage(JSON.stringify({ type: "unmute" }));
        webViewRef.current?.postMessage(JSON.stringify({ type: "play" }));
      } else if (type === "audio") {
        // base64 → 재생 or 서버 전송 등 처리
        handleReceivedAudio(value);
      }
    } catch (e) {
      console.warn("❌ 메시지 처리 실패:", e);
    }
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowFileAccess={true}
        scalesPageToFit={true}
        onNavigationStateChange={() => {}}
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        allowsInlineMediaPlayback={true}
        onMessage={onMessage} // ✅ 이벤트 핸들러 연결
        allowsFullscreenVideo={false}
        webviewDebuggingEnabled={true}
        sharedCookiesEnabled={true}
        useWebView2={true}
        onError={(e) => {
          console.error("❌ WebView error:", e.nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
