import { BuddyLogo } from "@/components/buddy-logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, CheckCircle, XCircle, Menu } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import SettingsModal from "@/components/settings-modal";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { signOut } from "@/lib/auth"; // ajuste para o caminho certo
import { useTranslation } from "react-i18next";

interface HeaderProps {
  helpRequests: any[];
  connections: any[];
  historyModalOpen: boolean;
  setHistoryModalOpen: (open: boolean) => void;
  getUrgencyEmoji: (urgency: string) => string;
  getStatusColor: (status: string) => string;
  handleConnectionAdded: () => void;
  i18n: any;
}

export function Header({
  helpRequests,
  connections,
  historyModalOpen,
  setHistoryModalOpen,
  getUrgencyEmoji,
  getStatusColor,
  handleConnectionAdded,
  i18n,
}: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center mb-8">
      <BuddyLogo size="lg" />

      <div className="flex items-center gap-4">
        {/* DESKTOP */}
        <div className="hidden md:flex items-center gap-4">
          {/* Histórico */}
          <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="relative transition-colors duration-200">
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
                  {t("studentDash.historyTitle")} (
                  {helpRequests.length.toString().padStart(2, "0")})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {helpRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {t("studentDash.noneYet")}
                  </p>
                ) : (
                  helpRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 bg-background/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{getUrgencyEmoji(request.urgency || "ok")}</span>
                          <Badge variant={getStatusColor(request.status || "open")}>
                            {request.status === "open" && (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                {t("studentDash.status.waiting")}
                              </>
                            )}
                            {request.status === "answered" && (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t("studentDash.status.answered")}
                              </>
                            )}
                            {request.status === "closed" && (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                {t("studentDash.status.closed")}
                              </>
                            )}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString(i18n.language)}
                        </span>
                      </div>
                      {request.message && (
                        <p className="text-sm text-muted-foreground">{request.message}</p>
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
          />

          {/* Idioma */}
          <LanguageToggle />

          {/* Tema */}
          <ThemeToggle />

          {/* Logout */}
          <Button
            variant="ghost"
            className="transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
            onClick={async () => {
              await signOut();
              toast({
                title: t("auth.toast.loggedOut"),
                description: t("auth.toast.seeYou"),
              });
              navigate("/auth");
            }}
          >
            {t("common.logout")}
          </Button>
        </div>

        {/* MOBILE */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-4 flex flex-col gap-4">
              {/* Histórico */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative transition-colors duration-200">
                    <ClipboardList className="h-5 w-5" />
                    {helpRequests.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                        {helpRequests.length}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
              </Dialog>

              {/* Conexões */}
              <SettingsModal
                onConnectionAdded={handleConnectionAdded}
                connections={connections}
              />

              {/* Idioma */}
              <LanguageToggle />

              {/* Tema */}
              <ThemeToggle />

              {/* Logout */}
              <Button
                variant="ghost"
                className="transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
                onClick={async () => {
                  await signOut();
                  toast({
                    title: t("auth.toast.loggedOut"),
                    description: t("auth.toast.seeYou"),
                  });
                  navigate("/auth");
                }}
              >
                {t("common.logout")}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
