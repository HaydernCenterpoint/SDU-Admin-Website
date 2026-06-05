/**
 * tRPC app router — assembles all domain routers.
 * The `appRouter` type is the source of truth for the frontend client.
 *
 * Endpoints:
 *   auth.login, auth.register, auth.me, auth.nextCode, auth.refresh
 *   users.listActive, users.listPending, users.approve, users.reject, users.delete,
 *   users.updateProfile, users.approveProfile, users.rejectProfile, users.activities,
 *   departments.list, departments.create
 *   plans.list, plans.create, plans.update, plans.delete, plans.approvePhase1,
 *   plans.submitReport, plans.acceptPhase2, plans.updateStatus,
 *   plans.updateWeekStatus, plans.bulkComplete
 *   audit.listForPlan
 */
import { router } from './trpc';
import { authRouter } from '../auth/auth.router';
import { usersRouter } from '../users/users.router';
import { departmentsRouter } from '../departments/departments.router';
import { plansRouter } from '../plans/plans.router';
import { auditRouter } from '../audit/audit.router';

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  departments: departmentsRouter,
  plans: plansRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
