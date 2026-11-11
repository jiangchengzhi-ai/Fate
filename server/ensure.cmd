@echo off
rem ensure server and tunnel are running (scheduled task, every 2 min)
cd /d "%~dp0.."

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if errorlevel 1 start "" /min cmd /c "%~dp0run.cmd"

tasklist /fi "imagename eq ssh.exe" 2>nul | find /i "ssh.exe" >nul
if errorlevel 1 start "" /min cmd /c "%~dp0share.cmd"
