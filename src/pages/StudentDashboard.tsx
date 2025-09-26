import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { StudentAvatar } from '@/components/student-avatar';
import { SettingsModal } from '@/components/settings-modal';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Menu, ClipboardList, Clock, CheckCircle, XCircle, Link, LogOut } from "lucide-react";

import { Database } from '@/integrations/supabase/types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type HelpRequest = Database['public']['Tables']['help_requests']['Row'];
type Connection = Database['public']['Tables']['connections']['Row'] & {
  caregiver_profile: {
    username: string;
    role: string;
  };
};

export default function StudentDashboard() {
  const { t, i18n } = useTranslation();
  const { user, profile, thriveSprite, signOut } = useAuth();
  const navigate = useNavigate();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingEmoji, setLoadingEmoji] = useState<"ok" | "attention" | "urgent" | null>(null);
  const [urgency, setUrgency] = useState<"ok" | "attention" | "urgent" | null>(null);

  const fetchHelpRequests = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("help_requests")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) setHelpRequests(data || []);
  };

  useEffect(() => {
    fetchHelpRequests();
  }, [user?.id]);

  const handleHelpRequest = async (choice: "ok" | "attention" | "urgent") => {
    if (!user) return;

    setUrgency(choice);
    setLoadingEmoji(choice);

    try {
      const { error } = await supabase.from("help_requests").insert({
        student_id: user.id,
        urgency: choice,
      });

      if (error) throw error;

      toast({
        title: t("studentDash.sentTitle"),
        description: t("studentDash.sentDesc"),
        duration: 3000,
        variant: "student",
      });

      fetchHelpRequests();

      // animação de pulso rápida após o envio
      setTimeout(() => {
        setLoadingEmoji(null);
      }, 800);
    } catch (error) {
      toast({
        title: t("auth.toast.errorTitle"),
        description: t("studentDash.sendError"),
        variant: "destructive",
        duration: 3000,
      });
      setLoadingEmoji(null);
    }
  };

  const EmojiButton = ({
    type,
    emoji,
  }: {
    type: "ok" | "attention" | "urgent";
    emoji: string;
  }) => (
    <button
      type="button"
      onClick={() => handleHelpRequest(type)}
      disabled={!!loadingEmoji}
      className={`
        relative flex items-center justify-center
        w-20 h-20 sm:w-24 sm:h-24 rounded-full transition-all
        ${urgency && urgency !== type ? "opacity-40 grayscale" : ""}
        ${loadingEmoji === type ? "animate-pulse scale-105" : ""}
      `}
    >
      <span className="text-5xl sm:text-6xl">{emoji}</span>

      {/* loading circular */}
      {loadingEmoji === type && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-full h-full animate-spin text-purple-500"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="62.8 188.4"
            />
          </svg>
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <BuddyLogo size="lg" />
          <ThemeToggle />
          <LanguageToggle />
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="p-8 sm:p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg mb-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mx-auto mb-4">
                <StudentAvatar
                  imageUrl={thriveSprite?.image_url}
                  seed={thriveSprite ? (thriveSprite.options as any)?.seed : undefined}
                  style={thriveSprite ? (thriveSprite.options as any)?.style : undefined}
                  size={120}
                  className="border-4 border-success rounded-full shadow-md shadow-green-500"
                />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t("studentDash.needHelpTitle")}</h2>
              <p className="hidden sm:block text-muted-foreground mb-4">
                {t("studentDash.caregiversNotified")}
              </p>
            </div>

            {/* Emojis */}
            <div className="flex justify-center items-center gap-6 sm:gap-12">
              <EmojiButton type="ok" emoji="😊" />
              <EmojiButton type="attention" emoji="😟" />
              <EmojiButton type="urgent" emoji="😭" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
