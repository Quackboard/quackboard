import { useState, useEffect } from 'react';
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
import { useFormDraft } from '@/hooks/useFormDraft';
import { Loader2 } from 'lucide-react';
import { generateSlug, validateSlug, RESERVED_SLUGS } from '@/lib/slug';

const ONBOARDING_DRAFT_KEY = 'quackboard_onboarding_draft';

const onboardingSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  slug: z.string()
    .min(3, 'Page URL must be at least 3 characters')
    .max(50, 'Page URL must be 50 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Only letters, numbers, and hyphens allowed')
    .refine(val => !/--/.test(val), 'Consecutive hyphens are not allowed')
    .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Cannot start or end with a hyphen')
    .refine(val => !RESERVED_SLUGS.includes(val), 'This URL is reserved. Try another.'),
  venue_name: z.string().trim().min(1, 'Venue name is required').max(200),
  venue_address: z.string().trim().min(1, 'Venue address is required').max(500),
  bio: z.string().max(2000).optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      slug: '',
      venue_name: '',
      venue_address: '',
      bio: '',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const { clearDraft } = useFormDraft({
    form,
    storageKey: ONBOARDING_DRAFT_KEY,
  });

  const nameValue = watch('name');
  const slugValue = watch('slug');

  // Auto-generate slug from name (only if slug hasn't been manually edited)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  
  useEffect(() => {
    if (!slugManuallyEdited && nameValue) {
      const generatedSlug = generateSlug(nameValue);
      setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [nameValue, slugManuallyEdited, setValue]);

  // Check slug availability
  useEffect(() => {
    const checkSlugAvailability = async () => {
      if (!slugValue || slugValue.length < 3) {
        setSlugTaken(false);
        return;
      }

      // Skip validation errors
      const validationError = validateSlug(slugValue);
      if (validationError) {
        setSlugTaken(false);
        return;
      }

      setIsCheckingSlug(true);
      const { data, error } = await supabase
        .from('producers')
        .select('id')
        .eq('slug', slugValue)
        .neq('id', user?.id || '')
        .maybeSingle();

      setIsCheckingSlug(false);
      setSlugTaken(!!data && !error);
    };

    const debounceTimer = setTimeout(checkSlugAvailability, 300);
    return () => clearTimeout(debounceTimer);
  }, [slugValue, user?.id]);

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) return;

    if (slugTaken) {
      toast({
        title: 'Error',
        description: 'This URL is already taken. Try another.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('producers')
      .update({
        name: data.name,
        slug: data.slug,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        bio_markdown: data.bio || null,
      })
      .eq('id', user.id);

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        setSlugTaken(true);
        toast({
          title: 'Error',
          description: 'This URL is already taken. Try another.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error',
        description: 'Failed to save your profile. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    clearDraft();
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
            <Label htmlFor="slug">Your Page URL</Label>
            <div className="flex items-center gap-0 rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-input whitespace-nowrap">
                quackboard.com/producer/
              </span>
              <Input
                id="slug"
                placeholder="your-name"
                {...register('slug', {
                  onChange: () => setSlugManuallyEdited(true),
                })}
                className={`border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${errors.slug || slugTaken ? 'text-destructive' : ''}`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This is what people will see in the link
            </p>
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug.message}</p>
            )}
            {slugTaken && !errors.slug && (
              <p className="text-sm text-destructive">This URL is already taken. Try another.</p>
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

          <Button type="submit" className="w-full" disabled={isSubmitting || slugTaken || isCheckingSlug}>
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
