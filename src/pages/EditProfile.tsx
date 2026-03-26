import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const editProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().email().optional(),
  venue_name: z.string().trim().max(200).optional(),
  venue_address: z.string().trim().max(500).optional(),
  instagram: z.string().trim().max(50).optional(),
  website: z.string().trim().max(500).optional(),
  bio_markdown: z.string().max(2000).optional(),
  event_window_days: z.coerce.number().refine(v => [7, 14, 30].includes(v), { message: 'Must be 7, 14, or 30' }),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

// Extract handle from stored instagram value (could be full URL or just handle)
function extractInstagramHandle(value: string): string {
  if (!value) return '';
  // If it's a full URL like instagram.com/handle or https://instagram.com/handle
  const match = value.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/);
  if (match) return match[1];
  // Otherwise treat as raw handle, strip @ if present
  return value.replace(/^@/, '');
}

// Convert handle to stored format
function handleToInstagramUrl(handle: string): string {
  if (!handle) return '';
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return '';
  return `instagram.com/${clean}`;
}

export function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: '',
      email: '',
      venue_name: '',
      venue_address: '',
      instagram: '',
      website: '',
      bio_markdown: '',
      event_window_days: 7,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducerData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('producers')
          .select('name, email, venue_name, venue_address, instagram, website, bio_markdown, event_window_days')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          reset({
            name: data.name || '',
            email: data.email || '',
            venue_name: data.venue_name || '',
            venue_address: data.venue_address || '',
            instagram: extractInstagramHandle(data.instagram || ''),
            website: data.website || '',
            bio_markdown: data.bio_markdown || '',
            event_window_days: data.event_window_days ?? 7,
          });
        }
      } catch (error: any) {
        toast.error(`Error loading profile: ${error.message}`);
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducerData();
  }, [user?.id, reset]);

  const onSubmit = async (data: EditProfileFormData) => {
    if (!user) {
      toast.error('You must be logged in to edit your profile.');
      return;
    }

    try {
      const updates: { [key: string]: any } = {
        name: data.name,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        instagram: handleToInstagramUrl(data.instagram || ''),
        website: data.website || null,
        bio_markdown: data.bio_markdown,
        event_window_days: data.event_window_days,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('producers')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Profile updated successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(`Error updating profile: ${error.message}`);
      console.error('Error updating profile:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-xl">
      <div className="text-center mb-8">
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Edit Public Page</h1>
        </div>
        <p className="text-muted-foreground mt-2">Update your public page and manage page settings.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Mic Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Your mic name"
            {...register('name')}
            className={errors.name ? 'border-destructive' : ''}
          />
          <p className="text-xs text-muted-foreground">This will be the title of your public page</p>
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            {...register('email')}
            disabled
            className="bg-muted cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue_name">Venue Name</Label>
          <Input
            id="venue_name"
            type="text"
            placeholder="Your Venue Name"
            {...register('venue_name')}
            className={errors.venue_name ? 'border-destructive' : ''}
          />
          {errors.venue_name && (
            <p className="text-sm text-destructive">{errors.venue_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue_address">Venue Address</Label>
          <Input
            id="venue_address"
            type="text"
            placeholder="123 Main St, City, State"
            {...register('venue_address')}
            className={errors.venue_address ? 'border-destructive' : ''}
          />
          {errors.venue_address && (
            <p className="text-sm text-destructive">{errors.venue_address.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <div className="flex items-center gap-0 rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-input whitespace-nowrap">
              instagram.com/
            </span>
            <Input
              id="instagram"
              type="text"
              placeholder="yourhandle"
              {...register('instagram')}
              className={`border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${errors.instagram ? 'text-destructive' : ''}`}
            />
          </div>
          {errors.instagram && (
            <p className="text-sm text-destructive">{errors.instagram.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="text"
            placeholder="https://yourwebsite.com"
            {...register('website')}
            className={errors.website ? 'border-destructive' : ''}
          />
          {errors.website && (
            <p className="text-sm text-destructive">{errors.website.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio_markdown">Display Text for Public Page</Label>
          <Controller
            name="bio_markdown"
            control={control}
            render={({ field }) => (
              <MarkdownEditor
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="Tell us about yourself..."
                showLink={true}
              />
            )}
          />
          {errors.bio_markdown && (
            <p className="text-sm text-destructive">{errors.bio_markdown.message}</p>
          )}
        </div>
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-lg font-semibold text-foreground">Page Settings</h2>
          <div className="space-y-2">
            <Label htmlFor="event_window_days">Show events for the next</Label>
            <Controller
              name="event_window_days"
              control={control}
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger id="event_window_days">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}
