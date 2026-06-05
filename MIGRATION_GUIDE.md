# Migration: Laravel 11 → NestJS + tRPC + Prisma

> Lộ trình di chuyển hoàn chỉnh, step-by-step, từ Laravel cũ sang NestJS mới.
> Đọc kỹ trước khi bắt đầu.

## 🎯 Tổng quan

| Trước (Laravel) | Sau (NestJS) |
|---|---|
| PHP 8.2 + Laravel 11 + Sanctum | Node 20 + NestJS 10 + JWT |
| Eloquent ORM + MySQL string columns | **Prisma 6** + MySQL với TS enums |
| 191 dòng `routes/api.php` | **1 file** `trpc.router.ts` với 30+ procedures |
| 2 controllers, 936 dòng PHP | 2 services + 2 routers, ~600 dòng TS |
| 17 file `fix_*.cjs` chắp vá DB | **Prisma migrations** versioned |
| Frontend dùng `axios` + manual mapping | **tRPC client** auto-typed |
| Validation: Laravel `validate()` | **Zod schemas** (share được với FE) |
| Auth: Sanctum tokens | JWT Bearer + Passport |

## 📂 Cấu trúc mới

```
SDU-Admin-Website-main/
├── backend/                  # Laravel 11 (CŨ - sẽ xóa)
├── backend-nest/            # NestJS + tRPC + Prisma (MỚI)
│   ├── prisma/schema.prisma
│   ├── src/...              # Modules: auth, users, plans, ...
│   ├── Dockerfile
│   └── package.json
├── frontend/                 # React 19 + TypeScript
│   └── src/trpc/            # tRPC client + hooks
├── docker-compose.nest.yml  # Full-stack: MySQL + Nest + Vite
└── MIGRATION_GUIDE.md        # ← File này
```

## 🚀 Các bước thực hiện

### Phase 1: Chạy NestJS song song (giữ Laravel làm backup)
1. Cài đặt: `cd backend-nest && npm install`
2. Tạo DB mới: `CREATE DATABASE sdu_admin_nest;`
3. Copy `.env.example` → `.env`, sửa `DATABASE_URL`
4. `npx prisma migrate dev --name init`
5. `npx prisma db seed`
6. `npm run dev` → backend NestJS chạy ở port 4000

### Phase 2: Migrate frontend từ axios sang tRPC
1. Wrap `<App />` với `<trpc.Provider client={trpcClient} queryClient={queryClient}>`
2. Sửa từng component: `api.get('/plans')` → `trpc.plans.list.useQuery()`
3. Sửa từng mutation: `api.post('/plans', …)` → `trpc.plans.create.useMutation()`
4. Test từng màn hình

### Phase 3: Cutover
1. Sửa `VITE_API_URL` trỏ về NestJS
2. Test toàn bộ flow
3. Xóa folder `backend/` (Laravel)
4. Xóa file `fix_*.cjs`, `fix_*.py`

### Phase 4: Production
1. Build Docker image: `docker build -t sdu-backend backend-nest/`
2. Push lên registry
3. Update deployment

## 🆚 So sánh API call

### Trước (axios)
```typescript
const { data } = useAppStore();
await api.get('/plans');
// response.data: any[]   ← KHÔNG có type
// response.data[0].id: unknown
```

### Sau (tRPC)
```typescript
const { data: plans } = trpc.plans.list.useQuery();
// plans: PlanDTO[] | undefined
// plans[0].id: number  ← TS biết chính xác
// plans[0].status: 'DRAFT' | 'DEPT_APPROVED_TO_BGH' | ...  ← Enum!
```

## 🔄 Mapping endpoints cũ → mới

| Laravel route | NestJS tRPC procedure |
|---|---|
| POST /api/login | `trpc.auth.login.mutate({email, password})` |
| POST /api/register | `trpc.auth.register.mutate({...})` |
| GET /api/me | `trpc.auth.me.useQuery()` |
| GET /api/users/active | `trpc.users.listActive.useQuery()` |
| GET /api/users/pending | `trpc.users.listPending.useQuery()` |
| PUT /api/users/{id}/approve | `trpc.users.approve.mutate({id})` |
| PUT /api/users/{id}/reject | `trpc.users.reject.mutate({id})` |
| DELETE /api/users/{id} | `trpc.users.delete.mutate({id})` |
| POST /api/users/profile-request | `trpc.users.updateProfile.mutate({...})` |
| GET /api/departments | `trpc.departments.list.useQuery()` |
| GET /api/plans | `trpc.plans.list.useQuery()` |
| POST /api/plans | `trpc.plans.create.mutate({...})` |
| POST /api/plans/{id} | `trpc.plans.update.mutate({id, ...})` |
| DELETE /api/plans/{id} | `trpc.plans.delete.mutate({id})` |
| PUT /api/plans/{id}/status | `trpc.plans.updateStatus.mutate({id, status})` |
| PUT /api/plans/{id}/approve-p1 | `trpc.plans.approvePhase1.mutate({id})` |
| PUT /api/plans/{id}/submit-report | `trpc.plans.submitReport.mutate({id, weeks})` |
| PUT /api/plans/{id}/accept-p2 | `trpc.plans.acceptPhase2.mutate({id, score})` |
| PUT /api/plans/{id}/weeks/{week}/status | `trpc.plans.updateWeekStatus.mutate({...})` |
| PUT /api/plans/{id}/bulk-complete | `trpc.plans.bulkComplete.mutate({id})`