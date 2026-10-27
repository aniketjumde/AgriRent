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
    . "$ROOT_DIR/.venv/bin/activate"
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

start_backend
start_frontend

echo ""
echo "Project URLs:"
echo "  Backend: $PROJECT_BACKEND_URL"
echo "  Frontend: $PROJECT_FRONTEND_URL"
