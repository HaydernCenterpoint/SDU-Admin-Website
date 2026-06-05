/**
 * ──────────────────────────────────────────────────────────────────────────────
 * EXAMPLE: How to integrate tRPC + React Query into your existing app.

 * ──────────────────────────────────────────────────────────────────────────────
 *
 * This file is a complete minimal example. Drop it into a fresh project to see
 * end-to-end type-safety from `npx prisma generate` → backend tRPC procedure →
 * React component with zero manual types.
 *
 * To integrate into the EXISTING frontend (which still uses axios + Zustand),
 * see the comments below for the minimal changes.
 */

import React, { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, makeTrpcClient } from './client';
import { usePlans, useCreatePlan, useLogin, useActiveUsers } from './useTrpc';

// ─── React Query client ───────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// ─── tRPC client (reads token from localStorage) ──────────────────────────
const trpcClient = makeTrpcClient(() => localStorage.getItem('token'));

// ─── App root ─────────────────────────────────────────────────────────────
export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <DemoApp />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// ─── Demo component: shows full type-safety ───────────────────────────────
function DemoApp() {
  const login = useLogin();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const plans = usePlans();
  const createPlan = useCreatePlan();
  const users = useActiveUsers();

  if (!token) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Login</h1>
        <button
          onClick={async () => {
            const res = await login.mutateAsync({
              email: 'cntt1@saodo.edu.vn',
              password: 'password123',
            });
            localStorage.setItem('token', res.token);
            setToken(res.token);
            window.location.reload();
          }}
        >
          Login as cntt1
        </button>
        {login.error && <p style={{ color: 'red' }}>{login.error.message}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>SDU Admin Demo</h1>

      <section>
        <h2>📋 Plans ({plans.data?.length ?? '...'})</h2>
        {plans.isLoading && <p>Loading…</p>}
        {plans.error && <p style={{ color: 'red' }}>Error: {plans.error.message}</p>}
        {plans.data && (
          <ul>
            {plans.data.map((p) => (
              <li key={p.id}>
                {p.code} — {p.title} ({p.status})
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={async () => {
            await createPlan.mutateAsync({
              title: 'Kế hoạch test từ tRPC',
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              items: [],
              weeks: [],
            });
          }}
        >
          + Tạo kế hoạch
        </button>
      </section>

      <section>
        <h2>👥 Active users ({users.data?.length ?? '...'})</h2>
        <ul>
          {users.data?.slice(0, 5).map((u) => (
            <li key={u.id}>
              {u.name} — {u.email} ({u.role})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * MIGRATION PATTERN: từ code cũ sang tRPC
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * BEFORE (axios + manual mapping in Zustand):
 *
 *   const response = await api.get('/plans');
 *   set({ plans: response.data.map(mapPlan) });  // mapPlan is hand-rolled
 *
 * AFTER (tRPC + auto-typing):
 *
 *   const { data: plans } = trpc.plans.list.useQuery();
 *   //    ^-- fully typed, no mapping needed
 *
 * BEFORE (mutation):
 *
 *   try {
 *     await api.post('/plans', formData);
 *   } catch (e) {
 *     // e.response.data.message — string, but TypeScript doesn't know
 *   }
 *
 * AFTER:
 *
 *   const create = trpc.plans.create.useMutation({
 *     onError: (e) => toast.error(e.message),  // typed!
 *     onSuccess: () => queryClient.invalidateQueries([['plans']]),
 *   });
 *   create.mutate({ title, month, year, ... });  // shape-checked by TS
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * STEP-BY-STEP INTEGRATION INTO EXISTING frontend/
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * 1. Wrap <App /> in main.tsx:
 *
 *    import { trpc, makeTrpcClient } from './trpc/client';
 *    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 *
 *    const queryClient = new QueryClient();
 *    const trpcClient = makeTrpcClient(() => localStorage.getItem('token'));
 *
 *    ReactDOM.createRoot(...).render(
 *      <trpc.Provider client={trpcClient} queryClient={queryClient}>
 *        <QueryClientProvider client={queryClient}>
 *          <App />
 *        </QueryClientProvider>
 *      </trpc.Provider>
 *    );
 *
 * 2. In each component, replace:
 *      const { data, error } = useAppStore();
 *      useEffect(() => { fetchPlans(); }, []);
 *    with:
 *      const { data, error, isLoading } = trpc.plans.list.useQuery();
 *
 * 3. Mutations:
 *      await api.post('/plans', formData)
 *    →
 *      const create = trpc.plans.create.useMutation();
 *      create.mutate({ title, month, year, ... });
 *
 * 4. (Optional) Delete the old useAppStore API actions once all components
 *    are migrated.
 */
