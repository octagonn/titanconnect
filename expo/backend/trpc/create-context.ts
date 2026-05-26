import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import { createClient, User } from "@supabase/supabase-js";
import superjson from "superjson";

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get("authorization");
  console.log("TRPC Context - Auth Header:", authHeader ? "Present" : "Missing");

  // Extract raw JWT token from "Bearer <token>" header if present
  const token =
    authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : authHeader?.startsWith("bearer ")
      ? authHeader.slice("bearer ".length)
      : null;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

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

  // If there is an auth header, try to get the user
  let user: User | null = null;
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error("Supabase getUser error:", error.message);
    } else if (data?.user) {
      console.log("Supabase User authenticated:", data.user.id);
      user = data.user;
    }
  } else {
    console.log("No valid bearer token provided to TRPC");
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

  // If no user, return UNAUTHORIZED error but ensure it's a proper TRPC error response
  if (!ctx.user) {
    console.warn("Protected procedure called without user");
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      user: ctx.user,
      supabase: ctx.supabase,
    },
  });
});