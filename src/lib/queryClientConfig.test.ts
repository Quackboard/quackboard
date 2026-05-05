import { describe, it, expect, vi, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "./queryClientConfig";

let client: QueryClient;
afterEach(() => {
  client?.clear();
});

describe("QueryClient staleTime", () => {
  it("default QueryClient re-fetches on sequential fetchQuery with same key", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    client = new QueryClient();

    await client.fetchQuery({ queryKey: ["test"], queryFn: fetchFn });
    await client.fetchQuery({ queryKey: ["test"], queryFn: fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("createQueryClient serves from cache within stale window", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    client = createQueryClient();

    await client.fetchQuery({ queryKey: ["test"], queryFn: fetchFn });
    await client.fetchQuery({ queryKey: ["test"], queryFn: fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("fetches again after cache entry is stale", async () => {
    const fetchFn = vi.fn().mockResolvedValue("data");
    client = createQueryClient();

    await client.fetchQuery({ queryKey: ["test"], queryFn: fetchFn });

    client.setQueryData(["test"], "data", { updatedAt: 0 });

    await client.fetchQuery({ queryKey: ["test"], queryFn: fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("createQueryClient sets staleTime on default query options", () => {
    client = createQueryClient();
    expect(client.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });

  it("createQueryClient disables refetch on window focus by default", () => {
    client = createQueryClient();
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it("createQueryClient sets retry to 1 by default", () => {
    client = createQueryClient();
    expect(client.getDefaultOptions().queries?.retry).toBe(1);
  });
});
