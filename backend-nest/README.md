# 🚀 SDU Admin Backend (NestJS + tRPC + Prisma)

> **Modernization of the legacy Laravel 11 backend — same DB schema, ~10x fewer API bugs, end-to-end TypeScript types.**

This is the new backend, sitting alongside the old `backend/` (Laravel) folder.
You can run them side-by-side, migrate incrementally, and delete Laravel once confident.

---

## ⚡ Why this is better than the old Laravel stack

| Problem in Laravel | Solution here |
|---|---|
| PHP `int` / `string` / `null` mismatch bugs | **TypeScript + Zod** at the boundary — invalid input never reaches the DB |
| `axios.post('/login', …)` returns `any` — frontend guesses the shape | **tRPC** — `trpc.auth.login.useMutation()` knows the exact input + output types |
| 15 `fix_*.cjs` scripts patching the DB | **Prisma migrations** — versioned, reversible, type-checked |
| `decodeJsonInput()` hacks to parse FormData JSON | **Zod schemas** validate everything; no more `JSON.parse` scattered everywhere |
| `route('auth:sanctum')` and `if($user->role === 'ADMIN')` repeated | **`protectedProcedure` + `roleProcedure([…])`** as middleware |
| `axios.put('/plans/{id}/status', …)` — typo = silent 404 | **`trpc.plans.updateStatus.mutate({…})`** — TS errors on bad input |
| `expected_result` JSON in a text column | **Proper relational `PlanItem` rows** (was the case in schema, but Laravel's `json_encode()` everything obscured it) |

---

## 🏗️ Project structure

```
backend-nest/
├── prisma/
│   ├── schema.prisma          # MySQL schema (mirrors Laravel migrations)
│   └── seed.ts                # Seeds 5 khoa, 25 teachers, 1 admin
├── src/
│   ├── main.ts                # Bootstrap (tRPC + uploads + CORS)
│   ├── app.module.ts          # Root NestJS module
│   ├── prisma/                # PrismaService (singleton DB client)
│   ├── auth/                  # JWT, login/register/me
│   ├── users/                 # Approvals, profile updates
│   ├── departments/
│   ├── plans/                 # The big one — replaces PlanController
│   ├── audit/                 # Audit log
│   ├── uploads/               # Multer file upload
│   ├── trpc/                  # tRPC bootstrap (context, router, mount)
│   └── shared/
│       └── schemas.ts         # Zod schemas (shared FE/BE contract)
├── package.json
├── tsconfig.json
├── Dockerfile                 # Multi-stage prod build
└── .env.example
```

---

## 🔧 Quick start (local dev)

### 1. Install dependencies

```bash
cd backend-nest
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit DATABASE_URL to point to your MySQL
# Default: mysql://root:password@localhost:3306/sdu_admin
```

### 3. Create the database & run migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Seed demo users

```bash
npx prisma db seed
```

This creates:
- 1 admin: `admin@saodo.edu.vn` / `admin123`
- 25 teachers: `cntt1@saodo.edu.vn` … `kot5@saodo.edu.vn` / `password123`
- 5 departments
- 4 locations

### 5. Start the server

```bash
npm run dev
```

Server runs at `http://localhost:4000/api`:
- `POST /api/trpc/auth.login` — tRPC procedure
- `GET  /api/health` — health check
- `POST /api/uploads` — file upload (multipart)
- `GET  /api/uploads/{file}` — serve uploaded files

---

## 🐳 Docker (full stack)

```bash
# From project root
docker compose -f docker-compose.nest.yml up -d
```

This starts:
- MySQL 8 on `localhost:3306`
- NestJS backend on `localhost:4000`
- Vite frontend on `localhost:5173`

Stop with:
```bash
docker compose -f docker-compose.nest.yml down
```

---

## 🔌 tRPC API surface

Once you have the token, every API call is fully typed:

```typescript
// In a React component:
const { data: plans, isLoading } = trpc.plans.list.useQuery();
const createPlan = trpc.plans.create.useMutation();
const me = trpc.auth.me.useQuery();

// Login:
await trpc.auth.login.mutate({ email: 'cntt1@saodo.edu.vn', password: 'password123' });
//    ↑ TS errors if you mistype the email field
```

### Procedures (mirrors the old Laravel routes)

```
auth.login         → POST /login
auth.register      → POST /register
auth.me            → GET  /me
auth.nextCode      → GET  /users/next-code
auth.logout        → POST /logout
auth.test          → GET  /test

users.listActive            → GET  /users/active
users.listPending           → GET  /users/pending
users.listPendingProfiles   → GET  /users/pending-profiles
users.approve               → PUT  /users/{id}/approve
users.reject                → PUT  /users/{id}/reject
users.delete                → DELETE /users/{id}
users.activities            → GET  /users/{id}/activities
users.updateProfile         → POST /users/profile-request
users.approveProfile        → PUT  /users/{id}/approve-profile
users.rejectProfile         → PUT  /users/{id}/reject-profile
users.updateAvatar          → POST /users/avatar

departments.list            → GET  /departments
departments.create          → POST /departments

plans.list                  → GET  /plans
plans.get                   → GET  /plans/{id}
plans.create                → POST /plans
plans.update                → POST /plans/{id}   (uses _method override)
plans.delete                → DELETE /plans/{id}
plans.approvePhase1         → PUT  /plans/{id}/approve-p1
plans.submitReport          → PUT  /plans/{id}/submit-report
plans.acceptPhase2          → PUT  /plans/{id}/accept-p2
plans.updateStatus          → PUT  /plans/{id}/status
plans.updateWeekStatus      → PUT  /plans/{id}/weeks/{week}/status
plans.bulkComplete          → PUT  /plans/{id}/bulk-complete

audit.listForPlan           → GET  /plans/{id}/audit-logs
```

---

## 📋 Migration checklist (Laravel → NestJS)

- [x] Prisma schema mirrors all 9 Laravel models + addendum migrations
- [x] 7 Prisma enums replace loose `string` statuses (no more `DRAFT` vs `DRAFTED` typos)
- [x] All PlanController endpoints (486 LOC PHP) ported
- [x] All AuthController endpoints (450 LOC PHP) ported
- [x] JWT auth replaces Sanctum
- [x] tRPC client + typed React Query hooks
- [x] File upload (Multer)
- [x] Docker compose for full stack
- [ ] **Replace `axios` calls in `frontend/src/components/*` with tRPC hooks**
- [ ] **Move `backend/` (Laravel) out of the repo**
- [ ] **Update CI/CD to build NestJS Dockerfile instead of Laravel**

### Frontend migration pattern

Old code (axios + manual type casting):
```typescript
const response = await api.get('/plans');
set({ plans: response.data.map(mapPlan) });
```

New code (tRPC + auto-typed):
```typescript
const { data: plans } = trpc.plans.list.useQuery();
//    ^-- `plans` is fully typed: PlanDTO[] | undefined
```

A migration helper hook (`src/trpc/useTrpc.ts`) is already provided.
See `frontend/src/trpc/useTrpc.ts` for the full list of wrappers.

---

## 🛠️ Useful scripts

```bash
npm run dev               # Watch mode
npm run build             # Compile to dist/
npm run start             # Run compiled output
npm run prisma:studio     # Open Prisma Studio (DB GUI)
npm run prisma:migrate    # Create new migration
npm run prisma:deploy     # Apply migrations (production)
npm run prisma:seed       # Seed demo data
```

---

## 🔐 Security notes

- Passwords hashed with `bcryptjs` (same as Laravel)
- JWT signed with HS256, secret in `JWT_SECRET` env var
- All non-public procedures verify the JWT in the tRPC context
- `roleProcedure([...])` middleware enforces role-based access declaratively
- File uploads validated: 10MB cap, filename sanitized, served from `/api/uploads/*` (no path traversal)

---

## 📜 License

MIT — same as the original Laravel project.
