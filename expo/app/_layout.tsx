import "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Bungee_400Regular } from "@expo-google-fonts/bungee";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet, Platform } from "react-native";
import { enableScreens } from "react-native-screens";
import { ThemeProvider, DefaultTheme } from "@react-navigation/native";
import { AuthContext, useAuth } from "@/contexts/AuthContext";
import { AppContext } from "@/contexts/AppContext";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { showAlert } from '@/lib/alert';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import NeoHeaderBackground from '@/components/ui/NeoHeaderBackground';
import GlobalTabBar from '@/components/ui/GlobalTabBar';

// react-native-screens is disabled by default on web, which makes
// bottom-tabs render inactive tab scenes as plain stacked Views with no
// hiding — visible through our transparent scene backgrounds. Enabling it
// switches tabs to the RNS web Screen shim, which display:none's inactive
// scenes. The root Stack's web implementation doesn't use RNS, so this only
// affects tabs.
if (Platform.OS === 'web') {
  enableScreens(true);
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Navigation theme with a transparent background: react-navigation paints
// theme.colors.background on scene wrappers that contentStyle/sceneStyle
// can't reach, which would otherwise cover the flat cream canvas below.
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

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
            showAlert(
              'Verification Failed',
              'There was an error verifying your email. Please try again.',
              [{ text: 'OK', onPress: () => router.replace('/welcome') }]
            );
            return;
          }

          // Session set successfully - auth state will update automatically
          showAlert(
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
            showAlert(
              'Verification Failed',
              'The verification link is invalid or has expired. Please request a new verification email.',
              [{ text: 'OK', onPress: () => router.replace('/welcome') }]
            );
            return;
          }

          showAlert(
            'Email Verified',
            'Your email has been verified successfully!',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
        showAlert(
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

  // Only the auth/onboarding flow needs gating by name for the *authenticated*
  // forward-redirect — every other route (tabs, post/chat/profile detail,
  // notifications, my-activity, ...) is just app content. Enumerating every
  // content route here as an "allowed" segment used to be a maintenance
  // trap: it silently bounced any new or forgotten route (e.g. post/[id])
  // back to Discover as soon as it loaded.
  const rootSegment = segments[0];
  const inTabsGroup = rootSegment === '(tabs)';
  const authFlowSegments = ['welcome', 'auth', 'verify-email'];
  const inAuthFlow = authFlowSegments.includes(rootSegment ?? '');
  const inStudentOnboarding = rootSegment === 'setup-profile';
  const inFacultyOnboarding = rootSegment === 'setup-faculty';
  const inOnboarding = inStudentOnboarding || inFacultyOnboarding;
  const needsOnboarding = !!currentUser && !currentUser.isProfileComplete;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      if (inTabsGroup || inOnboarding) {
        router.replace('/welcome');
      }
      return;
    }

    if (needsOnboarding) {
      const target =
        currentUser?.role === 'faculty' ? '/setup-faculty' : '/setup-profile';

      if (!inOnboarding || (currentUser?.role === 'faculty' && !inFacultyOnboarding)) {
        router.replace(target);
      }
      return;
    }

    if (inAuthFlow || inOnboarding) {
      router.replace('/(tabs)/home');
    }
  }, [isLoading, isAuthenticated, needsOnboarding, currentUser, inTabsGroup, inAuthFlow, inOnboarding, inFacultyOnboarding, router]);

  if (isLoading) {
    return null;
  }

  const showTabBar = isAuthenticated && !inAuthFlow && !inOnboarding;

  return (
    <View style={styles.rootColumn}>
    <View style={styles.stackWrap}>
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        // Solid navy masthead with a thick ink bottom edge.
        headerBackground: () => <NeoHeaderBackground />,
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '900' as const,
          color: '#FFFFFF',
        },
        // Scenes are transparent so the flat cream canvas underneath shows
        // through every screen.
        contentStyle: {
          backgroundColor: 'transparent',
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
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: true,
          title: 'Notifications',
        }}
      />
      <Stack.Screen
        name="my-activity"
        options={{
          headerShown: true,
          title: 'My Activity',
        }}
      />
    </Stack>
    </View>
    {showTabBar && <GlobalTabBar />}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Bungee_400Regular });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthContext>
          <AppContext>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <View style={styles.appBackground}>
                  <ThemeProvider value={navTheme}>
                    <RootLayoutNav />
                  </ThemeProvider>
                  <AddToHomeScreen />
                </View>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </AppContext>
        </AuthContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  appBackground: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  rootColumn: {
    flex: 1,
  },
  stackWrap: {
    flex: 1,
  },
});
