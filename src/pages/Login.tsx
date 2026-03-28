import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import LogoFull from '@/assets/logo-full.png';

const passwordSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const magicLinkSchema = z.object({
  magicEmail: z.string().trim().email('Enter a valid email'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export default function Login() {
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSubmittingMagicLink, setIsSubmittingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
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
    setIsSubmittingPassword(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setIsSubmittingPassword(false);

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onMagicLinkSubmit = async (data: MagicLinkFormData) => {
    setIsSubmittingMagicLink(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: data.magicEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsSubmittingMagicLink(false);

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

    setMagicLinkSent(true);
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
          <Link to="/" className="inline-block mb-4 hover:opacity-80 transition-opacity" style={{ background: 'transparent' }}>
            <img src={LogoFull} alt="Quackboard" className="h-16 w-auto mx-auto" style={{ background: 'transparent' }} />
          </Link>
          <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
          <p className="text-muted-foreground mt-2">
            Sign in to your account
          </p>
        </div>

        {/* Email & Password */}
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
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
            <Label htmlFor="login-password">Password</Label>
            <PasswordInput
              id="login-password"
              placeholder="••••••••"
              {...passwordForm.register('password')}
              className={passwordForm.formState.errors.password ? 'border-destructive' : ''}
            />
            {passwordForm.formState.errors.password && (
              <p className="text-sm text-destructive">{passwordForm.formState.errors.password.message}</p>
            )}
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmittingPassword}>
            {isSubmittingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Magic Link */}
        {magicLinkSent ? (
          <div className="text-center p-6 border border-border rounded-lg bg-muted/50">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium text-foreground">Check your email</h2>
            <p className="text-muted-foreground mt-2">
              We sent a login link to your email address.
            </p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setMagicLinkSent(false)}
            >
              Try again
            </Button>
          </div>
        ) : (
          <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magic-email">Email</Label>
              <Input
                id="magic-email"
                type="email"
                placeholder="you@example.com"
                {...magicLinkForm.register('magicEmail')}
                className={magicLinkForm.formState.errors.magicEmail ? 'border-destructive' : ''}
              />
              {magicLinkForm.formState.errors.magicEmail && (
                <p className="text-sm text-destructive">{magicLinkForm.formState.errors.magicEmail.message}</p>
              )}
            </div>

            <Button type="submit" variant="outline" className="w-full" disabled={isSubmittingMagicLink}>
              {isSubmittingMagicLink ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send magic link'
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          New to Quackboard?{' '}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
