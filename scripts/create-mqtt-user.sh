#!/usr/bin/env bash
# ── create-mqtt-user.sh ──────────────────────────────────────────
# Creates or updates MQTT users in Mosquitto password file.
#
# Usage:
#   ./scripts/create-mqtt-user.sh              # interactive mode
#   ./scripts/create-mqtt-user.sh <user> <pass> # direct mode
#
# Requirements: mosquitto_passwd (included with Mosquitto)
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PASSWORD_FILE="$PROJECT_ROOT/docker/mosquitto/config/password_file"
PASSWORD_FILE_EXAMPLE="$PROJECT_ROOT/docker/mosquitto/config/password_file.example"

# Ensure password file exists
if [ ! -f "$PASSWORD_FILE" ]; then
  if [ -f "$PASSWORD_FILE_EXAMPLE" ]; then
    cp "$PASSWORD_FILE_EXAMPLE" "$PASSWORD_FILE"
    echo "[INFO] Created password_file from example"
  else
    touch "$PASSWORD_FILE"
  fi
fi

add_user() {
  local user="$1"
  local pass="$2"

  if mosquitto_passwd -b "$PASSWORD_FILE" "$user" "$pass"; then
    echo "[OK] User '$user' added/updated"
  else
    echo "[ERROR] Failed to add user '$user'"
    echo "       Is mosquitto_passwd installed?"
    echo "       Install: sudo apt install mosquitto-clients"
    exit 1
  fi
}

# ── Main ─────────────────────────────────────────────────────────

if [ $# -eq 2 ]; then
  # Direct mode
  add_user "$1" "$2"
else
  # Interactive mode
  echo "=== Mush2 MQTT User Management ==="
  echo ""

  # Backend bridge user
  echo "1) Create backend bridge user"
  read -rp "   Username [backend_bridge]: " backend_user
  backend_user="${backend_user:-backend_bridge}"
  read -sr -p "   Password: " backend_pass
  echo ""
  if [ -n "$backend_pass" ]; then
    add_user "$backend_user" "$backend_pass"
  else
    echo "[SKIP] Empty password"
  fi

  echo ""

  # Device user
  echo "2) Create device user"
  read -rp "   Username (e.g., device_001): " device_user
  if [ -n "$device_user" ]; then
    read -sr -p "   Password: " device_pass
    echo ""
    if [ -n "$device_pass" ]; then
      add_user "$device_user" "$device_pass"
    else
      echo "[SKIP] Empty password"
    fi
  else
    echo "[SKIP] Empty username"
  fi

  echo ""
  echo "=== Done ==="
  echo "Password file: $PASSWORD_FILE"
  echo "Restart Mosquitto to apply: docker compose restart mosquitto"
fi
