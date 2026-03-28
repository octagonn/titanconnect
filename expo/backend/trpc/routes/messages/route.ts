import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";

const messageSelect = `
  id,
  conversation_id,
  sender_id,
  receiver_id,
  content,
  read,
  deleted_at,
  created_at
`;

const generateParticipants = (userA: string, userB: string) => {
  return [userA, userB].sort();
};

const findOrCreateConversation = async (
  supabase: any,
  userId: string,
  otherUserId: string,
) => {
  const participants = generateParticipants(userId, otherUserId);

  // Try to find an existing conversation that contains exactly these participants
  const { data: existingList, error: fetchError } = await supabase
    .from("conversations")
    .select("id, participant_ids, updated_at")
    .contains("participant_ids", participants)
    .order("updated_at", { ascending: false });

  if (fetchError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: fetchError.message,
    });
  }

  const exactMatch =
    existingList?.find(
      (conv: any) =>
        Array.isArray(conv.participant_ids) &&
        conv.participant_ids.length === participants.length &&
        participants.every((p, idx) => conv.participant_ids[idx] === p)
    ) || null;

  if (exactMatch) {
    return {
      id: exactMatch.id,
      participants: exactMatch.participant_ids,
      participantIds: exactMatch.participant_ids,
      lastMessageAt: exactMatch.updated_at,
      updatedAt: exactMatch.updated_at,
    };
  }

  // No conversation yet - create one
  const { data, error } = await supabase
    .from("conversations")
    .insert({ participant_ids: participants })
    .select()
    .maybeSingle();

  if (error || !data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error?.message || "Failed to create conversation",
    });
  }

  return {
    id: data.id,
    participants: data.participant_ids,
    participantIds: data.participant_ids,
    lastMessageAt: data.updated_at,
    updatedAt: data.updated_at,
  };
};

export const messagesRouter = createTRPCRouter({
  upsertConversation: protectedProcedure
    .input(z.object({ otherUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      return findOrCreateConversation(ctx.supabase, userId, input.otherUserId);
    }),

  listConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const { data: conversations, error } = await ctx.supabase
      .from("conversations")
      .select("id, participant_ids, updated_at")
      .contains("participant_ids", [userId])
      .order("updated_at", { ascending: false });

    if (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }

    const ids = conversations?.map((c) => c.id) || [];
    if (!ids.length) return [];

    const { data: messages, error: msgError } = await ctx.supabase
      .from("messages")
      .select(messageSelect)
      .in("conversation_id", ids)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (msgError) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msgError.message });
    }

    const latestByConversation: Record<string, any> = {};
    const unreadByConversation: Record<string, number> = {};

    (messages || []).forEach((msg: any) => {
      if (!latestByConversation[msg.conversation_id]) {
        latestByConversation[msg.conversation_id] = msg;
      }
      if (msg.receiver_id === userId && !msg.read) {
        unreadByConversation[msg.conversation_id] = (unreadByConversation[msg.conversation_id] || 0) + 1;
      }
    });

    // Fetch other participant profiles
    const otherUserIds = Array.from(
      new Set(
        conversations
          ?.flatMap((conv) => conv.participant_ids.filter((p: string) => p !== userId))
          .filter(Boolean) || []
      )
    );

    const { data: profiles, error: profileError } = await ctx.supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", otherUserIds);

    if (profileError) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: profileError.message });
    }

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return (conversations || []).map((conv: any) => {
      const otherId = conv.participant_ids.find((p: string) => p !== userId);
      const last = latestByConversation[conv.id];
      return {
        id: conv.id,
        participants: conv.participant_ids,
        participantIds: conv.participant_ids,
        otherUser: otherId ? profileMap.get(otherId) || null : null,
        lastMessage: last
          ? {
              id: last.id,
              senderId: last.sender_id,
              receiverId: last.receiver_id,
              content: last.content,
              read: last.read,
              createdAt: last.created_at,
            }
          : null,
        lastMessageAt: conv.updated_at,
        updatedAt: conv.updated_at,
        unreadCount: unreadByConversation[conv.id] || 0,
      };
    });
  }),

  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { conversationId } = input;

      const { data: conv, error: convError } = await ctx.supabase
        .from("conversations")
        .select("id, participant_ids, updated_at")
        .eq("id", conversationId)
        .maybeSingle();

      if (convError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: convError.message });
      }
      if (!conv || !conv.participant_ids?.includes(userId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
      }

      const otherId = conv.participant_ids.find((p: string) => p !== userId);
      let otherUser = null;
      if (otherId) {
        const { data: profile, error: profileError } = await ctx.supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .eq("id", otherId)
          .maybeSingle();
        if (profileError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: profileError.message });
        }
        otherUser = profile || null;
      }

      return {
        id: conv.id,
        participants: conv.participant_ids,
        participantIds: conv.participant_ids,
        otherUser,
        lastMessageAt: conv.updated_at,
        updatedAt: conv.updated_at,
      };
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        limit: z.number().min(10).max(200).default(100),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { conversationId, limit, cursor } = input;

      const { data: conversation, error: convError } = await ctx.supabase
        .from("conversations")
        .select("participant_ids")
        .eq("id", conversationId)
        .maybeSingle();

      if (convError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: convError.message });
      }
      if (!conversation || !conversation.participant_ids.includes(userId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
      }

      let query = ctx.supabase
        .from("messages")
        .select(messageSelect)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      const items = (data || []).reverse(); // return ascending
      let nextCursor: string | undefined = undefined;
      if (items.length > limit) {
        const next = items.shift();
        nextCursor = next?.created_at;
      }

      return {
        items: items.map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          content: m.content,
          read: m.read,
          deletedAt: m.deleted_at,
          createdAt: m.created_at,
        })),
        nextCursor,
      };
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        otherUserId: z.string().uuid(),
        content: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { otherUserId, content } = input;

      if (otherUserId === userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
      }

  const conversation = await findOrCreateConversation(ctx.supabase, userId, otherUserId);

      const { data: message, error } = await ctx.supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: userId,
          receiver_id: otherUserId,
          content,
        })
        .select(messageSelect)
        .single();

      if (error || !message) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message || "Send failed" });
      }

      // Touch the conversation updated_at for ordering
      await ctx.supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation.id);

      return {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        content: message.content,
        read: message.read,
        deletedAt: message.deleted_at,
        createdAt: message.created_at,
        participants: conversation.participantIds,
      };
    }),

  markRead: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { conversationId } = input;

      const { error } = await ctx.supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .eq("receiver_id", userId)
        .is("deleted_at", null);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    }),

  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { messageId } = input;

      const { data: message, error: fetchError } = await ctx.supabase
        .from("messages")
        .select("id, sender_id, receiver_id, conversation_id")
        .eq("id", messageId)
        .maybeSingle();

      if (fetchError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fetchError.message });
      }
      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      if (message.sender_id !== userId && message.receiver_id !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const { error } = await ctx.supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true, conversationId: message.conversation_id };
    }),
});

