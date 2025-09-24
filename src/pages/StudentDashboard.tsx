import { useState } from 'react';
import { BuddyLogo } from '@/components/buddy-logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Link,
  Menu,
} from 'lucide-react';
import { SettingsModal } from '@/components/settings-modal';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { StudentAvatar } from '@/components/student-avatar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export function StudentDashboard({
  profile,
  thriveSprite,
  helpRequests,
  connections,
  handleConnectionAdded,
  getUrgencyEmoji,
  getStatusColor,
  handleHelpRequest,
  loading,
  urgency,
  setUrgency,
}: any) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <BuddyLogo size="lg" />
          <div className="hidden md:flex items-center gap-4">
            {/* Histórico */}
            <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative transition-colors duration-200"
                >
                  <ClipboardList className="h-5 w-5" />
                  {helpRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                      {helpRequests.length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>
                    {t('studentDash.historyTitle')} (
                    {helpRequests.length.toString().padStart(2, '0')})
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {helpRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      {t('studentDash.noneYet')}
                    </p>
                  ) : (
                    helpRequests.map((request: any) => (
                      <div
                        key={request.id}
                        className="p-3 bg-background/50 rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span>
                              {getUrgencyEmoji(request.urgency || 'ok')}
                            </span>
                            <Badge
                              variant={getStatusColor(
                                request.status || 'open'
                              )}
                            >
                              {request.status === 'open' && (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  {t('studentDash.status.waiting')}
                                </>
                              )}
                              {request.status === 'answered' && (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('studentDash.status.answered')}
                                </>
                              )}
                              {request.status === 'closed' && (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {t('studentDash.status.closed')}
                                </>
                              )}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              request.created_at
                            ).toLocaleDateString(i18n.language)}
                          </span>
                        </div>
                        {request.message && (
                          <p className="text-sm text-muted-foreground">
                            {request.message}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Conexões */}
            <SettingsModal
              onConnectionAdded={handleConnectionAdded}
              connections={connections}
              trigger={
                <Button variant="ghost" size="icon">
                  <Link className="h-5 w-5 transition-colors duration-200" />
                </Button>
              }
            />

            {/* Idioma */}
            <LanguageToggle
              trigger={
                <Button variant="ghost" size="icon">
                  <span className="font-semibold transition-colors duration-200">
                    {i18n.language.startsWith('pt') ? 'PT' : 'EN'}
                  </span>
                </Button>
              }
            />

            {/* Tema */}
            <ThemeToggle />

            {/* Logout */}
            <Button
              variant="ghost"
              className="hover:bg-purple-600 hover:text-white"
              onClick={async () => {
                await signOut();
                toast({
                  title: t('auth.toast.loggedOut'),
                  description: t('auth.toast.seeYou'),
                });
                navigate('/auth');
              }}
            >
              {t('common.logout')}
            </Button>
          </div>

          {/* Mobile Menu (Dropdown) */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="flex flex-col gap-2 p-2 w-40">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => setHistoryModalOpen(true)}
                >
                  <ClipboardList className="h-4 w-4" />
                  {t('studentDash.historyTitle')}
                </Button>

                <SettingsModal
                  onConnectionAdded={handleConnectionAdded}
                  connections={connections}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Link className="h-4 w-4" />
                      {t('studentDash.connections')}
                    </Button>
                  }
                />

                <LanguageToggle
                  trigger={
                    <Button variant="ghost" size="sm">
                      {i18n.language.startsWith('pt') ? 'PT' : 'EN'}
                    </Button>
                  }
                />

                <ThemeToggle
                  trigger={
                    <Button variant="ghost" size="sm">
                      {t('common.theme')}
                    </Button>
                  }
                />

                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-purple-600 hover:text-white"
                  onClick={async () => {
                    await signOut();
                    toast({
                      title: t('auth.toast.loggedOut'),
                      description: t('auth.toast.seeYou'),
                    });
                    navigate('/auth');
                  }}
                >
                  {t('common.logout')}
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mb-4">
              <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {t('studentDash.hello', { name: profile?.username })}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t('studentDash.feelingToday')}
              </p>
            </div>
          </div>

          {/* Help Request Form */}
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg mb-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mx-auto mb-4">
                <StudentAvatar
                  imageUrl={thriveSprite?.image_url}
                  seed={thriveSprite ? (thriveSprite.options as any)?.seed : undefined}
                  style={thriveSprite ? (thriveSprite.options as any)?.style : undefined}
                  size={120}
                  className="border-4 border-success rounded-full shadow-md shadow-green-500"
                />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {t('studentDash.needHelpTitle')}
              </h2>
              <p className="text-muted-foreground">
                {t('studentDash.caregiversNotified')}
              </p>
            </div>

            <form onSubmit={handleHelpRequest} className="space-y-8">
              <div>
                <div className="flex justify-center items-center gap-12">
                  <button
                    type="button"
                    onClick={() => setUrgency('ok')}
                    className={`emotion-button emotion-happy ${
                      urgency === 'ok' ? 'selected' : ''
                    }`}
                  >
                    😊
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgency('attention')}
                    className={`emotion-button emotion-need ${
                      urgency === 'attention' ? 'selected' : ''
                    }`}
                  >
                    😟
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgency('urgent')}
                    className={`emotion-button emotion-urgent ${
                      urgency === 'urgent' ? 'selected' : ''
                    }`}
                  >
                    😭
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                disabled={loading}
                className="max-w-md mx-auto w-full py-8 text-2xl font-bold flex items-center justify-center 
                  shadow-md hover:shadow-[0_0_16px_rgba(128,90,213,0.5)] 
                  hover:scale-95 active:scale-90 transition-all duration-200"
              >
                {loading ? t('studentDash.sending') : t('studentDash.sendHelp')}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
