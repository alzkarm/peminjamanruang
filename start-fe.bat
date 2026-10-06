@echo off
REM SIPERU YARSI - nyalakan frontend production (port 3000)
cd /d "E:\PLT\peminjaman-ruang"
for /f "tokens=5" %%P in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
ping 127.0.0.1 -n 3 >nul
start "SIPERU-Frontend" /B node node_modules\next\dist\bin\next start -p 3000 > frontend.log 2>&1
ping 127.0.0.1 -n 12 >nul
netstat -aon | findstr :3000 | findstr LISTENING >nul && (echo [OK] Frontend jalan di http://localhost:3000) || (echo [X] GAGAL - cek frontend.log & type frontend.log)
