@echo off
title Web Server 5500
echo Cleaning old processes...
taskkill /F /IM node.exe /T >nul 2>&1
echo Starting Server on Port 5500...
npx serve . -p 5500
pause