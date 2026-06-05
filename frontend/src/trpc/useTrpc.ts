/**
 * Hooks tRPC tiện dụng — wrap từng use case cụ thể để component dùng gọn.
 * Sau khi wrap <trpc.Provider> trong App, các component có thể gọi:
 *   const { data } = usePlans();
 *   const login = useLogin();
 */
import { trpc } from './client';
import { useQueryClient } from '@tanstack/react-query';



// ─── AUTH ──────────────────────────────────────────────────────────────
export function useMe(enabled: boolean = true) {
  return trpc.auth.me.useQuery(undefined, { enabled, retry: false });
}

export function useLogin() {
  const qc = useQueryClient();
  return trpc.auth.login.useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [['auth', 'me']] });
    },
  });
}

export function useRegister() {
  return trpc.auth.register.useMutation();
}

export function useNextCode() {
  return trpc.auth.nextCode.useQuery(undefined, { staleTime: 60_000 });
}

export function useLogout() {
  const qc = useQueryClient();
  return trpc.auth.logout.useMutation({
    onSuccess: () => qc.clear(),
  });
}

// ─── USERS ─────────────────────────────────────────────────────────────
export function useActiveUsers() {
  return trpc.users.listActive.useQuery(undefined, { staleTime: 30_000 });
}
export function usePendingUsers() {
  return trpc.users.listPending.useQuery(undefined, { staleTime: 15_000 });
}
export function useApproveUser() {
  const qc = useQueryClient();
  return trpc.users.approve.useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [['users']] });
    },
  });
}
export function useRejectUser() {
  const qc = useQueryClient();
  return trpc.users.reject.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['users']] }),
  });
}
export function useUpdateProfile() {
  const qc = useQueryClient();
  return trpc.users.updateProfile.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['auth', 'me']] }),
  });
}

// ─── DEPARTMENTS ───────────────────────────────────────────────────────
export function useDepartments() {
  return trpc.departments.list.useQuery(undefined, { staleTime: 5 * 60_000 });
}

// ─── PLANS ─────────────────────────────────────────────────────────────
export function usePlans() {
  return trpc.plans.list.useQuery();
}
export function usePlan(id: number) {
  return trpc.plans.get.useQuery({ id }, { enabled: !!id });
}
export function useCreatePlan() {
  const qc = useQueryClient();
  return trpc.plans.create.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['plans']] }),
  });
}
export function useUpdatePlan() {
  const qc = useQueryClient();
  return trpc.plans.update.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['plans']] }),
  });
}
export function useDeletePlan() {
  const qc = useQueryClient();
  return trpc.plans.delete.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['plans']] }),
  });
}
export function useUpdatePlanStatus() {
  const qc = useQueryClient();
  return trpc.plans.updateStatus.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['plans']] }),
  });
}
export function useUpdateWeekStatus() {
  const qc = useQueryClient();
  return trpc.plans.updateWeekStatus.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['plans']] }),
  });
}
export function useBulkComplete() {
  const qc = useQueryClient();
  return trpc.plans.bulkComplete.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['plans']] }),
  });
}
export function useApprovePhase1() {
  const qc = useQueryClient();
  return trpc.plans.approvePhase1.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['plans']] }),
  });
}
export function useAcceptPhase2() {
  const qc = useQueryClient();
  return trpc.plans.acceptPhase2.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['plans']] }),
  });
}
export function useSubmitReport() {
  const qc = useQueryClient();
  return trpc.plans.submitReport.useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: [['plans']] }),
  });
}

// ─── AUDIT ─────────────────────────────────────────────────────────────
export function useAuditForPlan(planId: number) {
  return trpc.audit.listForPlan.useQuery({ planId }, { enabled: !!planId });
}

// ─── Re-export for ad-hoc usage ────────────────────────────────────────
export { trpc };
