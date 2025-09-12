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
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);

  const fetchProfile = async (userId: string, force = false) => {
    // Avoid unnecessary refetches for the same user unless forced
    if (!force && lastFetchedUserId === userId && profile) {
      console.log('[auth] skipping fetchProfile - already have data for user', userId);
      return;
    }
    
    try {
      console.log('[auth] fetching profile for user', userId);
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
      setLastFetchedUserId(userId);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      setThriveSprite(null);
      setLastFetchedUserId(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, true); // Force refresh
    }
  };

  useEffect(() => {
    let authTimeout: NodeJS.Timeout;
    let isPageVisible = true;

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

      // Handle page visibility changes
      const handleVisibilityChange = () => {
        isPageVisible = !document.hidden;
        console.log('[auth] page visibility changed:', isPageVisible);
        
        // Don't trigger auth state changes when page becomes hidden
        if (!isPageVisible) {
          if (authTimeout) {
            clearTimeout(authTimeout);
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 2) Subscribe to auth state changes with debounce
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, nextSession) => {
          if (event === 'INITIAL_SESSION') return;
          
          console.log('[auth] event:', event, 'isPageVisible:', isPageVisible, 'isProcessingAuth:', isProcessingAuth);
          
          // Skip processing if we're already processing or page is hidden
          if (isProcessingAuth || !isPageVisible) {
            console.log('[auth] skipping auth processing');
            return;
          }
          
          // Clear any existing timeout
          if (authTimeout) {
            clearTimeout(authTimeout);
          }
          
          // Debounce auth state changes
          authTimeout = setTimeout(async () => {
            // Double-check we should still process
            if (!isPageVisible || isProcessingAuth) return;
            
            const currentUserId = nextSession?.user?.id;
            const hasDataForUser = currentUserId && currentUserId === lastFetchedUserId && profile;
            
            // Don't reload if it's the same user and we already have data
            if (event === 'SIGNED_IN' && hasDataForUser) {
              console.log('[auth] skipping reload - same user, have data');
              return;
            }
            
            setIsProcessingAuth(true);
            setLoading(true);
            
            try {
              setSession(nextSession);
              setUser(nextSession?.user ?? null);
              
              if (nextSession?.user) {
                console.time('auth:fetchProfile');
                await fetchProfile(nextSession.user.id);
                console.timeEnd('auth:fetchProfile');
              } else {
                setProfile(null);
                setThriveSprite(null);
                setLastFetchedUserId(null);
              }
            } finally {
              setLoading(false);
              setIsProcessingAuth(false);
            }
          }, 300); // 300ms debounce
        },
      );

      return () => {
        subscription.unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (authTimeout) {
          clearTimeout(authTimeout);
        }
      };
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
