import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAdminAccountDetail } from '@/hooks/useAdminAccountDetail';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');
const fmtEventDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString();
};

export default function AdminAccountDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useAdminAccountDetail(id);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to accounts
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
          <Card className="p-6 text-sm text-destructive">
            Failed to load account: {(error as Error)?.message ?? 'unknown error'}
          </Card>
        )}

        {data && !data.account && (
          <Card className="p-6 text-sm text-muted-foreground">Account not found.</Card>
        )}

        {data?.account && (
          <>
            <h1 className="text-3xl font-bold text-foreground">{data.account.account_name}</h1>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">Event Templates</h2>
              <Card>
                {data.templates.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No templates.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Date created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.templates.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.title}</TableCell>
                          <TableCell>{fmtDate(t.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">Events</h2>
              <Card>
                {data.events.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No events.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Date created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.events.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.title}</TableCell>
                          <TableCell>{fmtEventDate(e.date)}</TableCell>
                          <TableCell>{fmtDate(e.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
