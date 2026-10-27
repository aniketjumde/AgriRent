#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
mkdir -p "$PID_DIR"

stop_pid_file() {
  local name="$1"
  local pidfile="$PID_DIR/${name}.pid"

  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile" 2>/dev/null || true)"

    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "Stopped ${name} (PID $pid)"
    else
      echo "${name} was not running."
    fi

    rm -f "$pidfile"
  else
    echo "No PID file for ${name}."
  fi
}

for service in backend frontend; do
  stop_pid_file "$service"
done

for port in 8000 5173; do
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    for pid in $pids; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        echo "Stopped process on port $port (PID $pid)"
      fi
    done
  fi
done

echo "Project stopped."
