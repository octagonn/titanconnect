import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

// TitanConnect Supabase project (public anon credentials – safe to ship in the client).
// We intentionally hardcode these so a stale EXPO_PUBLIC_SUPABASE_URL in your shell
// can’t silently point the app at the wrong project.
const FALLBACK_SUPABASE_URL = 'https://gzfhfwiizdlptcxsdqxt.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Zmhmd2lpemRscHRjeHNkcXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NjkwMTEsImV4cCI6MjA3NzI0NTAxMX0.8MUB-eZVyi6vh3NUsWr7ZbOq4nz--5WEuP6w2AgWuq0';

// Read Expo env vars if present. We only trust the URL if it still points at the
// configured TitanConnect project; this protects you from old global env values
// like https://evdbplhztpmsjgvxrfcq.supabase.co breaking the app.
const envSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl =
  envSupabaseUrl && envSupabaseUrl.includes('gzfhfwiizdlptcxsdqxt.supabase.co')
    ? envSupabaseUrl
    : FALLBACK_SUPABASE_URL;

const supabaseAnonKey =
  envSupabaseAnonKey && envSupabaseAnonKey.length > 0
    ? envSupabaseAnonKey
    : FALLBACK_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Please ensure your project is configured correctly.',
  );
}

// One-time sanity log so you can verify at runtime which project the client is using.
// NOTE: We never log the actual anon key, only whether it is present.
// This log appears in both Expo Go and web console.
// eslint-disable-next-line no-console
console.log('Supabase client configured', {
  supabaseUrl,
  anonKeyPresent: !!supabaseAnonKey,
});

const customStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.setItem(key, value);
    } else {
      AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.removeItem(key);
    } else {
      AsyncStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Get the email verification redirect URL that will open the app
 * For development/testing: tries to use current Expo Go URL if available,
 * otherwise falls back to the app's custom URL scheme (myapp://)
 */
export async function getEmailRedirectUrl(): Promise<string> {
  if (Platform.OS === 'web') {
    // For web, use the current origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/verify-email`;
    }
    return '/verify-email';
  }

  // Try to get the current Expo Go URL (works when app is running)
  try {
    const url = await Linking.getInitialURL();
    if (url) {
      const parsed = Linking.parse(url);
      // If we're in Expo Go (exp:// scheme), use that URL
      if (parsed.scheme === 'exp' || parsed.scheme?.startsWith('exp')) {
        const host = parsed.hostname || '';
        const port = parsed.port ? `:${parsed.port}` : '';
        return `exp://${host}${port}/--/verify-email`;
      }
    }
  } catch (error) {
    // Ignore errors, fall back to custom scheme
  }

  // Fallback: use the app's custom URL scheme (myapp://)
  // This works for production builds and will also work in Expo Go
  // if Supabase is configured to allow it
  return 'myapp://verify-email';
}
