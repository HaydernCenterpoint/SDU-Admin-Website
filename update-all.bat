@echo off
REM ===================================================================
REM  SDU-Admin-Website - Cai dat / Cap nhat toan bo tren VPS Windows
REM  File: update-all.bat (1-click)
REM
REM  Cach chay:
REM    - Lan dau / may moi: copy ca thu muc SDU-Admin-Website len VPS
REM      (C:\Users\Administrator\SDU-Admin-Website), mo CMD Run as
REM      administrator, chay:  update-all.bat   (CMD)  hoac
REM      .\update-all.bat  (PowerShell)
REM    - Cap nhat sau: chi can chay lai file nay (tu dong git pull)
REM
REM  Lam gi:
REM    [1/6] Xac dinh thu muc project
REM    [2/6] git pull --ff-only (stash local neu conflict)
REM    [3/6] Kiem tra Node, tao .env, kill :4000, xoa .prisma, npm i,
REM          prisma generate/migrate deploy, build, seed
REM    [4/6] Frontend install + build
REM    [5/6] Mo firewall 4000 + tao/cap nhat Task Scheduler SDU-Backend
REM    [6/6] Kiem tra port 4000 + /api/health
REM
REM  Yeu cau: Node >=18, MySQL dang chay (XAMPP), Git da cai
REM  Ponytail: native Windows only (schtasks/netsh/netstat), no pm2.
REM ===================================================================

echo.
echo ================= SDU Update All =================
echo.

REM 1. Tim thu muc project (co .git)
set "ROOT=%~dp0"
if not exist "%ROOT%.git" (
  if not exist "%ROOT%backend-nest\package.json" (
    echo [LOI] Khong tim thay .git hay backend-nest o %ROOT%
    echo       Hay copy file nay vao thu muc goc SDU-Admin-Website
    pause
    exit /b 1
  )
)
pushd "%ROOT%"
echo [1/6] Project: %CD%

REM 2. Git pull (tu dong stash neu conflict local)
echo [2/6] git pull...
git diff --quiet
if not errorlevel 1 (
  git pull --ff-only
) else (
  echo [INFO] Co thay doi local - stash tam roi pull...
  git stash push -m "auto-stash update-all" --keep-index
  git pull --ff-only
  if errorlevel 1 (
    echo [LOI] git pull fail - kiem tra git remote / network
    echo       Khoi phuc: git stash pop
    pause
    exit /b 1
  )
  echo [INFO] Da stash local, giu lai o stash list
)
if errorlevel 1 (
  echo [LOI] git pull fail - kiem tra git remote / network
  pause
  exit /b 1
)

REM 3. Backend
echo [3/6] Backend install + prisma + build...

REM 3a. Node version
node -v >nul 2>&1
if errorlevel 1 (
  echo [LOI] Chua cai Node.js. Cai LTS tu https://nodejs.org roi chay lai.
  pause
  exit /b 1
)
for /f "tokens=1 delims=v." %%v in ('node -v') do set NODE_MAJOR=%%v
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 18 (
  echo [WARN] Node %NODE_MAJOR% qua cu, yeu cau >=18 - khuyen nghi 20 LTS
)

REM 3b. .env
if not exist "backend-nest\.env" (
  echo [INFO] Tao backend-nest\.env tu .env.example
  copy /Y "backend-nest\.env.example" "backend-nest\.env" >nul
  echo [WARN] Da tao .env mac dinh - sua DATABASE_URL / JWT_SECRET neu can
)

REM 3c. Kill backend cu + giai phong Prisma DLL (.prisma lock)
echo Giai phong file Prisma DLL (EPERM fix)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000" ^| findstr "LISTENING"') do (
  if not "%%a"=="0" taskkill /PID %%a /F 1>nul 2>&1
)
schtasks /End /TN SDU-Backend 1>nul 2>&1
timeout /t 2 /nobreak 1>nul 2>&1
if exist "%CD%\backend-nest\node_modules\.prisma" rmdir /s /q "%CD%\backend-nest\node_modules\.prisma" 1>nul 2>&1
if exist "%CD%\backend-nest\node_modules\.prisma" rd /s /q "%CD%\backend-nest\node_modules\.prisma" 1>nul 2>&1

pushd backend-nest
call npm install --prefer-offline
if errorlevel 1 goto :fail
call npx prisma generate
if errorlevel 1 goto :fail
call npx prisma migrate deploy
if errorlevel 1 (
  echo [WARN] prisma migrate deploy fail - co the MySQL chua chay [XAMPP]
  echo        Mo XAMPP - Start MySQL roi chay lai file nay.
)
call npm run build
if errorlevel 1 goto :fail
call npx prisma db seed 1>nul 2>&1
if not errorlevel 1 echo [OK] Seed done (admin@saodo.edu.vn / admin123)
popd

REM 4. Frontend
echo [4/6] Frontend install + build...
pushd frontend
call npm install --prefer-offline
if errorlevel 1 goto :fail
call npm run build
if errorlevel 1 (
  echo [WARN] frontend build fail - van tiep tuc, backend van chay duoc
)
popd

REM 5. Firewall + restart backend
echo [5/6] Mo firewall + restart backend...
netsh advfirewall firewall add rule name="SDU Backend 4000" dir=in action=allow protocol=TCP localport=4000 1>nul 2>&1
for /f "tokens=5" %%b in ('netstat -ano ^| findstr ":4000" ^| findstr "LISTENING"') do (
  if not "%%b"=="0" (
    echo Kill PID %%b...
    taskkill /PID %%b /F 1>nul 2>&1
  )
)
set "TR_CMD=node "%CD%\backend-nest\dist\src\main.js""
schtasks /Query /TN SDU-Backend 1>nul 2>&1
if errorlevel 1 (
  echo Tao Scheduled Task SDU-Backend auto-run on boot...
  schtasks /Create /TN SDU-Backend /TR "%TR_CMD%" /SC ONSTART /RU SYSTEM /RL HIGHEST /F 1>nul 2>&1
) else (
  echo Cap nhat Task SDU-Backend...
  schtasks /Change /TN SDU-Backend /TR "%TR_CMD%" 1>nul 2>&1
)
schtasks /Run /TN SDU-Backend 1>nul 2>&1
if errorlevel 1 (
  echo [WARN] Khong chay duoc Task [can Run as administrator]. Chay tam:
  start "" /B node "backend-nest\dist\src\main.js"
)

REM 6. Kiem tra
echo [6/6] Kiem tra...
timeout /t 5 /nobreak 1>nul 2>&1
netstat -ano | findstr ":4000" | findstr "LISTENING" >nul
if errorlevel 1 (
  netstat -ano | findstr ":4000"
  if errorlevel 1 (
    echo [LOI] Chua thay :4000 - xem Task Scheduler [taskschd.msc ^> SDU-Backend]
  ) else (
    echo [INFO] Co :4000 nhung chua LISTENING [TIME_WAIT] - doi 5s roi thu lai
    timeout /t 5 /nobreak 1>nul 2>&1
    netstat -ano | findstr ":4000"
  )
) else (
  echo [OK] Backend dang nghe :4000
)
powershell -NoProfile -Command "try { $r=Invoke-RestMethod http://localhost:4000/api/health -TimeoutSec 5; $r | ConvertTo-Json -Compress; if($r.status -ne 'ok'){exit 1} } catch { Write-Host '[WARN] /api/health chua tra loi - thu F5 web sau 10s' -ForegroundColor Yellow; exit 0 }" 2>&1
powershell -NoProfile -Command "try { $r=Invoke-RestMethod http://localhost:4000/api/health -TimeoutSec 5; if($r.db -ne 'connected'){ Write-Host '[WARN] DB chua connected - kiem tra XAMPP MySQL' -ForegroundColor Yellow } } catch {}" 1>nul 2>&1

echo.
echo ================= XONG =================
echo  - Backend: http://localhost:4000/api/health
echo  - Frontend Vercel tu deploy khi push main (rewrites /api -^> 163.61.110.126:4000)
echo  - Tai khoan: admin@saodo.edu.vn / admin123
echo  - Log Task: taskschd.msc ^> SDU-Backend
echo.
pause
exit /b 0

:fail
echo [LOI] Lenhs vua roi fail - dung lai de ban xem loi
popd
pause
exit /b 1
