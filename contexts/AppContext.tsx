import createContextHook from '@nkzw/create-context-hook';
import { useMemo } from 'react';
import { ConnectionWithUser, Conversation } from '@/types';
import { useAuth } from './AuthContext';
import { trpc } from '@/lib/trpc';

export const [AppContext, useApp] = createContextHook(() => {
  const { currentUser } = useAuth();
  const utils = trpc.useUtils();

  const connectionsQuery = trpc.connections.list.useQuery(undefined, {
    enabled: !!currentUser,
  });

  const conversationsQuery = trpc.messages.listConversations.useQuery(undefined, {
    enabled: !!currentUser,
  });

  const sendMessageMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      utils.messages.listConversations.invalidate();
    },
  });

  const markReadMutation = trpc.messages.markRead.useMutation({
    onSuccess: (_data, variables) => {
      utils.messages.listConversations.invalidate();
      utils.messages.getMessages.invalidate({ conversationId: variables.conversationId });
    },
  });

  const getOtherParticipant = (conversation: Conversation) => {
    if (!currentUser) return null;
    if ((conversation as any).otherUser) return (conversation as any).otherUser;
    const otherUserId = conversation.participants.find((id) => id !== currentUser.id);
    return otherUserId || null;
  };

  const unreadCount = useMemo(() => {
    if (!currentUser || !conversationsQuery.data) return 0;
    return conversationsQuery.data.reduce((sum, conv: any) => sum + (conv.unreadCount || 0), 0);
  }, [conversationsQuery.data, currentUser]);

  const connections = (connectionsQuery.data as ConnectionWithUser[] | undefined) ?? [];
  const conversations = (conversationsQuery.data as any[] | undefined) ?? [];

  return {
    connections,
    conversations,
    unreadCount,
    connectionsQuery,
    conversationsQuery,
    sendMessage: (receiverId: string, content: string) =>
      sendMessageMutation.mutateAsync({ otherUserId: receiverId, content }),
    markMessagesAsRead: (conversationId: string) => markReadMutation.mutateAsync({ conversationId }),
    getOtherParticipant,
  };
});
