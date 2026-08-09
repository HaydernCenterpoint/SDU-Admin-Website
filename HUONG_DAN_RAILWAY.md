# Deploy Backend len Railway — Huong dan chi tiet

## Tong quan
- Frontend Vercel giu nguyen
- Backend NestJS chuyen tu VPS 163.61.110.126:4000 sang Railway (co SSL, auto-restart, khong can XAMPP)
- DB: Railway MySQL plugin (thay XAMPP)

---

## Buoc 1: Tao project Railway

1. Vao https://railway.app -> Login bang GitHub (cung tai khoan HaydernCenterpoint)
2. `New Project` -> `Deploy from GitHub repo` -> chon `HaydernCenterpoint/SDU-Admin-Website`
3. Railway se tu detect `railway.json` o root va build `backend-nest/Dockerfile`

> Repo phai public hoac da authorize Railway access. Neu khong thay repo -> Settings -> GitHub App -> Configure.

---

## Buoc 2: Them MySQL

1. Trong Railway project -> `+ New` -> `Database` -> `Add MySQL` (hoac `Add MySQL` tu template)
2. Doi Railway tu tao `MYSQL_URL` / `DATABASE_URL` cho service MySQL
3. Click vao MySQL service -> tab `Variables` -> copy `DATABASE_URL` (dang `mysql://root:xxx@mysql.railway.internal:3306/railway`)

---

## Buoc 3: Cau hinh Backend service

Click vao **backend service** (SDU-Admin-Website) -> tab `Variables` -> them:

| Key | Value | Ghi chu |
|-----|-------|---------|
| `DATABASE_URL` | `${{MySQL.DATABASE_URL}}` | Reference tu MySQL service — click `Add Reference` |
| `JWT_SECRET` | `openssl rand -hex 32` ra 1 chuoi dai | Bat buoc doi |
| `JWT_EXPIRES_IN` | `7d` | |
| `CORS_ORIGIN` | `https://thietbidaihocsaodo.vercel.app,http://localhost:5173` | Cho Vercel + local dev |
| `PORT` | (de trong — Railway tu inject) | Dung de trong |
| `NODE_ENV` | `production` | |
| `UPLOAD_DIR` | `/app/uploads` | Trung voi Dockerfile |
| `MAX_FILE_SIZE_MB` | `10` | |

> Cach them `DATABASE_URL` dung nhat: trong Variables -> `New Variable` -> `Add Reference` -> chon MySQL -> `DATABASE_URL`.

---

## Buoc 4: Them Volume cho uploads

1. Backend service -> tab `Settings` -> `Volumes` -> `New Volume`
2. Mount path: `/app/uploads`
3. Deploy lai (Railway tu redeploy khi them volume)

> Neu khong co Volume, uploads se mat khi redeploy. Voi Volume thi giu duoc.

---

## Buoc 5: Cau hinh Networking

1. Backend service -> tab `Settings` -> `Networking` -> `Generate Domain`
2. Copy domain, VD: `sdu-admin-website-production.up.railway.app`
3. Test: `https://xxx.up.railway.app/api/health` -> `{"status":"ok","db":"connected"}`

---

## Buoc 6: Doi Vercel rewrite sang Railway

Sua `vercel.json` (root) va `frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://xxx.up.railway.app/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Thay `xxx.up.railway.app` bang domain thuc te o buoc 5.

Sau do:

```bash
git add vercel.json frontend/vercel.json
git commit -m "chore: switch Vercel proxy from VPS to Railway"
git push origin main
```

Vercel se tu redeploy frontend (~1 phut).

---

## Buoc 7: Migrate + Seed DB tren Railway

Railway Dockerfile da tu chay `npx prisma migrate deploy` khi start. De seed lan dau:

1. Vao Railway -> Backend service -> tab `Deployments` -> click deployment moi nhat -> `View Logs`
2. Neu chua co data, chay seed bang Railway CLI hoac them bien:

**Cach A — Railway CLI (local):**
```bash
npm i -g @railway/cli
railway login
railway link  # chon project SDU
railway run npx prisma db seed --schema=backend-nest/prisma/schema.prisma
```

**Cach B — Tam them bien `SEED_ON_BOOT=true` roi redeploy, xong xoa di.**

---

## Buoc 8: Verify

```bash
# Health
curl https://xxx.up.railway.app/api/health
# -> {"status":"ok","db":"connected","api":"tRPC"}

# Login
curl -X POST https://xxx.up.railway.app/api/trpc/auth.login?batch=1 \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"email":"admin@saodo.edu.vn","password":"admin123"}}}'

# Frontend
open https://thietbidaihocsaodo.vercel.app
# Login admin@saodo.edu.vn / admin123
```

---

## Rollback (neu can)

Neu Railway loi, revert `vercel.json` ve VPS cu:

```json
"destination": "http://163.61.110.126:4000/api/$1"
```

Push lai la xong — VPS cu van giu `update-all.bat` de chay.

---

## Chi phi uoc tinh

- Railway Hobby: $5 credit free/thang, sau do ~$5-10/thang cho backend + MySQL nho
- Alternative free: Render + Neon/Supabase (free tier) neu muon 0d
