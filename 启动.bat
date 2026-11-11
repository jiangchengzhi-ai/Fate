@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   fatetell 正在启动...
echo   关闭这个窗口，服务就会停止。
echo.
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5173'"
call server\start-supervisor.cmd
