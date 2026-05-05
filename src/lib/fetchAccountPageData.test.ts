import { describe, it, expect } from "vitest";
import { ACCOUNT_PAGE_EVENT_COLUMNS } from "./accountPageColumns";
import { fetchAccountPageData } from "./fetchAccountPageData";
import {
  ACCOUNTS_FETCH_COLUMNS,
  PRODUCERS_FETCH_COLUMNS,
} from "./fetchAccountPageDataColumns";

const EXPECTED_EVENTS_SELECT = `${ACCOUNT_PAGE_EVENT_COLUMNS},bookings(id, event_id, slot_position, guest_name, cancelled_at)`;

function stubQuery(data: unknown) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = () => q;
  q.eq = chain;
  q.is = chain;
  q.order = chain;
  q.maybeSingle = () => Promise.resolve({ data, error: null });
  q.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data, error: null }).then(resolve);
  return q;
}

const MOCK_ACCOUNT = { id: "acc-1", slug: "test-slug" };
const MOCK_PRODUCER = { id: "prod-1", slug: "test-slug", event_window_days: 7 };
const MOCK_EVENTS = [
  {
    id: "ev-1",
    producer_id: "prod-1",
    date: "2099-01-01",
    start_time: "19:00",
    end_time: "21:00",
    status: "published",
    bookings: [
      { id: "bk-1", event_id: "ev-1", slot_position: 1, guest_name: "A", cancelled_at: null },
    ],
  },
];

describe("fetchAccountPageData", () => {
  it("returns account, producer, and events with embedded bookings", async () => {
    const client = {
      from(table: string) {
        if (table === "accounts") return stubQuery(MOCK_ACCOUNT);
        if (table === "producers") return stubQuery(MOCK_PRODUCER);
        if (table === "events") return stubQuery(MOCK_EVENTS);
        return stubQuery([]);
      },
    };

    const result = await fetchAccountPageData("test-slug", client as any);

    expect(result.account).toEqual(MOCK_ACCOUNT);
    expect(result.producer).toEqual(MOCK_PRODUCER);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].bookings).toBeDefined();
    expect(result.events[0].bookings).toHaveLength(1);
  });

  it("never queries the bookings table directly", async () => {
    const queriedTables: string[] = [];

    const client = {
      from(table: string) {
        queriedTables.push(table);
        if (table === "accounts") return stubQuery(MOCK_ACCOUNT);
        if (table === "producers") return stubQuery(MOCK_PRODUCER);
        if (table === "events") return stubQuery(MOCK_EVENTS);
        return stubQuery([]);
      },
    };

    await fetchAccountPageData("test-slug", client as any);

    expect(queriedTables).not.toContain("bookings");
    expect(queriedTables).toContain("events");
  });

  it("uses explicit column lists for accounts and producers (no select *)", async () => {
    const selects: { table: string; cols: string }[] = [];

    const client = {
      from(table: string) {
        const rowData =
          table === "accounts"
            ? MOCK_ACCOUNT
            : table === "producers"
              ? MOCK_PRODUCER
              : MOCK_EVENTS;

        const q: Record<string, unknown> = {};
        const chain = () => q;
        q.select = (cols: string) => {
          selects.push({ table, cols });
          return q;
        };
        q.eq = chain;
        q.is = chain;
        q.order = chain;
        q.maybeSingle = () => Promise.resolve({ data: rowData, error: null });
        q.then = (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: rowData, error: null }).then(resolve);
        return q;
      },
    };

    await fetchAccountPageData("test-slug", client as any);

    const accountCols = selects.find((s) => s.table === "accounts")?.cols ?? "";
    const producerCols = selects.find((s) => s.table === "producers")?.cols ?? "";

    expect(accountCols).not.toMatch(/\*/);
    expect(producerCols).not.toMatch(/\*/);
    expect(accountCols).toBe(ACCOUNTS_FETCH_COLUMNS);
    expect(producerCols).toBe(PRODUCERS_FETCH_COLUMNS);
    expect(accountCols).toContain("slug");
    expect(accountCols).toContain("account_name");
    expect(producerCols).toContain("id");
    expect(producerCols).toContain("event_window_days");

    const eventCols = selects.find((s) => s.table === "events")?.cols ?? "";
    expect(eventCols).not.toMatch(/^\*/);
    expect(eventCols).toBe(EXPECTED_EVENTS_SELECT);
    expect(eventCols).toContain("bookings(id");
    expect(eventCols).toContain("id");
    expect(eventCols).toContain("signup_opens_at");
  });

  it("starts accounts and producers before either resolves", async () => {
    const started: string[] = [];
    const resolvers: Record<string, () => void> = {};

    const client = {
      from(table: string) {
        started.push(table);

        let resolve!: () => void;
        const gate = new Promise<void>((r) => {
          resolve = r;
        });

        if (table === "accounts" || table === "producers") {
          resolvers[table] = resolve;
        } else {
          resolve();
        }

        const rowData =
          table === "accounts"
            ? MOCK_ACCOUNT
            : table === "producers"
              ? MOCK_PRODUCER
              : [];

        const q: Record<string, unknown> = {};
        const chain = () => q;
        q.select = () => q;
        q.eq = chain;
        q.is = chain;
        q.order = chain;
        q.maybeSingle = () => gate.then(() => ({ data: rowData, error: null }));
        q.then = (res: (v: unknown) => unknown) =>
          gate.then(() => ({ data: rowData, error: null })).then(res);
        return q;
      },
    };

    const fetchPromise = fetchAccountPageData("test-slug", client as any).catch(() => {});

    await Promise.resolve();
    await Promise.resolve();

    expect(started).toContain("accounts");
    expect(started).toContain("producers");

    resolvers["accounts"]?.();
    resolvers["producers"]?.();
    await fetchPromise;
  });
});
