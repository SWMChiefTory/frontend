const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// ONNX 모델 파일을 asset으로 번들링
config.resolver.assetExts = [...(config.resolver.assetExts || []), "onnx"];

module.exports = config;
