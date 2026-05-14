import supabase from "../lib/supabaseClient";
import type { Database } from "../lib/supabaseClient";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface AuthContextType {
  user: User | null;
  profile: ProfileRow | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data?: any }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser: User) => {
    console.log("Fetching profile for user:", authUser.id);
    const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id);
    if (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } else if (Array.isArray(data) && data.length > 0) {
      console.log("Profile found:", data[0]);
      setProfile(data[0]);
    } else {
      console.log("Profile not found, attempting to create...");
      // Profile doesn't exist yet, create it
      const { error: insertError } = await supabase.from("profiles").insert({
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || null,
      });
      if (insertError) {
        console.error("Error creating profile:", insertError);
        console.error("Insert error details:", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details
        });
        setProfile(null);
      } else {
        console.log("Profile created successfully");
        // Fetch the newly created profile
        const { data: newProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        if (!fetchError && newProfile) {
          setProfile(newProfile);
        } else {
          setProfile(null);
        }
      }
    }
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
        }
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          void fetchProfile(session.user);
        }
      } catch (err) {
        console.error("Session initialization error:", err);
        setLoading(false);
      }
    };

    void initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
          setLoading(false);
          return;
        }
        setLoading(false);
        if (!profile || profile.id !== session.user.id) {
          void fetchProfile(session.user);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      return { error };
    }
    // Don't create profile here - let fetchProfile handle it when user is authenticated
    return { error: null, data };
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
    setUser(null);
    setProfile(null);
  };

  const value: AuthContextType = {
    user,
    profile,
    signUp,
    signIn,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
