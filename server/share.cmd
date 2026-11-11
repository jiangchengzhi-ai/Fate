@echo off
chcp 65001 >nul
cd /d "%~dp0.."

:loop
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=4 -o TCPKeepAlive=yes -o ExitOnForwardFailure=yes -R 80:127.0.0.1:5173 nokey@localhost.run >> server\share.log 2>&1
echo [%date% %time%] tunnel closed, retry in 5s >> server\share.log
timeout /t 5 /nobreak >nul
goto loop
