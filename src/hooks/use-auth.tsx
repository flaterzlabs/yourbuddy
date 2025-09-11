import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ThriveSprite = Database['public']['Tables']['thrive_sprites']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  thriveSprite: ThriveSprite | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    role: string,
    username?: string,
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [thriveSprite, setThriveSprite] = useState<ThriveSprite | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          thrive_sprite:thrive_sprites!thrive_sprites_student_id_fkey (*)
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data as any);
      // Set sprite if present (students) or null otherwise
      // @ts-ignore - embedded relation
      setThriveSprite((data as any)?.thrive_sprite ?? null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      setThriveSprite(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    (async () => {
      console.time('auth:init');
      // 1) Initialize from existing session first (avoids duplicate fetch)
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.time('auth:fetchProfile');
        await fetchProfile(session.user.id);
        console.timeEnd('auth:fetchProfile');
      } else {
        setProfile(null);
        setThriveSprite(null);
      }
      setLoading(false);
      console.timeEnd('auth:init');

      // 2) Subscribe to auth state changes (ignore INITIAL_SESSION)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, nextSession) => {
          if (event === 'INITIAL_SESSION') return;
          console.log('[auth] event:', event);
          setLoading(true);
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          if (nextSession?.user) {
            console.time('auth:fetchProfile');
            await fetchProfile(nextSession.user.id);
            console.timeEnd('auth:fetchProfile');
          } else {
            setProfile(null);
            setThriveSprite(null);
          }
          setLoading(false);
        },
      );

      return () => subscription.unsubscribe();
    })();
  }, []);

  const signUp = async (email: string, password: string, role: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role,
          username: username || email.split('@')[0],
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    thriveSprite,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
