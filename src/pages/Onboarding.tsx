import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProducerLayout } from '@/components/layouts/ProducerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const onboardingSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  venue_name: z.string().trim().min(1, 'Venue name is required').max(200),
  venue_address: z.string().trim().min(1, 'Venue address is required').max(500),
  bio: z.string().max(2000).optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
  });

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from('producers')
      .update({
        name: data.name,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        bio_markdown: data.bio || null,
      })
      .eq('id', user.id);

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your profile. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    navigate('/dashboard');
  };

  return (
    <ProducerLayout className="max-w-md py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Welcome to Quackboard!</h1>
        <p className="text-muted-foreground mt-2">Let's set up your page.</p>
      </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              {...register('name')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue_name">Venue name</Label>
            <Input
              id="venue_name"
              placeholder="The Comedy Club"
              {...register('venue_name')}
              className={errors.venue_name ? 'border-destructive' : ''}
            />
            {errors.venue_name && (
              <p className="text-sm text-destructive">{errors.venue_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue_address">Venue address</Label>
            <Input
              id="venue_address"
              placeholder="123 Main St, City, State"
              {...register('venue_address')}
              className={errors.venue_address ? 'border-destructive' : ''}
            />
            {errors.venue_address && (
              <p className="text-sm text-destructive">{errors.venue_address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">
              Bio <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell comics about yourself and your shows..."
              rows={4}
              {...register('bio')}
              className={errors.bio ? 'border-destructive' : ''}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue to Dashboard'
            )}
          </Button>
        </form>
    </ProducerLayout>
  );
}
