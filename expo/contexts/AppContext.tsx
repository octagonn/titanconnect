import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useState } from 'react';
import { ConnectionWithUser, Conversation } from '@/types';
import { useAuth } from './AuthContext';
import { trpc } from '@/lib/trpc';
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime';

export const [AppContext, useApp] = createContextHook(() => {
  const { currentUser } = useAuth();
  const utils = trpc.useUtils();
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  useNotificationRealtime();

  const connectionsQuery = trpc.connections.list.useQuery(undefined, {
    enabled: !!currentUser,
  });

  const conversationsQuery = trpc.messages.listConversations.useQuery(undefined, {
    enabled: !!currentUser,
  });

  const notificationsUnreadCountQuery = trpc.notifications.unreadCount.useQuery(undefined, {
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

  // Badge count for the notifications bell: unread rows in the notifications
  // table, which already covers messages, connections, marketplace offers,
  // and post engagement.
  const notificationCount = notificationsUnreadCountQuery.data ?? 0;

  return {
    connections,
    conversations,
    unreadCount,
    notificationCount,
    connectionsQuery,
    conversationsQuery,
    sendMessage: (receiverId: string, content: string) =>
      sendMessageMutation.mutateAsync({ otherUserId: receiverId, content }),
    markMessagesAsRead: (conversationId: string) => markReadMutation.mutateAsync({ conversationId }),
    getOtherParticipant,
    isCreateMenuOpen,
    openCreateMenu: () => setIsCreateMenuOpen(true),
    closeCreateMenu: () => setIsCreateMenuOpen(false),
  };
});
