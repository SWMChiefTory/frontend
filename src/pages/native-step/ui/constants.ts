export const YOUTUBE_URL = process.env.EXPO_PUBLIC_YOUTUBE_URL ?? 'http://localhost:3000';

export const INJECTED_JS_BRIDGE = `
  (function() {
    if (!window.webkit) window.webkit = {};
    if (!window.webkit.messageHandlers) window.webkit.messageHandlers = {};
    window.webkit.messageHandlers.bridge = {
      postMessage: function(msg) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }
    };
    true;
  })();
`;
