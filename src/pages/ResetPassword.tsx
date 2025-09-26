import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    let active = true;

    const sanitizeUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.hash = '';
      window.history.replaceState({}, document.title, url.pathname + url.search);
    };

    const initRecoverySession = async () => {
      try {
        let session = null;
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            toast({
              title: 'Error',
              description: error.message || 'An unexpected error occurred. Please try again.',
              variant: 'destructive',
            });
          }
          session = data?.session ?? null;
          sanitizeUrl();
        } else if (window.location.hash.includes('type=recovery')) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              toast({
                title: 'Error',
                description: error.message || 'An unexpected error occurred. Please try again.',
                variant: 'destructive',
              });
            }

            session = data?.session ?? null;
            sanitizeUrl();
          }
        } else {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        }

        if (!active) return;
        setHasRecoverySession(!!session);
      } finally {
        if (active) {
          setCheckedSession(true);
        }
      }
    };

    initRecoverySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setHasRecoverySession(!!session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error('No recovery session found. Please request a new password reset.');
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: 'Password updated successfully!',
        description: 'You can now log in with your new password.',
      });

      navigate('/auth');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <BuddyLogo size="lg" />
          <div className="flex gap-2">
            <ThemeToggle />
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="p-8 bg-gradient-card shadow-medium">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                Reset Password
              </h1>
              <p className="text-muted-foreground">Enter your new password below</p>
            </div>

            {checkedSession && !hasRecoverySession && (
              <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                No recovery session found. Please click the reset link from your email or request a new password reset.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1"
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" variant="hero" size="lg" disabled={loading || !hasRecoverySession} className="w-full">
                {loading ? 'Processing...' : 'Update Password'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-primary hover:underline text-sm"
              >
                Back to login
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}