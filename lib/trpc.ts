import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // Use standard API URL environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Fallback to localhost for development
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    return "http://localhost:3000";
  }

  // If no URL is set, return empty string (tRPC will be disabled)
  console.warn(
    "EXPO_PUBLIC_API_URL is not set. tRPC client will not be available."
  );
  return "";
};

const baseUrl = getBaseUrl();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: baseUrl ? `${baseUrl}/api/trpc` : "http://localhost:3000/api/trpc",
      transformer: superjson,
    }),
  ],
});
