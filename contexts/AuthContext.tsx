import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

type AuthRole = 'student' | 'faculty';

interface SignInResult {
  success: boolean;
  isVerified?: boolean;
  needsVerification?: boolean;
  invalidCredentials?: boolean;
  message?: string;
}

interface SignUpResult {
  success: boolean;
  needsVerification: boolean;
}

export const [AuthContext, useAuth] = createContextHook(() => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const loadAuthState = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const nextSession = data.session ?? null;

      if (nextSession) {
        setSession(nextSession);
        setIsAuthenticated(true);

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', nextSession.user.id)
          .single();

        if (profile && !error) {
          const isEmailVerified = !!nextSession.user.email_confirmed_at;

          setCurrentUser({
            id: profile.id,
            email: nextSession.user.email || '',
            name: profile.name,
            avatar: profile.avatar_url,
            major: profile.major,
            year: profile.year,
            bio: profile.bio,
            interests: profile.interests || [],
            isEmailVerified,
            isProfileComplete: profile.is_profile_complete,
            role: (profile.role as AuthRole) || 'student',
            createdAt: profile.created_at,
          });
        }
      } else {
        setSession(null);
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthState();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event);
      setSession(session);
      setIsAuthenticated(!!session);

      if (!session) {
        setCurrentUser(null);
      } else {
        loadAuthState();
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadAuthState]);

  const signInWithEmailAndPassword = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const message = error.message.toLowerCase();

          // Common Supabase messages for unconfirmed emails
          if (message.includes('email not confirmed') || message.includes('confirmation')) {
            return { success: false, needsVerification: true };
          }

          // Invalid credentials or user not found
          if (
            message.includes('invalid login') ||
            message.includes('invalid email or password') ||
            message.includes('invalid credentials') ||
            message.includes('invalid password')
          ) {
            return {
              success: false,
              invalidCredentials: true,
              message: 'Invalid email or password.',
            };
          }

          throw error;
        }

        await loadAuthState();

        const isVerified = !!data.session?.user.email_confirmed_at;
        if (!isVerified) {
          return { success: false, needsVerification: true };
        }

        return { success: true, isVerified };
      } catch (error) {
        console.error('Error signing in with email/password:', error);
        throw error;
      }
    },
    [loadAuthState]
  );

  const signUpWithEmailAndPassword = useCallback(
    async (email: string, password: string, role: AuthRole): Promise<SignUpResult> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined,
            data: { role },
          },
        });

        if (error) {
          // If the user already exists but hasn't confirmed, treat as needs verification
          const message = error.message.toLowerCase();
          if (message.includes('already registered') || message.includes('signup provider')) {
            return { success: false, needsVerification: true };
          }

          throw error;
        }

        // Supabase will send a verification email automatically
        const needsVerification = !data.session || !data.user?.email_confirmed_at;
        return { success: true, needsVerification };
      } catch (error) {
        console.error('Error signing up with email/password:', error);
        throw error;
      }
    },
    []
  );

  const resendVerification = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error resending verification email:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!currentUser || !session) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          avatar_url: updates.avatar,
          major: updates.major,
          year: updates.year,
          bio: updates.bio,
          interests: updates.interests,
          is_profile_complete: updates.isProfileComplete,
          role: updates.role,
        })
        .eq('id', session.user.id);

      if (error) throw error;

      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [currentUser, session]);

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      currentUser,
      session,
      signInWithEmailAndPassword,
      signUpWithEmailAndPassword,
      resendVerification,
      signOut,
      updateUser,
    }),
    [
      isLoading,
      isAuthenticated,
      currentUser,
      session,
      signInWithEmailAndPassword,
      signUpWithEmailAndPassword,
      resendVerification,
      signOut,
      updateUser,
    ]
  );
});
