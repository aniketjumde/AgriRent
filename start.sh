#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

load_env_file() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue

    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key//[$'\t\r\n ']/}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    value="${value#\"}"
    value="${value%\"}"
    value="${value#\'}"
    value="${value%\'}"

    export "$key=$value"
  done < "$env_file"
}

for env_file in "$ROOT_DIR/.env" "$ROOT_DIR/backend/.env"; do
  load_env_file "$env_file"
done

PROJECT_BACKEND_URL="${PROJECT_BACKEND_URL:-http://localhost:8000}"
PROJECT_FRONTEND_URL="${PROJECT_FRONTEND_URL:-http://localhost:5173}"
ZROK_ENABLED="${ZROK_ENABLED:-true}"
ZROK_TARGET_URL="${ZROK_TARGET_URL:-$PROJECT_FRONTEND_URL}"
ZROK_AUTH_TOKEN="${ZROK_AUTH_TOKEN:-${ZROK_AUTHTOKEN:-${ZROK_TOKEN:-K18amhQFHNMh}}}"
ZROK_BIN="${ZROK_BIN:-$(command -v zrok 2>/dev/null || command -v zrok2 2>/dev/null || true)}"

has_port() {
  lsof -ti tcp:"$1" >/dev/null 2>&1 || ss -ltn "sport = :$1" 2>/dev/null | grep -q ":$1"
}

start_backend() {
  if has_port 8000; then
    echo "Django backend is already running on port 8000."
    return
  fi

  (
    cd "$ROOT_DIR"
    . .venv/bin/activate
    nohup python backend/manage.py runserver 0.0.0.0:8000 > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"
  )

  echo "Started Django backend (PID $(cat "$PID_DIR/backend.pid"))"
}

start_frontend() {
  if has_port 5173; then
    echo "Vite frontend is already running on port 5173."
    return
  fi

  (
    cd "$ROOT_DIR/frontend"
    nohup npm run dev -- --host 0.0.0.0 > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"
  )

  echo "Started Vite frontend (PID $(cat "$PID_DIR/frontend.pid"))"
}

start_zrok() {
  if [[ "${ZROK_ENABLED,,}" != "true" && "${ZROK_ENABLED,,}" != "1" ]]; then
    echo "Zrok sharing is disabled. Set ZROK_ENABLED=true to enable it."
    return
  fi

  if [[ -z "$ZROK_BIN" ]]; then
    echo "zrok is not installed or not on PATH. Skipping zrok share."
    return
  fi

  if [[ -z "$ZROK_AUTH_TOKEN" ]]; then
    echo "Zrok is enabled, but no token was provided. Set ZROK_AUTH_TOKEN in your environment."
    return
  fi

  if [[ -f "$PID_DIR/zrok.pid" ]] && kill -0 "$(cat "$PID_DIR/zrok.pid")" 2>/dev/null; then
    echo "Zrok tunnel is already running."
    return
  fi

  export ZROK_AUTHTOKEN="$ZROK_AUTH_TOKEN"
  "$ZROK_BIN" enable "$ZROK_AUTH_TOKEN" >/dev/null 2>&1 || true
  nohup "$ZROK_BIN" share public "$ZROK_TARGET_URL" > "$LOG_DIR/zrok.log" 2>&1 &
  echo $! > "$PID_DIR/zrok.pid"

  echo "Started zrok tunnel for $ZROK_TARGET_URL (PID $(cat "$PID_DIR/zrok.pid"))"
}

start_backend
start_frontend
start_zrok

echo ""
echo "Project URLs:"
echo "  Backend: $PROJECT_BACKEND_URL"
echo "  Frontend: $PROJECT_FRONTEND_URL"
