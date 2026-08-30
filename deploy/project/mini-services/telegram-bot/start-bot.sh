#!/bin/bash
# Start the Telegram admin bot with live hot-reload (bun --hot watches source
# files and restarts automatically on changes — no manual restart needed).
#
# IMPORTANT: Only ONE bot instance can poll Telegram at a time. If two run
# simultaneously, Telegram returns 409 Conflict. This script kills any
# existing bot process before starting a fresh one.

cd /home/z/my-project/mini-services/telegram-bot

# Kill any existing bot process (but not this script itself)
pkill -f "bun --hot index.ts" 2>/dev/null || true
pkill -f "bun index.ts" 2>/dev/null || true
sleep 1

# Wait for port 3003 to be free
for i in 1 2 3 4 5; do
  if ! ss -tlnp 2>/dev/null | grep -q ":3003 "; then
    break
  fi
  echo "⏳ Waiting for port 3003 to be free..."
  sleep 1
done

exec bun --hot index.ts
