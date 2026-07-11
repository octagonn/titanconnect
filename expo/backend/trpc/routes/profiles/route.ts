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
        .select("id, name, avatar_url, major, year, bio, interests, instagram, linkedin, linktree, website, points, created_at")
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
        instagram: profile.instagram,
        linkedin: profile.linkedin,
        linktree: profile.linktree,
        website: profile.website,
        points: profile.points ?? 0,
        createdAt: profile.created_at,
        relationship,
        connectionId,
      };
    }),

  getConnections: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { userId } = input;

      const { data: connections, error } = await ctx.supabase
        .from("connections")
        .select("user_id, connected_user_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      const otherIds = (connections ?? []).map((c) =>
        c.user_id === userId ? c.connected_user_id : c.user_id
      );

      if (otherIds.length === 0) {
        return [];
      }

      const { data: profiles, error: profilesError } = await ctx.supabase
        .from("profiles")
        .select("id, name, avatar_url, major")
        .in("id", otherIds);

      if (profilesError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: profilesError.message });
      }

      return (profiles ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar_url,
        major: p.major,
      }));
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

  suggestions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const viewerId = ctx.user.id;
      const { limit } = input;

      const { data: viewer, error: viewerError } = await ctx.supabase
        .from("profiles")
        .select("major, year, interests")
        .eq("id", viewerId)
        .maybeSingle();

      if (viewerError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: viewerError.message });
      }

      const { data: existingConnections, error: connError } = await ctx.supabase
        .from("connections")
        .select("user_id, connected_user_id")
        .or(`user_id.eq.${viewerId},connected_user_id.eq.${viewerId}`);

      if (connError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: connError.message });
      }

      const excludeIds = new Set<string>([viewerId]);
      (existingConnections ?? []).forEach((c: any) => {
        excludeIds.add(c.user_id);
        excludeIds.add(c.connected_user_id);
      });

      const { data: candidates, error: candidatesError } = await ctx.supabase
        .from("profiles")
        .select("id, name, avatar_url, major, year, interests")
        .not("id", "in", `(${Array.from(excludeIds).join(",")})`);

      if (candidatesError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: candidatesError.message });
      }

      const viewerInterests = new Set(viewer?.interests ?? []);

      const scored = (candidates ?? []).map((p: any) => {
        let score = 0;
        if (viewer?.major && p.major && p.major === viewer.major) score += 3;
        if (viewer?.year && p.year && p.year === viewer.year) score += 1;
        const overlap = (p.interests ?? []).filter((i: string) => viewerInterests.has(i)).length;
        score += overlap;
        return { profile: p, score };
      });

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, limit).map(({ profile: p }) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar_url,
        major: p.major,
        year: p.year,
        relationship: "none" as const,
        connectionId: null as string | null,
      }));
    }),
});

