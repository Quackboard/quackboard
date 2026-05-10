import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { useAdminAccounts, AdminAccountRow } from '@/hooks/useAdminAccounts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type SortKey = 'account_name' | 'created_at' | 'last_activity' | 'total_events';
type SortDir = 'asc' | 'desc';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

export default function AdminAccounts() {
  const { data, isLoading, isError, error } = useAdminAccounts();
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    if (!data) return [];
    const rows = [...data];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'account_name' ? 'asc' : 'desc');
    }
  };

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <TableHead>
      <Button variant="ghost" size="sm" className="-ml-3 h-8 px-2" onClick={() => toggleSort(k)}>
        {label}
        {sortKey === k && (sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />)}
      </Button>
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Admin · Accounts</h1>
        <Card>
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {isError && (
            <div className="p-6 text-sm text-destructive">
              Failed to load accounts: {(error as Error)?.message ?? 'unknown error'}
            </div>
          )}
          {!isLoading && !isError && sorted.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No accounts yet.</div>
          )}
          {!isLoading && !isError && sorted.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader k="account_name" label="Account name" />
                  <SortHeader k="created_at" label="Date created" />
                  <SortHeader k="last_activity" label="Last activity" />
                  <SortHeader k="total_events" label="Total events" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row: AdminAccountRow) => (
                  <TableRow key={row.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link to={`/admin/accounts/${row.id}`} className="block w-full">
                        {row.account_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/accounts/${row.id}`} className="block w-full">
                        {fmt(row.created_at)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/accounts/${row.id}`} className="block w-full">
                        {fmt(row.last_activity)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/accounts/${row.id}`} className="block w-full">
                        {row.total_events}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
