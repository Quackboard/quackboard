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
import { Loader2, Mail, Lock } from 'lucide-react';

const signupSchema = z.object({
  accessCode: z.string().min(1, 'Access code is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [confirmationState, setConfirmationState] = useState<null | 'password' | 'magiclink'>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { accessCode: '', email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const validateAccessCode = async (code: string): Promise<boolean> => {
    const { data: isValid, error } = await supabase.rpc('validate_beta_code', { code_input: code });
    if (error) throw new Error('Failed to validate access code');
    if (!isValid) {
      toast({
        title: 'Invalid access code',
        description: 'Please check your code and try again.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const onSubmitPassword = async (data: SignupFormData) => {
    setIsSubmitting(true);
    try {
      if (!(await validateAccessCode(data.accessCode))) {
        setIsSubmitting(false);
        return;
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.status === 429) {
          toast({ title: 'Too many attempts', description: 'Try again later.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
        return;
      }

      // Detect duplicate email (Supabase returns fake user with empty identities)
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        toast({
          title: 'Account already exists',
          description: 'An account with this email already exists. Try signing in.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      setConfirmationState('password');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSendMagicLink = async () => {
    // Only validate accessCode and email for magic link
    const accessCode = form.getValues('accessCode');
    const email = form.getValues('email');

    if (!accessCode) {
      form.setError('accessCode', { message: 'Access code is required' });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      form.setError('email', { message: 'Enter a valid email' });
      return;
    }

    setIsSendingMagicLink(true);
    try {
      if (!(await validateAccessCode(accessCode))) {
        setIsSendingMagicLink(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.status === 429) {
          toast({ title: 'Too many attempts', description: 'Try again later.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        setIsSendingMagicLink(false);
        return;
      }

      setConfirmationState('magiclink');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsSendingMagicLink(false);
    }
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
          <Link to="/" className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
            <img src="/favicon.png" alt="Quackboard" className="h-8 w-8" />
            <span className="text-2xl font-bold font-outfit text-foreground">Quackboard</span>
          </Link>
          <h2 className="text-2xl font-semibold text-foreground">Create your account</h2>
          <p className="text-muted-foreground mt-2">
            Start managing your open mics in minutes
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Lock className="h-3 w-3" />
            Beta Access Required
          </div>
        </div>

        {confirmationState ? (
          <div className="text-center p-6 border border-border rounded-lg bg-muted/50">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium text-foreground">Check your email</h2>
            <p className="text-muted-foreground mt-2">
              {confirmationState === 'password'
                ? 'We sent a confirmation link to your email. Click it to activate your account.'
                : 'We sent a signup link to your email address.'}
            </p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setConfirmationState(null)}
            >
              Try again
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={form.handleSubmit(onSubmitPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Enter your beta access code"
                  {...form.register('accessCode')}
                  className={form.formState.errors.accessCode ? 'border-destructive' : ''}
                />
                {form.formState.errors.accessCode && (
                  <p className="text-sm text-destructive">{form.formState.errors.accessCode.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Don't have a code?{' '}
                  <a
                    href="mailto:hello@quackboard.com?subject=Quackboard Beta Access Request"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline"
                  >
                    Request access
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...form.register('email')}
                  className={form.formState.errors.email ? 'border-destructive' : ''}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  {...form.register('password')}
                  className={form.formState.errors.password ? 'border-destructive' : ''}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  {...form.register('confirmPassword')}
                  className={form.formState.errors.confirmPassword ? 'border-destructive' : ''}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || isSendingMagicLink}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isSubmitting || isSendingMagicLink}
              onClick={onSendMagicLink}
            >
              {isSendingMagicLink ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send magic link'
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              By signing up, you agree to our{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms of Service</a>{' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>
          </>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
