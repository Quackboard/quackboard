import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function Signup() {
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmationState, setConfirmationState] = useState<null | 'password' | 'magiclink'>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!accessCode.trim()) newErrors.accessCode = 'Access code is required';
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Enter a valid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGetStarted = async () => {
    if (!validateStep1()) return;
    setIsValidating(true);
    try {
      const { data: isValid, error } = await supabase.rpc('validate_beta_code', { code_input: accessCode });
      if (error) throw new Error('Failed to validate access code');
      if (!isValid) {
        toast({ title: 'Invalid access code', description: 'Please check your code and try again.', variant: 'destructive' });
        setIsValidating(false);
        return;
      }
      setErrors({});
      setPassword('');
      setConfirmPassword('');
      setDialogOpen(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!validateStep2()) return;
    setIsSubmitting(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        if (error.status === 429) {
          toast({ title: 'Too many attempts', description: 'Try again later.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        return;
      }
      if (signUpData.user?.identities?.length === 0) {
        toast({ title: 'Account already exists', description: 'An account with this email already exists. Try signing in.', variant: 'destructive' });
        navigate('/login');
        return;
      }
      setConfirmationState('password');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMagicLink = async () => {
    setIsSendingMagicLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        if (error.status === 429) {
          toast({ title: 'Too many attempts', description: 'Try again later.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        return;
      }
      setConfirmationState('magiclink');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleDialogClose = () => {
    if (confirmationState) {
      setConfirmationState(null);
    }
    setDialogOpen(false);
    setPassword('');
    setConfirmPassword('');
    setErrors({});
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
          <p className="text-muted-foreground mt-2">Start managing your open mics in minutes</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Lock className="h-3 w-3" />
            Beta Access Required
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessCode">Access Code</Label>
            <Input
              id="accessCode"
              type="text"
              placeholder="Enter your beta access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className={errors.accessCode ? 'border-destructive' : ''}
            />
            {errors.accessCode && <p className="text-sm text-destructive">{errors.accessCode}</p>}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <Button className="w-full" onClick={handleGetStarted} disabled={isValidating}>
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By signing up, you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms of Service</a>{' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>.
        </p>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="sm:max-w-sm">
          {confirmationState ? (
            <>
              <DialogHeader>
                <div className="flex justify-center mb-2">
                  <Mail className="h-12 w-12 text-muted-foreground" />
                </div>
                <DialogTitle className="text-center">Check your email</DialogTitle>
                <DialogDescription className="text-center">
                  {confirmationState === 'password'
                    ? 'We sent a confirmation link to your email. Click it to activate your account.'
                    : 'We sent a signup link to your email address.'}
                </DialogDescription>
              </DialogHeader>
              <Button variant="ghost" className="w-full mt-2" onClick={handleDialogClose}>
                Try again
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Set your password</DialogTitle>
                <DialogDescription>Choose a password for {email}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dialog-password">Password</Label>
                  <Input
                    id="dialog-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dialog-confirm">Confirm Password</Label>
                  <Input
                    id="dialog-confirm"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={errors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                <Button className="w-full" onClick={handleCreateAccount} disabled={isSubmitting || isSendingMagicLink}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendMagicLink}
                disabled={isSubmitting || isSendingMagicLink}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
