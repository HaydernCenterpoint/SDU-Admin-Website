# auto-install-backend.ps1 - 1 click cai + chay backend NestJS tren Windows VPS
# Dung: chuot phai -> Run with PowerShell (hoac: powershell -ExecutionPolicy Bypass -File .\auto-install-backend.ps1)
# ponytail: Task Scheduler (native Windows) thay vi pm2, khong them dependency.
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# 1. Tim thu muc backend-nest (du script de o dau)
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }

$rawCandidates = @(
  (Join-Path $ScriptDir "backend-nest")
  "C:\SDU-Admin-Website\backend-nest"
  "C:\Users\Administrator\Desktop\SDU-Admin-Website\backend-nest"
  "C:\Users\Administrator\SDU-Admin-Website\backend-nest"
)
$candidates = $rawCandidates | Where-Object { $_ -and (Test-Path (Join-Path $_ "package.json")) } | Select-Object -First 1

if (-not $candidates) {
  Write-Host "Khong tim thay backend-nest/package.json" -ForegroundColor Red
  Write-Host "Tim thu:" -ForegroundColor Yellow
  Get-ChildItem C:\ -Recurse -Filter package.json -Depth 5 -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*backend-nest*" } | Select-Object FullName -First 5 | ForEach-Object { Write-Host "  $($_.FullName)" }
  Write-Host ""
  Write-Host "Cach fix: copy ca thu muc SDU-Admin-Website len server roi chay lai script tu trong do." -ForegroundColor Yellow
  pause
  exit 1
}
$BackendDir = $candidates
Write-Step "Backend tim thay: $BackendDir"
Set-Location $BackendDir

# 2. Kiem tra Node
Write-Step "Kiem tra Node.js"
try { node -v; npm -v | Out-Null } catch {
  Write-Host "Chua co Node.js! Cai tu https://nodejs.org (LTS) roi chay lai." -ForegroundColor Red
  pause
  exit 1
}

# 3. .env
if (-not (Test-Path ".env")) {
  Write-Step "Tao .env tu .env.example"
  Copy-Item ".env.example" ".env"
  Write-Host "Da tao .env - sua JWT_SECRET + DATABASE_URL neu can roi chay lai." -ForegroundColor Yellow
  notepad .env
  pause
}

# 4. Cai + build
Write-Step "npm install (lan dau hoi lau)..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install loi" -ForegroundColor Red; pause; exit 1 }

Write-Step "prisma generate"
npx prisma generate

Write-Step "prisma migrate deploy (tao DB neu chua co)"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Host "DB chua chay? Mo XAMPP -> Start MySQL roi chay lai." -ForegroundColor Yellow }

Write-Step "npm run build"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build loi" -ForegroundColor Red; pause; exit 1 }

# 5. Mo firewall + chay
Write-Step "Mo firewall port 4000"
netsh advfirewall firewall add rule name="SDU Backend 4000" dir=in action=allow protocol=TCP localport=4000 2>$null | Out-Null

Write-Step "Don process cu tren 4000"
$oldPids = netstat -ano | findstr ":4000" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
foreach ($procId in $oldPids) {
  try { taskkill /PID $procId /F 2>$null | Out-Null; Write-Host "Da kill PID $procId" } catch {}
}

# 6. Tao task tu chay khi khoi dong (native, khong can pm2)
Write-Step "Tao Scheduled Task SDU-Backend (tu chay khi boot)"
$TaskName = "SDU-Backend"
$Action = New-ScheduledTaskAction -Execute "node.exe" -Argument "dist\src\main.js" -WorkingDirectory $BackendDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
try {
  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "SDU NestJS backend" -User "SYSTEM" -RunLevel Highest -Force | Out-Null
  Start-ScheduledTask -TaskName $TaskName 2>$null | Out-Null
  Write-Host "Task $TaskName da tao + start." -ForegroundColor Green
} catch {
  Write-Host "Khong tao duoc Task (can chay PowerShell as Administrator). Se chay tam." -ForegroundColor Yellow
}

Write-Step "Chay backend ngay (cua so nay)"
Start-Sleep -Seconds 2
Start-Process -FilePath "node.exe" -ArgumentList "dist\src\main.js" -WorkingDirectory $BackendDir -WindowStyle Normal

Write-Step "Kiem tra"
Start-Sleep -Seconds 4
netstat -ano | findstr ":4000"
$listening = netstat -ano | findstr ":4000"
if ($listening) {
  Write-Host ""
  Write-Host "Backend dang nghe :4000" -ForegroundColor Green
  Write-Host "Test: curl http://localhost:4000/api/health" -ForegroundColor Gray
  try { Invoke-RestMethod http://localhost:4000/api/health -TimeoutSec 5 | ConvertTo-Json -Depth 3 | Write-Host } catch { Write-Host "Chua tra loi /health - thu upload tren web la duoc" -ForegroundColor Yellow }
} else {
  Write-Host ""
  Write-Host "Chua thay :4000 - xem log o Task Scheduler hoac cua so node vua mo" -ForegroundColor Red
}

Write-Host ""
Write-Host "Xong! Dong cua so nay backend van chay (qua Scheduled Task)." -ForegroundColor Green
Write-Host "Log: Get-ScheduledTask SDU-Backend | Get-ScheduledTaskInfo" -ForegroundColor Gray
pause
