import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export const [AuthContext, useAuth] = createContextHook(() => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const loadAuthState = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setSession(session);
        setIsAuthenticated(true);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile && !error) {
          setCurrentUser({
            id: profile.id,
            email: session.user.email || '',
            name: profile.name,
            avatar: profile.avatar_url,
            major: profile.major,
            year: profile.year,
            bio: profile.bio,
            interests: profile.interests || [],
            isEmailVerified: true,
            isProfileComplete: profile.is_profile_complete,
          });
        }
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      subscription.unsubscribe();
    };
  }, [loadAuthState]);

  const signInWithEmail = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: undefined,
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;
      if (data.session) {
        await loadAuthState();
      }
      return { success: true };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }, [loadAuthState]);

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
      signInWithEmail,
      verifyOtp,
      signOut,
      updateUser,
    }),
    [isLoading, isAuthenticated, currentUser, session, signInWithEmail, verifyOtp, signOut, updateUser]
  );
});
