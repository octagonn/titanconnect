import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";

export const profilesRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const viewerId = ctx.user.id;
      const { userId } = input;

      const { data: profile, error } = await ctx.supabase
        .from("profiles")
        .select("id, name, avatar_url, major, year, bio, interests, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      const { data: connection, error: connError } = await ctx.supabase
        .from("connections")
        .select("id, user_id, connected_user_id, status")
        .or(
          `and(user_id.eq.${viewerId},connected_user_id.eq.${userId}),and(user_id.eq.${userId},connected_user_id.eq.${viewerId})`
        )
        .maybeSingle();

      if (connError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: connError.message });
      }

      let relationship: "none" | "pending" | "incoming" | "accepted" | "blocked" = "none";
      let connectionId: string | null = null;
      if (connection) {
        connectionId = connection.id;
        if (connection.status === "blocked") relationship = "blocked";
        else if (connection.status === "accepted") relationship = "accepted";
        else if (connection.status === "pending") {
          relationship = connection.user_id === viewerId ? "pending" : "incoming";
        }
      }

      return {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar_url,
        major: profile.major,
        year: profile.year,
        bio: profile.bio,
        interests: profile.interests || [],
        createdAt: profile.created_at,
        relationship,
        connectionId,
      };
    }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(8),
      })
    )
    .query(async ({ ctx, input }) => {
      const viewerId = ctx.user.id;
      const { query, limit } = input;

      const { data, error } = await ctx.supabase
        .from("profiles")
        .select("id, name, avatar_url, major, year")
        .ilike("name", `%${query}%`)
        .neq("id", viewerId)
        .order("name", { ascending: true })
        .limit(limit);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      const results = data || [];
      if (!results.length) {
        return [];
      }

      const ids = results.map((p) => p.id);

      const [outgoingRes, incomingRes] = await Promise.all([
        ctx.supabase
          .from("connections")
          .select("id, user_id, connected_user_id, status")
          .eq("user_id", viewerId)
          .in("connected_user_id", ids),
        ctx.supabase
          .from("connections")
          .select("id, user_id, connected_user_id, status")
          .eq("connected_user_id", viewerId)
          .in("user_id", ids),
      ]);

      if (outgoingRes.error || incomingRes.error) {
        const message = outgoingRes.error?.message || incomingRes.error?.message || "Connection lookup failed";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }

      const connectionMap = new Map<string, { status: string; connectionId: string; direction: "out" | "in" }>();
      (outgoingRes.data || []).forEach((c: any) => {
        connectionMap.set(c.connected_user_id, { status: c.status, connectionId: c.id, direction: "out" });
      });
      (incomingRes.data || []).forEach((c: any) => {
        connectionMap.set(c.user_id, { status: c.status, connectionId: c.id, direction: "in" });
      });

      return results.map((p) => {
        const rel = connectionMap.get(p.id);
        let relationship: "none" | "pending" | "incoming" | "accepted" | "blocked" = "none";
        let connectionId: string | null = null;
        if (rel) {
          connectionId = rel.connectionId;
          if (rel.status === "blocked") relationship = "blocked";
          else if (rel.status === "accepted") relationship = "accepted";
          else if (rel.status === "pending") {
            relationship = rel.direction === "out" ? "pending" : "incoming";
          }
        }

        return {
          id: p.id,
          name: p.name,
          avatar: p.avatar_url,
          major: p.major,
          year: p.year,
          relationship,
          connectionId,
        };
      });
    }),
});

