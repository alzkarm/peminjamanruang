@echo off
REM SIPERU YARSI - matikan backend + frontend
for /f "tokens=5" %%P in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
for /f "tokens=5" %%P in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
echo Web dimatikan.
