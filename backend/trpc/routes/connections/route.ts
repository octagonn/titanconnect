import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";

export const connectionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "accepted", "blocked"]).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      let query = ctx.supabase
        .from("connections")
        .select(
          `
            id,
            user_id,
            connected_user_id,
            status,
            created_at,
            updated_at,
            requester: user_id ( id, name, avatar_url ),
            recipient: connected_user_id ( id, name, avatar_url )
          `
        )
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
        .order("updated_at", { ascending: false });

      if (input?.status) {
        query = query.eq("status", input.status);
      }

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return (data || []).map((row: any) => {
        const isRequester = row.user_id === userId;
        const otherProfile = isRequester ? row.recipient : row.requester;
        const direction: "outgoing" | "incoming" = isRequester ? "outgoing" : "incoming";
        return {
          id: row.id,
          status: row.status as "pending" | "accepted" | "blocked",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          direction,
          otherUser: otherProfile
            ? {
                id: otherProfile.id,
                name: otherProfile.name,
                avatar: otherProfile.avatar_url,
              }
            : null,
        };
      });
    }),

  sendRequest: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const targetId = input.targetUserId;

      if (userId === targetId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot connect with yourself" });
      }

      const { data: existing, error: existingError } = await ctx.supabase
        .from("connections")
        .select("*")
        .or(
          `and(user_id.eq.${userId},connected_user_id.eq.${targetId}),and(user_id.eq.${targetId},connected_user_id.eq.${userId})`
        )
        .maybeSingle();

      if (existingError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: existingError.message });
      }

      if (existing) {
        if (existing.status === "blocked") {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is blocked" });
        }

        if (existing.status === "accepted") {
          return { status: "accepted", connectionId: existing.id };
        }

        if (existing.status === "pending") {
          if (existing.user_id === targetId) {
            const { data, error } = await ctx.supabase
              .from("connections")
              .update({ status: "accepted" })
              .eq("id", existing.id)
              .select()
              .single();

            if (error) {
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
            }

            return { status: "accepted", connectionId: data.id };
          }

          return { status: "pending", connectionId: existing.id };
        }
      }

      const { data, error } = await ctx.supabase
        .from("connections")
        .insert({
          user_id: userId,
          connected_user_id: targetId,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { status: "pending", connectionId: data.id };
    }),

  respond: protectedProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
        action: z.enum(["accept", "decline", "block"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { connectionId, action } = input;

      const { data: conn, error } = await ctx.supabase
        .from("connections")
        .select("*")
        .eq("id", connectionId)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      if (!conn) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
      }

      const isParticipant = conn.user_id === userId || conn.connected_user_id === userId;
      if (!isParticipant) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (action === "accept") {
        if (conn.status !== "pending" || conn.connected_user_id !== userId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot accept this request" });
        }
        const { error: updateError } = await ctx.supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", connectionId);

        if (updateError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: updateError.message });
        }
        return { status: "accepted" };
      }

      if (action === "decline") {
        if (conn.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending requests can be declined" });
        }
        const { error: deleteError } = await ctx.supabase.from("connections").delete().eq("id", connectionId);
        if (deleteError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: deleteError.message });
        }
        return { status: "declined" };
      }

      // block
      const { error: blockError } = await ctx.supabase
        .from("connections")
        .update({ status: "blocked" })
        .eq("id", connectionId);
      if (blockError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: blockError.message });
      }
      return { status: "blocked" };
    }),

  remove: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const targetId = input.targetUserId;

      const { data: conn, error } = await ctx.supabase
        .from("connections")
        .select("id")
        .or(
          `and(user_id.eq.${userId},connected_user_id.eq.${targetId}),and(user_id.eq.${targetId},connected_user_id.eq.${userId})`
        )
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      if (!conn) {
        return { removed: false };
      }

      const { error: deleteError } = await ctx.supabase.from("connections").delete().eq("id", conn.id);
      if (deleteError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: deleteError.message });
      }

      return { removed: true };
    }),
});

