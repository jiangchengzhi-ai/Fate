@echo off
chcp 65001 >nul
cd /d "%~dp0.."

if exist ".env.cmd" call ".env.cmd"

:loop
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if errorlevel 1 (
  node server\server.mjs --port 5173 --host 0.0.0.0 >> server\server.log 2>&1
  echo [%date% %time%] server exited, restart in 3s >> server\server.log
)
timeout /t 3 /nobreak >nul
goto loop
