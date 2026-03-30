import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CalendarPlus } from 'lucide-react';
import { ProducerLayout } from '@/components/layouts/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function CreateMic() {
  const navigate = useNavigate();

  return (
    <ProducerLayout className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
          className="-ml-2 h-8 w-8"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Create Mic</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className="p-6 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/create/recurringmic')}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <CalendarClock className="h-10 w-10 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Create a Recurring Mic</h2>
            <p className="text-sm text-muted-foreground">
              Schedule a mic that repeats weekly, biweekly, or monthly
            </p>
          </div>
        </Card>

        <Card
          className="p-6 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/create/singlemic')}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <CalendarPlus className="h-10 w-10 text-primary" />
            <h2 className="text-lg font-medium text-foreground">Create a Single Mic</h2>
            <p className="text-sm text-muted-foreground">
              Add a one-time show on a specific date
            </p>
          </div>
        </Card>
      </div>
    </ProducerLayout>
  );
}
