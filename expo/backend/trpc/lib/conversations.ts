import { TRPCError } from "@trpc/server";

export const generateParticipants = (userA: string, userB: string) => {
  return [userA, userB].sort();
};

export const findOrCreateConversation = async (
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
