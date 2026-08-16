#!/bin/bash
# Start the Telegram admin bot with live hot-reload (bun --hot watches source
# files and restarts automatically on changes — no manual restart needed).
cd /home/z/my-project/mini-services/telegram-bot
exec bun --hot index.ts
