// AppRouter type link from backend-nest.
import type { AppRouter } from '../../../backend-nest/src/trpc/trpc.router';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export type { AppRouter };

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

