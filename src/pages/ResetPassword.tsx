import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { toast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setHasRecoverySession(!!data.session);
      setCheckedSession(true);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasRecoverySession(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('auth.toast.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error(t('auth.toast.noRecoverySession'));
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: t('auth.toast.resetSuccessTitle'),
        description: t('auth.toast.resetSuccessDescription'),
      });

      navigate('/auth');
    } catch (error: any) {
      toast({
        title: t('auth.toast.errorTitle'),
        description: error.message || t('auth.toast.genericError'),
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
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="p-8 bg-gradient-card shadow-medium">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                {t('auth.resetTitle')}
              </h1>
              <p className="text-muted-foreground">{t('auth.resetSubtitle')}</p>
            </div>

            {checkedSession && !hasRecoverySession && (
              <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {t('auth.resetHint')}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">{t('auth.newPassword')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="mt-1"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="mt-1"
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" variant="hero" size="lg" disabled={loading || !hasRecoverySession} className="w-full">
                {loading ? t('auth.processing') : t('auth.updatePassword')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-primary hover:underline text-sm"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
