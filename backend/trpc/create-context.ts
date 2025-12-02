import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import { createClient, User } from "@supabase/supabase-js";
import superjson from "superjson";

// Match the safety logic from lib/supabase.ts so we never hit old/stale projects
const FALLBACK_SUPABASE_URL = "https://gzfhfwiizdlptcxsdqxt.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Zmhmd2lpemRscHRjeHNkcXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NjkwMTEsImV4cCI6MjA3NzI0NTAxMX0.8MUB-eZVyi6vh3NUsWr7ZbOq4nz--5WEuP6w2AgWuq0";

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get("authorization");

  // Extract raw JWT token from "Bearer <token>" header if present
  const token =
    authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : authHeader?.startsWith("bearer ")
      ? authHeader.slice("bearer ".length)
      : null;

  const envSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const envSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl =
    envSupabaseUrl &&
    envSupabaseUrl.includes("gzfhfwiizdlptcxsdqxt.supabase.co")
      ? envSupabaseUrl
      : FALLBACK_SUPABASE_URL;

  const supabaseAnonKey =
    envSupabaseAnonKey && envSupabaseAnonKey.length > 0
      ? envSupabaseAnonKey
      : FALLBACK_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let user: User | null = null;
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error("Supabase getUser error:", error.message);
    }
    user = data.user;
  }

  return {
    req: opts.req,
    supabase,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async function isAuthed(opts) {
  const { ctx } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      user: ctx.user,
      supabase: ctx.supabase,
    },
  });
});
