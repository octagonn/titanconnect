import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";

const makeToken = () => {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
};

export const profileQrRouter = createTRPCRouter({
  getOrCreate: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    const existing = await ctx.supabase
      .from("profile_qr_tokens")
      .select("token")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing.error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: existing.error.message });
    }

    if (existing.data?.token) {
      return { token: existing.data.token };
    }

    const token = makeToken();
    const inserted = await ctx.supabase
      .from("profile_qr_tokens")
      .insert({ user_id: userId, token })
      .select("token")
      .single();

    if (inserted.error || !inserted.data) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: inserted.error?.message || "Failed to create token" });
    }

    return { token: inserted.data.token };
  }),

  resolve: publicProcedure
    .input(z.object({ token: z.string().min(4) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("profile_qr_tokens")
        .select("user_id")
        .eq("token", input.token)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      if (!data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
      }

      return { userId: data.user_id };
    }),
});

