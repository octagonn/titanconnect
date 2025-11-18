import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthContext, useAuth } from "@/contexts/AuthContext";
import { AppContext } from "@/contexts/AppContext";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoading, isAuthenticated, currentUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
            <GestureHandlerRootView>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </AppContext>
        </AuthContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
