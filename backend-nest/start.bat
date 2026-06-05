@echo off
REM ──────────────────────────────────────────────────────────────────────────────
REM Helper script for Windows: setup + run NestJS backend in one go.
REM Usage:  start.bat
REM ──────────────────────────────────────────────────────────────────────────────

echo Installing dependencies...
call npm install
if errorlevel 1 goto :error

if not exist .env (
  echo Creating .env from .env.example...
  copy .env.example .env
  echo Please edit .env with your DB credentials, then re-run this script.
  exit /b 1
)

echo Generating Prisma client...
call npx prisma generate

echo Running migrations...
call npx prisma migrate deploy 2>nul || call npx prisma db push

echo Seeding demo data...
call npx prisma db seed 2>nul

echo.
echo Done! Starting dev server...
echo.
call npm run dev
goto :eof

:error
echo Failed with error #%errorlevel%.
exit /b %errorlevel%
