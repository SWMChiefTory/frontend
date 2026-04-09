#!/bin/bash

VERSION=$(node -e "const c=require('./app.config.js');console.log(c.default.expo.version)")
VERSION_CODE=$(node -e "const c=require('./app.config.js');console.log(c.default.expo.android.versionCode)")
DATE=$(date +%Y%m%d)
OUTPUT="./builds/cheftory-v${VERSION}-${DATE}-vc${VERSION_CODE}.aab"

mkdir -p ./builds
echo "==================================="
echo "  Android Production Build"
echo "  Version: v${VERSION}"
echo "  VersionCode: ${VERSION_CODE}"
echo "  Date: ${DATE}"
echo "  Output: ${OUTPUT}"
echo "==================================="

eas build --platform android --local --profile production --output "$OUTPUT"
