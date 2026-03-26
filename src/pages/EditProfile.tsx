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
import { Textarea } from '@/components/ui/textarea';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { toast } from 'sonner';
import { Plus, Check, X, Edit, Trash, ExternalLink, Loader2, ArrowLeft } from 'lucide-react';

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const editProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().email().optional(),
  venue_name: z.string().trim().max(200).optional(),
  venue_address: z.string().trim().max(500).optional(),
  instagram: z.string().trim().max(50).optional(),
  bio_markdown: z.string().max(2000).optional(),
  social_links: z.array(z.object({
    id: z.string(),
    url: z.string().url('Please enter a valid URL (e.g., https://example.com)'),
  })).optional(),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

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
      bio_markdown: '',
      social_links: [],
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  const [socialLinks, setSocialLinks] = useState<Array<{ id: string; url: string; editing: boolean; error?: string }>>([]);
  const [newSocialLink, setNewSocialLink] = useState('');
  const [newSocialLinkError, setNewSocialLinkError] = useState<string>('');
  const [showNewSocialLinkInput, setShowNewSocialLinkInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch producer data on mount
  useEffect(() => {
    const fetchProducerData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('producers')
          .select('name, email, venue_name, venue_address, instagram, bio_markdown, social_links')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          reset({
            name: data.name || '',
            email: data.email || '',
            venue_name: data.venue_name || '',
            venue_address: data.venue_address || '',
            instagram: data.instagram || '',
            bio_markdown: data.bio_markdown || '',
          });

          if (data.social_links) {
            setSocialLinks(
              Object.entries(data.social_links).map(([key, value]) => ({
                id: key,
                url: value as string,
                editing: false,
              }))
            );
          }
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

  const handleAddSocialLink = () => {
    const trimmedUrl = newSocialLink.trim();
    if (!trimmedUrl) {
      setNewSocialLinkError('Please enter a URL');
      return;
    }
    if (!isValidUrl(trimmedUrl)) {
      setNewSocialLinkError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }
    setSocialLinks((prev) => [
      ...prev,
      { id: String(Date.now()), url: trimmedUrl, editing: false },
    ]);
    setNewSocialLink('');
    setNewSocialLinkError('');
    setShowNewSocialLinkInput(false);
  };

  const handleEditSocialLink = (id: string) => {
    setSocialLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, editing: true, error: undefined } : link))
    );
  };

  const handleSaveSocialLink = (id: string) => {
    setSocialLinks((prev) =>
      prev.map((link) => {
        if (link.id === id) {
          const trimmedUrl = link.url.trim();
          if (!trimmedUrl) {
            return { ...link, editing: true, error: 'Please enter a URL' };
          }
          if (!isValidUrl(trimmedUrl)) {
            return { ...link, editing: true, error: 'Please enter a valid URL (e.g., https://example.com)' };
          }
          return { ...link, url: trimmedUrl, editing: false, error: undefined };
        }
        return link;
      })
    );
  };

  const handleDeleteSocialLink = (id: string) => {
    setSocialLinks((prev) => prev.filter((link) => link.id !== id));
  };


  const onSubmit = async (data: EditProfileFormData) => {
    if (!user) {
      toast.error('You must be logged in to edit your profile.');
      return;
    }

    // Validate all social links before submitting
    const invalidLinks = socialLinks.filter(link => !isValidUrl(link.url.trim()));
    if (invalidLinks.length > 0) {
      // Set errors for invalid links
      setSocialLinks((prev) =>
        prev.map((link) => {
          if (!isValidUrl(link.url.trim())) {
            return { ...link, editing: true, error: 'Please enter a valid URL (e.g., https://example.com)' };
          }
          return link;
        })
      );
      toast.error('Please fix invalid social links before saving.');
      return;
    }

    try {
      const updates: { [key: string]: any } = {
        name: data.name,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        instagram: data.instagram,
        bio_markdown: data.bio_markdown,
        social_links: socialLinks.reduce((acc, link) => {
          acc[link.id] = link.url;
          return acc;
        }, {}),
        updated_at: new Date().toISOString(),
      };

      console.log('Updates being sent to Supabase:', updates);
      console.log('Social Links array state:', socialLinks);

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
          <h1 className="text-2xl font-semibold text-foreground">Edit Profile</h1>
        </div>
        <p className="text-muted-foreground mt-2">Update your public producer information.</p>
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
          <Label htmlFor="instagram">
            Instagram
          </Label>
          <Input
            id="instagram"
            type="text"
            placeholder="@yourhandle"
            {...register('instagram')}
            className={errors.instagram ? 'border-destructive' : ''}
          />
          {errors.instagram && (
            <p className="text-sm text-destructive">{errors.instagram.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio_markdown">
            Bio <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Controller
            name="bio_markdown"
            control={control}
            render={({ field }) => (
              <MarkdownEditor
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="Tell us about yourself..."
                showLink={false}
              />
            )}
          />
          {errors.bio_markdown && (
            <p className="text-sm text-destructive">{errors.bio_markdown.message}</p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Social Links</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowNewSocialLinkInput(true)}
              disabled={showNewSocialLinkInput}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {socialLinks.map((link) => (
              <div key={link.id} className="space-y-1">
                <div className="flex items-center space-x-2">
                  {link.editing ? (
                    <Input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newUrl = e.target.value;
                        setSocialLinks((prev) =>
                          prev.map((l) => {
                            if (l.id === link.id) {
                              const trimmed = newUrl.trim();
                              let error: string | undefined = undefined;
                              if (trimmed && !isValidUrl(trimmed)) {
                                error = 'Please enter a valid URL (e.g., https://example.com)';
                              }
                              return { ...l, url: newUrl, error };
                            }
                            return l;
                          })
                        );
                      }}
                      onBlur={() => {
                        setSocialLinks((prev) =>
                          prev.map((l) => {
                            if (l.id === link.id) {
                              const trimmed = l.url.trim();
                              let error: string | undefined = undefined;
                              if (!trimmed) {
                                error = 'Please enter a URL';
                              } else if (!isValidUrl(trimmed)) {
                                error = 'Please enter a valid URL (e.g., https://example.com)';
                              }
                              return { ...l, error };
                            }
                            return l;
                          })
                        );
                      }}
                      className={`flex-grow ${link.error ? 'border-destructive' : ''}`}
                      placeholder="https://example.com"
                    />
                  ) : (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-grow text-blue-600 hover:underline truncate whitespace-nowrap"
                    >
                      {link.url}
                    </a>
                  )}
                  {link.editing ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSaveSocialLink(link.id)}
                      disabled={!isValidUrl(link.url.trim())}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditSocialLink(link.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSocialLink(link.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                  {!link.editing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {link.editing && link.error && (
                  <p className="text-sm text-destructive mt-1">{link.error}</p>
                )}
              </div>
            ))}
            {showNewSocialLinkInput && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Input
                    type="url"
                    value={newSocialLink}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setNewSocialLink(newUrl);
                      // Clear error when user starts typing
                      if (newSocialLinkError) {
                        setNewSocialLinkError('');
                      }
                    }}
                    onBlur={() => {
                      const trimmed = newSocialLink.trim();
                      if (!trimmed) {
                        setNewSocialLinkError('Please enter a URL');
                      } else if (!isValidUrl(trimmed)) {
                        setNewSocialLinkError('Please enter a valid URL (e.g., https://example.com)');
                      } else {
                        setNewSocialLinkError('');
                      }
                    }}
                    placeholder="https://yourlink.com"
                    className={`flex-grow ${newSocialLinkError ? 'border-destructive' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleAddSocialLink}
                    disabled={!isValidUrl(newSocialLink.trim())}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setNewSocialLink('');
                      setNewSocialLinkError('');
                      setShowNewSocialLinkInput(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {newSocialLinkError && (
                  <p className="text-sm text-destructive mt-1">{newSocialLinkError}</p>
                )}
              </div>
            )}
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}