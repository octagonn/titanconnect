import "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthContext, useAuth } from "@/contexts/AuthContext";
import { AppContext } from "@/contexts/AppContext";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { Alert } from "react-native";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoading, isAuthenticated, currentUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle deep links for email verification
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        const parsed = Linking.parse(url);
        console.log('Deep link received:', url, parsed);
        
        // Check if this is a verification link (path contains verify-email)
        const isVerificationLink = 
          parsed.path === 'verify-email' || 
          parsed.path?.includes('verify-email') ||
          parsed.hostname === 'verify-email';

        if (!isVerificationLink) {
          return; // Not a verification link, ignore it
        }

        // Supabase redirects with tokens in query params or hash fragment
        // Extract from query params first
        let accessToken = parsed.queryParams?.access_token as string | undefined;
        let refreshToken = parsed.queryParams?.refresh_token as string | undefined;
        const token = parsed.queryParams?.token as string | undefined;
        const type = parsed.queryParams?.type as string | undefined;

        // If tokens are in hash fragment, parse the hash
        if (!accessToken && url.includes('#')) {
          const hashPart = url.split('#')[1];
          const hashParams = new URLSearchParams(hashPart);
          accessToken = hashParams.get('access_token') || undefined;
          refreshToken = hashParams.get('refresh_token') || undefined;
        }

        // Method 1: Supabase includes access_token and refresh_token after verification
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session from deep link:', error);
            Alert.alert(
              'Verification Failed',
              'There was an error verifying your email. Please try again.',
              [{ text: 'OK', onPress: () => router.replace('/welcome') }]
            );
            return;
          }

          // Session set successfully - auth state will update automatically
          Alert.alert(
            'Email Verified',
            'Your email has been verified successfully!',
            [{ text: 'OK' }]
          );
          return;
        }

        // Method 2: Token-based verification (for OTP flow)
        if (token && type === 'signup') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup',
          });

          if (error) {
            console.error('Email verification error:', error);
            Alert.alert(
              'Verification Failed',
              'The verification link is invalid or has expired. Please request a new verification email.',
              [{ text: 'OK', onPress: () => router.replace('/welcome') }]
            );
            return;
          }

          Alert.alert(
            'Email Verified',
            'Your email has been verified successfully!',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
        Alert.alert(
          'Error',
          'There was an error processing the verification link.',
          [{ text: 'OK' }]
        );
      }
    };

    // Handle initial URL (when app is opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

    const rootSegment = segments[0];
    const inTabsGroup = rootSegment === '(tabs)';
    const inStudentOnboarding = rootSegment === 'setup-profile';
    const inFacultyOnboarding = rootSegment === 'setup-faculty';
    const inOnboarding = inStudentOnboarding || inFacultyOnboarding;

    if (!isAuthenticated) {
      if (inTabsGroup || inOnboarding) {
        router.replace('/welcome');
      }
      return;
    }

    const needsOnboarding = currentUser && !currentUser.isProfileComplete;

    if (needsOnboarding) {
      const target =
        currentUser?.role === 'faculty' ? '/setup-faculty' : '/setup-profile';

      if (!inOnboarding || (currentUser.role === 'faculty' && !inFacultyOnboarding)) {
        router.replace(target);
      }
      return;
    }

    if (isAuthenticated && !inTabsGroup) {
      router.replace('/(tabs)/home');
    }
  }, [isLoading, isAuthenticated, currentUser, segments, router]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: Colors.light.primary,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '700' as const,
        },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth/email-password"
        options={{ title: "Sign In", headerShown: true }}
      />
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      <Stack.Screen name="setup-profile" options={{ headerShown: false }} />
      <Stack.Screen name="setup-faculty" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="chat/[id]"
        options={{
          headerShown: true,
          title: 'Chat',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthContext>
          <AppContext>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <RootLayoutNav />
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </AppContext>
        </AuthContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
