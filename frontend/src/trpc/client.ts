import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from './shared-types';


export const trpc = createTRPCReact<AppRouter>();

/** Builds the tRPC client. Reads token from localStorage on each call. */
export function makeTrpcClient(getToken: () => string | null) {
  const isDev = (import.meta as any).env?.MODE === 'development';
  const isLocal = window.location.hostname === 'localhost';
  const isDevPort = ['5173', '3000'].includes(window.location.port);

  const baseUrl =
    (import.meta as any).env?.VITE_API_URL ||
    (isLocal && isDevPort
      ? 'http://localhost:4000/api/trpc'
      : `${window.location.origin}/api/trpc`);

  return trpc.createClient({
    links: [
      loggerLink({
        enabled: (opts: any) =>
          isDev || (opts.direction === 'down' && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: baseUrl,
        transformer: superjson,
        headers() {
          const token = getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
