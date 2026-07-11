import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";

function mapNotification(row: any) {
  return {
    id: row.id,
    type: row.type as
      | "message"
      | "connection_request"
      | "connection_accepted"
      | "offer_new"
      | "offer_accepted"
      | "offer_declined"
      | "deal_confirmed"
      | "post_like"
      | "post_comment"
      | "post_tag",
    actorId: row.actor_id ?? undefined,
    actorName: row.actor?.name ?? undefined,
    actorAvatar: row.actor?.avatar_url ?? undefined,
    postId: row.post_id ?? undefined,
    postTitle: row.post?.title ?? undefined,
    conversationId: row.conversation_id ?? undefined,
    connectionId: row.connection_id ?? undefined,
    offerId: row.offer_id ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  };
}

export const notificationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      let query = ctx.supabase
        .from("notifications")
        .select(
          `
            id, type, actor_id, post_id, conversation_id, connection_id, offer_id, read, created_at,
            actor:profiles!notifications_actor_id_fkey ( name, avatar_url ),
            post:posts ( title )
          `
        )
        .eq("recipient_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      let nextCursor: string | undefined = undefined;
      const rows = data ?? [];
      if (rows.length > limit) {
        const next = rows.pop();
        nextCursor = next?.created_at;
      }

      return {
        items: rows.map(mapNotification),
        nextCursor,
      };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const { count, error } = await ctx.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", ctx.user.id)
      .eq("read", false);

    if (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }
    return count ?? 0;
  }),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", input.notificationId)
        .eq("recipient_id", ctx.user.id);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", ctx.user.id)
      .eq("read", false);

    if (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }
    return { success: true };
  }),
});
