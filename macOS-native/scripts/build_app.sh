#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
NATIVE_DIR="${ROOT_DIR}/macOS-native"
DIST_DIR="${ROOT_DIR}/release-native"

echo "=============================================="
echo "🚀 正在編譯 ITGeek SSH Terminal (macOS 原生版)..."
echo "=============================================="

cd "${NATIVE_DIR}"
swift build -c release

APP_NAME="ITGeek Terminal"
APP_BUNDLE="${DIST_DIR}/${APP_NAME}.app"
CONTENTS_DIR="${APP_BUNDLE}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"

mkdir -p "${MACOS_DIR}"
mkdir -p "${RESOURCES_DIR}"

echo "📦 正在生成 macOS .app Bundle: ${APP_BUNDLE}..."

cp ".build/release/ITGeekTerminal" "${MACOS_DIR}/${APP_NAME}"
chmod +x "${MACOS_DIR}/${APP_NAME}"

# Write Info.plist
cat <<EOF > "${CONTENTS_DIR}/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>zh-Hant</string>
    <key>CFBundleExecutable</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.itgeek.ssh.terminal</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0.0</string>
    <key>CFBundleVersion</key>
    <string>2.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2026 ITGeek. All rights reserved.</string>
</dict>
</plist>
EOF

echo "💿 正在生成原生 macOS DMG 安裝鏡像..."
DMG_PATH="${DIST_DIR}/ITGeek-Terminal-macOS-Native-arm64.dmg"
rm -f "${DMG_PATH}"

hdiutil create -volname "${APP_NAME}" -srcfolder "${APP_BUNDLE}" -ov -format UDZO "${DMG_PATH}"

echo "=============================================="
echo "✅ macOS 純原生應用編譯完成！"
echo "📍 .app 目錄: ${APP_BUNDLE}"
echo "📍 .dmg 安裝包: ${DMG_PATH}"
echo "=============================================="
