@echo off
REM SIPERU YARSI - nyalakan backend + frontend (double-click aja)
cd /d "E:\PLT\peminjaman-ruang"

echo [1/4] Matikan proses lama di port 3000/4000...
for /f "tokens=5" %%P in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
for /f "tokens=5" %%P in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/4] Nyalakan backend (port 4000)...
cd backend
start "SIPERU-Backend" /MIN cmd /c "node dist\src\main.js > ..\backend.log 2>&1"
cd ..
timeout /t 12 /nobreak >nul

echo [3/4] Nyalakan frontend (port 3000)...
start "SIPERU-Frontend" /MIN cmd /c "node node_modules\next\dist\bin\next start -p 3000 > frontend.log 2>&1"
timeout /t 12 /nobreak >nul

echo [4/4] Cek status...
netstat -aon | findstr :4000 | findstr LISTENING >nul && (echo [OK] Backend jalan :4000) || (echo [X] Backend GAGAL - cek backend.log)
netstat -aon | findstr :3000 | findstr LISTENING >nul && (echo [OK] Frontend jalan :3000) || (echo [X] Frontend GAGAL - cek frontend.log)
echo.
echo Buka: http://localhost:3000
pause
