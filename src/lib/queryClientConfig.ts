import { QueryClient } from "@tanstack/react-query";

const STALE_TIME_MS = 60_000; // 1 minute

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
