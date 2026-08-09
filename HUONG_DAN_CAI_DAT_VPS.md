# SDU-Admin-Website — Huong dan cai dat / cap nhat tren VPS Windows

> 1 file duy nhat: **`update-all.bat`** (1-click). Chay bang **CMD Run as administrator**.

---

## 1. Tong quan du an (da ra soat tu dau den cuoi)

| Lop | Cong nghe | Thu muc | Ghi chu |
|-----|-----------|---------|---------|
| Frontend | Vite 5 + React 19 + Zustand + tRPC + Tailwind | `frontend/` | Build ra `dist/`, Vercel rewrites `/api/*` |
| Backend | NestJS 10 + tRPC 11 + Prisma 6 + MySQL | `backend-nest/` | Port `4000`, `GET /api/health`, `POST /api/trpc/*`, `POST /api/uploads` |
| DB | MySQL 8 (XAMPP) + Prisma | `backend-nest/prisma/schema.prisma` | 6 bang: departments, users, equipment, locations, plans (+ items/weeks), audit_logs |
| Deploy | Vercel (FE) -> `http://163.61.110.126:4000` (BE) | `vercel.json` + `frontend/vercel.json` | Rewrite `/api/(.*)` -> VPS:4000 |

**API:** tRPC mount tai `POST /api/trpc/*` (auth, users, departments, plans, audit) + REST `POST /api/uploads` (multipart, JWT).

**Upload:** `multer diskStorage` -> `UPLOAD_DIR` (mac dinh `./uploads`), gioi han `MAX_FILE_SIZE_MB=10`, chi cho `pdf/docx/xlsx/pptx` (+ legacy `doc/xls/ppt`), phuc vu tai `GET /api/uploads/:filename`.

**Seed:** `backend-nest/prisma/seed.ts` idempotent — tao 5 khoa (CNTT/KMT/KCK/KD/KOT) + admin `admin@saodo.edu.vn / admin123` + 25 teacher `cntt1..kmt5 / password123`.

---

## 2. Cai dat lan dau (may moi / VPS moi)

### Yeu cau
- Windows 10/11 hoac Windows Server 2012+
- **Node.js >= 18** (khuyen nghi 20 LTS): https://nodejs.org
- **Git**: https://git-scm.com/download/win
- **MySQL**: XAMPP (https://www.apachefriends.org) hoac MySQL service dang chay port 3306

### Buoc
1. Clone repo len VPS:
   ```bat
   cd /d C:\Users\Administrator
   git clone https://github.com/HaydernCenterpoint/SDU-Admin-Website.git
   cd SDU-Admin-Website
   ```
2. Mo XAMPP Control Panel -> **Start MySQL** (neu chua chay).
3. Mo **CMD -> Run as administrator** -> chay:
   ```bat
   cd /d C:\Users\Administrator\SDU-Admin-Website
   update-all.bat
   ```
   Script se tu: tao `.env`, `npm install`, `prisma generate`, `prisma migrate deploy`, `prisma db seed`, `npm run build` (BE+FE), mo firewall 4000, tao Task `SDU-Backend` (auto-run on boot), kiem tra `:4000` + `/api/health`.

4. Verify:
   - `http://localhost:4000/api/health` -> `{"status":"ok","db":"connected","api":"tRPC"}`
   - `https://thietbidaihocsaodo.vercel.app/api/health` -> same (qua Vercel rewrite)
   - Login: `admin@saodo.edu.vn / admin123`

### Cau hinh .env (neu can)
File `backend-nest\.env` duoc tao tu `.env.example`:
```
DATABASE_URL="mysql://root:@localhost:3306/sdu_admin"
PORT=4000
JWT_SECRET=...
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,https://thietbidaihocsaodo.vercel.app
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
```
- XAMPP khong dat pass MySQL -> de `root:@` (khong pass). Neu co pass -> `root:matkhau@`.
- DB chua co -> `prisma migrate deploy` se tao. Ten DB mac dinh `sdu_admin` (sua trong DATABASE_URL neu khac).

---

## 3. Cap nhat sau nay (co code moi push len main)

Chi can chay lai **1 lenh** tren VPS:

**CMD (khuyen nghi):**
```bat
cd /d C:\Users\Administrator\SDU-Admin-Website
update-all.bat
```

**PowerShell:**
```powershell
cd C:\Users\Administrator\SDU-Admin-Website
.\update-all.bat
```

> Luon **Run as administrator** de tao/cap nhat Scheduled Task va mo firewall.

Script tu:
- `git pull --ff-only` (tu dong stash neu co conflict local)
- Kill `:4000` cu + xoa `.prisma` lock (fix `EPERM query_engine-windows.dll.node`)
- `npm install --prefer-offline` + `prisma generate` + `migrate deploy` + `build` + `seed`
- Restart `SDU-Backend` + check `LISTENING :4000` + `Invoke-RestMethod /api/health`

Frontend Vercel tu deploy khi push `main` (khong can chay gi them).

---

## 4. Loi thuong gap va cach xu ly

| Loi | Nguyen nhan | Fix |
|-----|-------------|-----|
| `was unexpected at this time` | Ban `update-all.bat` cu chua fix parser `2>nul` trong `for` | `git pull` lay ban `eee5733` tro len la het |
| `EPERM rename query_engine-windows.dll.node` | `node.exe` dang giu file Prisma | Script tu `taskkill :4000` + `rmdir .prisma` truoc `prisma generate` |
| `PORT 4000 in use` / `EADDRINUSE` | Backend cu chua tat | Script tu kill `LISTENING :4000`, check `netstat -ano \| findstr :4000` |
| `Your local changes would be overwritten` | Sua file truc tiep tren VPS | Script tu `git stash push --keep-index` roi `pull` |
| `prisma migrate deploy fail` | MySQL chua chay | Mo XAMPP -> Start MySQL, chay lai `update-all.bat` |
| `curl is not recognized` | Win 2012 khong co curl | Script dung `powershell Invoke-RestMethod` thay the |
| `EBADENGINE required node >=20` | VPS dang Node 18.20.8 | Van chay duoc (warn), khuyen nghi upgrade Node 20 LTS |
| `502 Bad Gateway / ROUTER_EXTERNAL_TARGET_CONNECTION_ERROR` | BE chet, Vercel khong proxy duoc | Chay `update-all.bat` de restart BE, check `/api/health` |
| `rmdir /s /q` bao `Remove-Item` | Chay trong PowerShell (alias) | Dung CMD, hoac `Remove-Item -Recurse -Force` trong PowerShell |

---

## 5. Quan ly backend tren VPS

- **Xem Task:** `taskschd.msc` -> `SDU-Backend` (Trigger: At system startup, User: SYSTEM)
- **Log / History:** `taskschd.msc` -> SDU-Backend -> History
- **Restart tay:** `schtasks /Run /TN SDU-Backend` hoac `schtasks /End` + `schtasks /Run`
- **Check port:** `netstat -ano | findstr :4000` (phai co `LISTENING`)
- **Health:** `powershell -NoProfile -Command "Invoke-RestMethod http://localhost:4000/api/health | ConvertTo-Json"`

---

## 6. Tai khoan mac dinh (sau seed)

| Email / Ma | Mat khau | Role |
|------------|----------|------|
| `admin@saodo.edu.vn` | `admin123` | ADMIN |
| `cntt1@saodo.edu.vn` ... `kot5@saodo.edu.vn` | `password123` | TEACHER |

Ma giang vien so (01007027 - Vu Bao Tao) la du lieu cu tu `saodo_equipment.sql`, khong co trong seed hien tai. Dang ky moi se tu sinh ma so tiep theo.

---

## 7. File lien quan

- `update-all.bat` — script chinh (1-click cai + update)
- `auto-install-backend.ps1` + `start-backend.bat` — ban PowerShell tuong duong (du phong)
- `backend-nest/.env.example` — mau cau hinh
- `backend-nest/prisma/schema.prisma` — schema DB
- `vercel.json` — rewrite Vercel -> VPS
