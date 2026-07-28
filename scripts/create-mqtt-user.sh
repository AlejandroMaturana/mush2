#!/usr/bin/env bash
# ── create-mqtt-user.sh ──────────────────────────────────────────
# Creates or updates MQTT users in Mosquitto password files.
#
# Usage:
#   ./scripts/create-mqtt-user.sh                          # interactive mode (dev)
#   ./scripts/create-mqtt-user.sh <user> <pass>            # direct mode (dev)
#   ./scripts/create-mqtt-user.sh <user> <pass> dev        # explicit environment
#   ./scripts/create-mqtt-user.sh <user> <pass> prod       # explicit environment
#
# Requirements: mosquitto_passwd (included with Mosquitto)
#
# Per ADR-029, each environment has its own isolated password_file:
#   - docker/mosquitto/dev/password_file
#   - docker/mosquitto/prod/password_file
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ── Determine environment ────────────────────────────────────────
ENV="${3:-dev}"
case "$ENV" in
  dev|development)
    ENV_DIR="dev"
    ;;
  prod|production)
    ENV_DIR="prod"
    ;;
  *)
    echo "[ERROR] Invalid environment: '$ENV'. Use 'dev' or 'prod'."
    exit 1
    ;;
esac

PASSWORD_DIR="$PROJECT_ROOT/docker/mosquitto/$ENV_DIR"
PASSWORD_FILE="$PASSWORD_DIR/password_file"

# Ensure password file directory exists
mkdir -p "$PASSWORD_DIR"

# Ensure password file exists
if [ ! -f "$PASSWORD_FILE" ]; then
  touch "$PASSWORD_FILE"
fi

add_user() {
  local user="$1"
  local pass="$2"

  if mosquitto_passwd -b "$PASSWORD_FILE" "$user" "$pass"; then
    echo "[OK] User '$user' added/updated in $ENV_DIR password_file"
  else
    echo "[ERROR] Failed to add user '$user'"
    echo "       Is mosquitto_passwd installed?"
    echo "       Install: sudo apt install mosquitto-clients"
    exit 1
  fi
}

# ── Main ─────────────────────────────────────────────────────────

if [ $# -ge 2 ]; then
  # Direct mode
  add_user "$1" "$2"
else
  # Interactive mode
  echo "=== Mush2 MQTT User Management ($ENV) ==="
  echo "Password file: $PASSWORD_FILE"
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
  echo "Restart Mosquitto to apply:"
  if [ "$ENV_DIR" = "dev" ]; then
    echo "  docker compose -f docker-compose.dev.yml restart dev-mosquitto"
  else
    echo "  docker compose restart mosquitto"
  fi
fi
