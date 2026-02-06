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
  email: z.string().trim().email('Enter a valid email'),
  accessCode: z.string().min(1, 'Access code is required'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);

    try {
      // First validate the access code
      const { data: isValid, error: codeError } = await supabase
        .rpc('validate_beta_code', { code_input: data.accessCode });

      if (codeError) {
        throw new Error('Failed to validate access code');
      }

      if (!isValid) {
        toast({
          title: 'Invalid access code',
          description: 'Please check your code and try again.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Access code is valid, proceed with signup
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

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
        setIsSubmitting(false);
        return;
      }

      setEmailSent(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Quackboard</h1>
          <h2 className="text-2xl font-semibold text-foreground">Create your account</h2>
          <p className="text-muted-foreground mt-2">
            Start managing your open mics in minutes
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Lock className="h-3 w-3" />
            Beta Access Required
          </div>
        </div>

        {emailSent ? (
          <div className="text-center p-6 border border-border rounded-lg bg-muted/50">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium text-foreground">Check your email</h2>
            <p className="text-muted-foreground mt-2">
              We sent a signup link to your email address.
            </p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setEmailSent(false)}
            >
              Try again
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Get Started'
              )}
            </Button>
          </form>
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
