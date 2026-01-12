import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import logoVertical from '@/assets/logo-vertical.png';

const passwordSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const magicLinkSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [authMethod, setAuthMethod] = useState<'password' | 'magic-link'>('password');
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const magicLinkForm = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  });

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    navigate('/dashboard');
  };

  const onMagicLinkSubmit = async (data: MagicLinkFormData) => {
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsSubmitting(false);

    if (error) {
      if (error.status === 429) {
        toast({
          title: 'Too many attempts',
          description: 'Try again later.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    setEmailSent(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img 
            src={logoVertical} 
            alt="Quackboard" 
            className="h-24 mx-auto mb-6"
          />
          <h1 className="text-2xl font-semibold text-foreground">Log in to Quackboard</h1>
          <p className="text-muted-foreground mt-2">
            {authMethod === 'password' ? 'Enter your credentials' : "We'll send you a magic link"}
          </p>
        </div>

        {emailSent ? (
          <div className="text-center p-6 border border-border rounded-lg bg-muted/50">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium text-foreground">Check your email</h2>
            <p className="text-muted-foreground mt-2">
              We sent a login link to your email address.
            </p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setEmailSent(false)}
            >
              Try another method
            </Button>
          </div>
        ) : authMethod === 'password' ? (
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...passwordForm.register('email')}
                className={passwordForm.formState.errors.email ? 'border-destructive' : ''}
              />
              {passwordForm.formState.errors.email && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...passwordForm.register('password')}
                className={passwordForm.formState.errors.password ? 'border-destructive' : ''}
              />
              {passwordForm.formState.errors.password && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setAuthMethod('magic-link')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Use Magic Link Instead
            </Button>
          </form>
        ) : (
          <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magic-email">Email</Label>
              <Input
                id="magic-email"
                type="email"
                placeholder="you@example.com"
                {...magicLinkForm.register('email')}
                className={magicLinkForm.formState.errors.email ? 'border-destructive' : ''}
              />
              {magicLinkForm.formState.errors.email && (
                <p className="text-sm text-destructive">{magicLinkForm.formState.errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Magic Link'
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setAuthMethod('password')}
            >
              Use Password Instead
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-foreground hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
