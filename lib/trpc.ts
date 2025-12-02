import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from "expo-constants";
import { supabase } from "./supabase";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // Use standard API URL environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // On Web, use relative URL (empty string) so it hits the same origin
  if (typeof window !== 'undefined') {
    return '';
  }

  // On Native, use the Expo host IP
  if (Constants.expoConfig?.hostUri) {
    return `http://${Constants.expoConfig.hostUri}`;
  }

  // Fallback to localhost (default Expo port)
  return "http://localhost:8081";
};

const baseUrl = getBaseUrl();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      async headers() {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return {
          Authorization: token ? `Bearer ${token}` : undefined,
        };
      },
    }),
  ],
});
