import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchSession as apiFetchSession,
  logout as apiLogout,
  requestPasswordReset as apiRequestPasswordReset,
  signIn as apiSignIn,
  signUp as apiSignUp,
  type AuthUser,
  type UserRole,
} from "@/integrations/api/auth";
import { setAuthToken } from "@/integrations/api/client";
import { connectRealtime, disconnectRealtime } from "@/integrations/realtime/socket";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ThriveSprite = Database["public"]["Tables"]["thrive_sprites"]["Row"];

type Session = {
  token: string;
};

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  profile: Profile | null;
  thriveSprite: ThriveSprite | null;
  loading: boolean;
  signUp: (email: string, password: string, role: UserRole, username?: string) => Promise<{ error: Error | null }>;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  resetPassword: (identifier: string) => Promise<{ error: Error | null; token?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_STORAGE_KEY = "yb_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [thriveSprite, setThriveSprite] = useState<ThriveSprite | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);

  const getCachedData = (userId: string) => {
    try {
      const cached = sessionStorage.getItem(`auth_cache_${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const setCachedData = (userId: string, data: { profile: Profile | null; thriveSprite: ThriveSprite | null }) => {
    try {
      sessionStorage.setItem(`auth_cache_${userId}`, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  const clearCachedData = (userId?: string | null) => {
    if (!userId) return;
    try {
      sessionStorage.removeItem(`auth_cache_${userId}`);
    } catch {
      // ignore
    }
  };

  const clearAuthState = () => {
    setAuthToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (lastFetchedUserId) {
      clearCachedData(lastFetchedUserId);
    }
    disconnectRealtime();
    setUser(null);
    setSession(null);
    setProfile(null);
    setThriveSprite(null);
    setLastFetchedUserId(null);
  };

  const loadSessionFromApi = useCallback(async () => {
    const response = await apiFetchSession();
    if (response.error || !response.data) {
      if (response.status === 401 || response.status === 403) {
        clearAuthState();
      }
      return null;
    }

    const { user: apiUser, profile: apiProfile, thriveSprite: apiSprite } = response.data;

    setUser(apiUser);
    setProfile(apiProfile);
    setThriveSprite(apiSprite);
    setLastFetchedUserId(apiUser.id);
    setCachedData(apiUser.id, { profile: apiProfile, thriveSprite: apiSprite });
    const token = session?.token ?? localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      connectRealtime(token);
    }

    return apiUser;
  }, [session?.token]);

  const fetchProfile = useCallback(async (userId: string, force = false) => {
    if (!session?.token) return;

    if (!force && lastFetchedUserId === userId && profile) {
      return;
    }

    if (!force) {
      const cached = getCachedData(userId);
      if (cached?.profile) {
        setProfile(cached.profile);
        setThriveSprite(cached.thriveSprite);
        setLastFetchedUserId(userId);
      }
    }

    await loadSessionFromApi();
  }, [session?.token, lastFetchedUserId, profile, loadSessionFromApi]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id, true);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      if (!mounted) return;

      setSession({ token: storedToken });
      connectRealtime(storedToken);

      await loadSessionFromApi();
      if (mounted) {
        setLoading(false);
      }
    };

    initialize();

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_STORAGE_KEY) return;

      if (!event.newValue) {
        clearAuthState();
        return;
      }

      setSession({ token: event.newValue });
      connectRealtime(event.newValue);
      loadSessionFromApi();
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadSessionFromApi]);

  const signUp = async (email: string, password: string, role: UserRole, username?: string) => {
    const finalUsername = username?.trim() || email.split("@")[0];
    const response = await apiSignUp({
      email,
      password,
      role,
      username: finalUsername,
    });

    if (response.error || !response.data) {
      return { error: response.error ? new Error(response.error) : new Error("Erro ao cadastrar") };
    }

    const { token, user: apiUser, profile: apiProfile, thriveSprite: apiSprite } = response.data;
    setSession({ token });
    setUser(apiUser);
    setProfile(apiProfile);
    setThriveSprite(apiSprite);
    setLastFetchedUserId(apiUser.id);
    setCachedData(apiUser.id, { profile: apiProfile, thriveSprite: apiSprite });
    connectRealtime(token);

    return { error: null };
  };

  const resolveEmailForSignIn = async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      return { identifier: trimmed };
    }
    return { identifier: trimmed };
  };

  const signIn = async (identifier: string, password: string) => {
    const { identifier: resolved } = await resolveEmailForSignIn(identifier);
    const response = await apiSignIn({ identifier: resolved, password });

    if (response.error || !response.data) {
      return { error: response.error ? new Error(response.error) : new Error("Credenciais inválidas") };
    }

    const { token, user: apiUser, profile: apiProfile, thriveSprite: apiSprite } = response.data;
    setSession({ token });
    setUser(apiUser);
    setProfile(apiProfile);
    setThriveSprite(apiSprite);
    setLastFetchedUserId(apiUser.id);
    setCachedData(apiUser.id, { profile: apiProfile, thriveSprite: apiSprite });
    connectRealtime(token);

    return { error: null };
  };

  const resetPassword = async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      return { error: new Error("Informe um e-mail ou nome de usuário"), token: undefined };
    }

    const response = await apiRequestPasswordReset(trimmed);
    if (response.error) {
      return { error: new Error(response.error), token: undefined };
    }

    return { error: null, token: response.data?.token };
  };

  const signOut = async () => {
    await apiLogout();
    clearAuthState();
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    thriveSprite,
    loading,
    signUp,
    signIn,
    resetPassword,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
