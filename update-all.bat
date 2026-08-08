@echo off
REM update-all.bat — 1 click update tong the (Windows VPS)
REM Dung: chuot phai -> Run as administrator
REM ponytail: native git + npm, khong them pm2, khong them tool moi.

setlocal enabledelayedexpansion

echo.
echo ================= SDU Update All =================
echo.

REM 1. Tim thu muc project (co .git)
set "ROOT=%~dp0"
if not exist "%ROOT%.git" (
  if exist "%ROOT%backend-nest\package.json" set "ROOT=%ROOT%"
  if not exist "%ROOT%backend-nest\package.json" (
    echo [LOI] Khong tim thay .git hay backend-nest o %ROOT%
    echo Hay copy file nay vao thu muc SDU-Admin-Website (ngang hang backend-nest)
    pause
    exit /b 1
  )
)
pushd "%ROOT%"
echo [1/6] Project: %CD%

REM 2. Git pull
echo [2/6] git pull...
git pull --ff-only
if errorlevel 1 (
  echo [LOI] git pull fail — kiem tra git remote va mang
  pause
  exit /b 1
)

REM 3. Backend: install + prisma + build
echo [3/6] Backend install + prisma...
REM Kill backend truoc de giai phong file Prisma DLL (EPERM fix)
echo Giai phong file Prisma DLL...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000" 2^>nul') do taskkill /PID %%a /F >nul 2>&1
schtasks /End /TN "SDU-Backend" >nul 2>&1
timeout /t 2 /nobreak >nul
REM Xoa lock cu neu con, ngu C:\Users\Administrator
if exist "%CD%\backend-nest\node_modules\.prisma" rmdir /s /q "%CD%\backend-nest\node_modules\.prisma" >nul 2>&1
pushd backend-nest
call npm install --prefer-offline
if errorlevel 1 goto :fail
call npx prisma generate
if errorlevel 1 goto :fail
call npx prisma migrate deploy
if errorlevel 1 (
  echo [WARN] prisma migrate deploy fail — co the DB chua chay (XAMPP MySQL)
  echo        Mo XAMPP - Start MySQL roi chay lai file nay.
)
call npm run build
if errorlevel 1 goto :fail
popd

REM 4. Frontend: install + build (Vercel build local khong can, nhung build de check loi)
echo [4/6] Frontend check...
pushd frontend
call npm install --prefer-offline
if errorlevel 1 goto :fail
call npm run build
if errorlevel 1 (
  echo [WARN] frontend build fail — van tiep tuc, BE van chay duoc
)
popd

REM 5. Firewall + restart backend (Task Scheduler native, khong can pm2)
echo [5/6] Mo firewall + restart backend...
netsh advfirewall firewall add rule name="SDU Backend 4000" dir=in action=allow protocol=TCP localport=4000 >nul 2>&1

REM Kill cu tren 4000 - ponytail: dung findstr rieng, tranh dau () trong for lam loi batch
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000"') do (
  echo Kill PID %%a...
  taskkill /PID %%a /F >nul 2>&1
)

REM Cap nhat Scheduled Task SDU-Backend neu co, khong thi tao
schtasks /Query /TN "SDU-Backend" >nul 2>&1
if errorlevel 1 (
  echo Tao Scheduled Task SDU-Backend...
  schtasks /Create /TN "SDU-Backend" /TR "node \"%CD%\backend-nest\dist\src\main.js\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F >nul 2>&1
) else (
  echo Cap nhat Task SDU-Backend...
  schtasks /Change /TN "SDU-Backend" /TR "node \"%CD%\backend-nest\dist\src\main.js\"" >nul 2>&1
)
schtasks /Run /TN "SDU-Backend" >nul 2>&1
if errorlevel 1 (
  echo [WARN] Khong chay duoc Task (can Run as administrator). Chay tam:
  start "" /B node backend-nest\dist\src\main.js
)

REM 6. Kiem tra
echo [6/6] Kiem tra...
timeout /t 4 /nobreak >nul
netstat -ano | findstr ":4000"
if errorlevel 1 (
  echo [LOI] Chua thay :4000 — xem Task Scheduler hoac cua so node
) else (
  echo [OK] Backend dang nghe :4000
  curl -s http://localhost:4000/api/health 2>nul | more
)

echo.
echo ================= XONG =================
echo Vercel frontend se tu deploy khi push main.
echo Neu BE o may khac, copy code len may do va chay lai file nay.
pause
exit /b 0

:fail
echo [LOI] Lenhs vua roi fail — dung lai de ban xem loi
popd
pause
exit /b 1
