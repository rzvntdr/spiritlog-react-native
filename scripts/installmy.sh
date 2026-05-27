#!/usr/bin/env bash
#
# installmy — wireless-debug install helper.
#
# Usage:
#   installmy <oct3> <oct4> <port> [apk-path]
#
# Example:
#   installmy 50 60 33325                  # → adb connect 192.168.50.60:33325
#   installmy 50 60 33325 path/to/app.apk  # explicit APK
#
# Flow:
#   1) Try `adb connect 192.168.<oct3>.<oct4>:<port>`. If connected → install.
#   2) Otherwise prompt for the *pairing* port (a different one shown on the
#      phone's "Pair device with pairing code" screen), run `adb pair`,
#      disconnect, then re-connect using the original port, then install.
#
# Default APK: android/app/build/outputs/apk/release/app-release.apk
# (build with: ./android/gradlew -p android assembleRelease)
# For debug: android/app/build/outputs/apk/debug/app-debug.apk

set -uo pipefail

# ---------- args ----------

if [ $# -lt 3 ]; then
  echo "Usage: installmy <oct3> <oct4> <port> [apk-path]"
  echo "  → adb connect 192.168.<oct3>.<oct4>:<port>"
  exit 1
fi

OCT3="$1"
OCT4="$2"
PORT="$3"
APK_ARG="${4:-}"

IP="192.168.${OCT3}.${OCT4}"
TARGET="${IP}:${PORT}"

# Resolve project root (script lives in <root>/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEFAULT_APK="${PROJECT_ROOT}/android/app/build/outputs/apk/release/app-release.apk"
APK="${APK_ARG:-$DEFAULT_APK}"

# Resolve relative APK paths against project root
if [ ! -f "$APK" ] && [ -f "${PROJECT_ROOT}/${APK}" ]; then
  APK="${PROJECT_ROOT}/${APK}"
fi

# ---------- pre-flight ----------

if ! command -v adb >/dev/null 2>&1; then
  echo "ERROR: adb not found in PATH."
  echo "Add Android SDK platform-tools to PATH, e.g.:"
  echo "  export PATH=\"\$PATH:\$HOME/AppData/Local/Android/Sdk/platform-tools\""
  exit 1
fi

if [ ! -f "$APK" ]; then
  echo "ERROR: APK not found at: $APK"
  echo
  echo "Build first:"
  echo "  cd \"${PROJECT_ROOT}\""
  echo "  ./android/gradlew -p android assembleRelease    # for release APK"
  echo "  # or: npx expo run:android                      # debug build + install"
  exit 1
fi

echo "Target : $TARGET"
echo "APK    : $APK"
echo

# ---------- helpers ----------

verify_connected() {
  # adb devices lists "<ip>:<port>\tdevice" when fully connected.
  adb devices | awk -v t="$TARGET" '$1 == t && $2 == "device" { found=1 } END { exit !found }'
}

try_connect() {
  echo "→ adb connect $TARGET"
  local out
  out=$(adb connect "$TARGET" 2>&1) || true
  echo "  $out"
  sleep 1
  verify_connected
}

# ---------- step 1: direct connect ----------

if try_connect; then
  echo "✓ Connected directly."
else
  echo
  echo "Direct connect failed — pairing required."
  echo "On the phone: Developer options → Wireless debugging → Pair device with pairing code"
  echo "It shows a 6-digit code AND a DIFFERENT port (pairing port)."
  echo
  read -rp "Enter PAIRING port: " PAIR_PORT
  PAIR_TARGET="${IP}:${PAIR_PORT}"

  echo "→ adb pair $PAIR_TARGET  (you'll be prompted for the 6-digit code)"
  if ! adb pair "$PAIR_TARGET"; then
    echo "ERROR: pairing failed."
    exit 1
  fi

  echo "→ adb disconnect"
  adb disconnect >/dev/null 2>&1 || true

  echo
  if try_connect; then
    echo "✓ Connected after pairing."
  else
    echo "ERROR: still cannot connect after pairing."
    echo "Run 'adb devices' to inspect, then retry."
    exit 1
  fi
fi

# ---------- step 2: install ----------

echo
echo "→ adb -s $TARGET install -r \"$APK\""
adb -s "$TARGET" install -r "$APK"
echo "✓ Installed."
