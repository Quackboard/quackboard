import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProducerLayout } from '@/components/layouts/ProducerLayout';

interface Section {
  label: string;
  slots: number;
}

function parseSections(config: unknown): Section[] {
  if (Array.isArray(config)) {
    return config.filter(
      (item): item is Section =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.label === 'string' &&
        typeof item.slots === 'number'
    );
  }
  return [];
}

export default function DuplicateMic() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const duplicateEvent = async () => {
      if (!id || !user) {
        toast({
          title: 'Error',
          description: 'Event not found',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      try {
        // Fetch original event
        const { data: original, error: fetchError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .eq('producer_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!original) {
          toast({
            title: 'Error',
            description: 'Event not found',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }

        // Handle series_id logic
        let seriesId = original.series_id;
        
        if (!seriesId) {
          // Generate new UUID for series_id
          seriesId = crypto.randomUUID();
          
          // Update original event with new series_id
          const { error: updateError } = await supabase
            .from('events')
            .update({ series_id: seriesId })
            .eq('id', id);
          
          if (updateError) throw updateError;
        }

        // Create new event with copied fields
        const sectionsConfig = parseSections(original.sections_config);
        
        const newEvent = {
          producer_id: user.id,
          title: original.title,
          description: original.description,
          venue_name: original.venue_name,
          venue_address: original.venue_address,
          date: original.date, // Keep same date initially
          start_time: original.start_time,
          end_time: original.end_time,
          sections_config: sectionsConfig,
          allow_multiple_slots: original.allow_multiple_slots,
          status: 'draft' as const,
          series_id: seriesId,
          // Since date is unchanged from original, copy publish_at and signup_opens_at
          publish_at: original.publish_at,
          signup_opens_at: original.signup_opens_at,
        };

        const { data: created, error: createError } = await supabase
          .from('events')
          .insert(newEvent)
          .select('id')
          .single();

        if (createError) throw createError;

        // Pre-save form data to localStorage for the edit page
        const draftKey = `quackboard_edit_mic_${created.id}_draft`;
        const draftData = {
          date: { __type: 'Date', value: new Date(original.date + 'T00:00:00').toISOString() },
          startTime: original.start_time?.slice(0, 5) || '',
          endTime: original.end_time?.slice(0, 5) || '',
          title: original.title || '',
          venueName: original.venue_name,
          venueAddress: original.venue_address,
          sections: sectionsConfig.length > 0 ? sectionsConfig : [{ label: '', slots: 10 }],
          publishOption: original.publish_at ? 'later' : 'now',
          publishAt: original.publish_at ? { __type: 'Date', value: original.publish_at } : undefined,
          publishAtTime: original.publish_at ? new Date(original.publish_at).toISOString().slice(11, 16) : undefined,
          signupOption: original.signup_opens_at ? 'later' : 'live',
          signupOpensAt: original.signup_opens_at ? { __type: 'Date', value: original.signup_opens_at } : undefined,
          signupOpensAtTime: original.signup_opens_at ? new Date(original.signup_opens_at).toISOString().slice(11, 16) : undefined,
        };
        
        localStorage.setItem(draftKey, JSON.stringify(draftData));

        // Show success toast with 4 second duration
        toast({
          title: 'Mic duplicated!',
          description: 'Update the date and times, then save.',
          duration: 4000,
        });

        // Redirect to edit page
        navigate(`/events/${created.id}/edit`);
      } catch (error: any) {
        console.error('Duplicate error:', error);
        toast({
          title: 'Error',
          description: 'Failed to duplicate mic',
          variant: 'destructive',
        });
        navigate('/dashboard');
      } finally {
        setIsProcessing(false);
      }
    };

    duplicateEvent();
  }, [id, user, navigate, toast]);

  return (
    <ProducerLayout className="max-w-xl">
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Duplicating mic...</p>
      </div>
    </ProducerLayout>
  );
}
