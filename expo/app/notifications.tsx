import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import Colors, { INK, palette } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { trpc } from '@/lib/trpc';
import ListRow from '@/components/ui/ListRow';
import Chip from '@/components/ui/Chip';
import HardShadow from '@/components/ui/HardShadow';

const ACTIVITY_COPY: Record<string, string> = {
  message: 'sent you a message',
  connection_accepted: 'accepted your connection request',
  offer_new: 'made an offer on your listing',
  offer_accepted: 'accepted your offer',
  offer_declined: 'declined your offer',
  deal_confirmed: 'confirmed the deal',
  post_like: 'liked your post',
  post_comment: 'commented on your post',
  post_tag: 'tagged you in a post',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { connections, conversations, connectionsQuery } = useApp();

  const incoming = useMemo(
    () => connections.filter((c) => c.status === 'pending' && c.direction === 'incoming'),
    [connections]
  );
  const outgoing = useMemo(
    () => connections.filter((c) => c.status === 'pending' && c.direction === 'outgoing'),
    [connections]
  );
  const unreadConversations = useMemo(
    () => conversations.filter((c: any) => c.unreadCount && c.unreadCount > 0),
    [conversations]
  );

  const respond = trpc.connections.respond.useMutation({
    onSuccess: () => connectionsQuery.refetch(),
  });
  const removeConnection = trpc.connections.remove.useMutation({
    onSuccess: () => connectionsQuery.refetch(),
  });

  const utils = trpc.useUtils();
  const activityQuery = trpc.notifications.list.useQuery({ limit: 30 });
  const activity = activityQuery.data?.items ?? [];

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const handleActivityPress = (item: (typeof activity)[number]) => {
    if (!item.read) markRead.mutate({ notificationId: item.id });
    if (item.type === 'message' && item.conversationId) {
      router.push(`/chat/${item.conversationId}` as any);
    } else if (item.type === 'connection_accepted' && item.actorId) {
      router.push(`/profile/${item.actorId}` as any);
    } else if (item.postId) {
      router.push(`/post/${item.postId}` as any);
    }
  };

  const hasNothing =
    incoming.length === 0 && outgoing.length === 0 && unreadConversations.length === 0 && activity.length === 0;

  return (
    <View style={styles.container}>
      {hasNothing ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing new</Text>
          <Text style={styles.emptySubtitle}>You&apos;re all caught up.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {incoming.length > 0 && (
            <View style={styles.sectionWrap}>
              <HardShadow offset={6} radius={20} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Friend Requests</Text>
                <View style={styles.rowList}>
                  {incoming.map((req) => (
                    <ListRow
                      key={req.id}
                      avatarUri={req.otherUser?.avatar}
                      avatarName={req.otherUser?.name}
                      title={req.otherUser?.name || 'Student'}
                      subtitle="Sent you a friend request"
                      trailing={
                        <View style={styles.inlineButtons}>
                          <Chip
                            label="Accept"
                            icon={Check}
                            variant="solid"
                            color={palette.blue}
                            size="sm"
                            onPress={() => respond.mutate({ connectionId: req.id, action: 'accept' })}
                            loading={respond.isPending && respond.variables?.connectionId === req.id}
                          />
                          <Chip
                            label="Decline"
                            icon={X}
                            variant="outline"
                            size="sm"
                            onPress={() => respond.mutate({ connectionId: req.id, action: 'decline' })}
                            loading={respond.isPending && respond.variables?.connectionId === req.id}
                          />
                        </View>
                      }
                    />
                  ))}
                </View>
              </View>
            </View>
          )}

          {outgoing.length > 0 && (
            <View style={styles.sectionWrap}>
              <HardShadow offset={6} radius={20} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Requests Sent</Text>
                <View style={styles.rowList}>
                  {outgoing.map((req) => (
                    <ListRow
                      key={req.id}
                      avatarUri={req.otherUser?.avatar}
                      avatarName={req.otherUser?.name}
                      title={req.otherUser?.name || 'Student'}
                      subtitle="Request pending"
                      trailing={
                        <Chip
                          label="Cancel"
                          icon={X}
                          variant="outline"
                          size="sm"
                          onPress={() =>
                            req.otherUser?.id && removeConnection.mutate({ targetUserId: req.otherUser.id })
                          }
                          loading={
                            removeConnection.isPending &&
                            removeConnection.variables?.targetUserId === req.otherUser?.id
                          }
                        />
                      }
                    />
                  ))}
                </View>
              </View>
            </View>
          )}

          {unreadConversations.length > 0 && (
            <View style={styles.sectionWrap}>
              <HardShadow offset={6} radius={20} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Messages</Text>
                <View style={styles.rowList}>
                  {unreadConversations.map((conv: any) => (
                    <ListRow
                      key={conv.id}
                      avatarUri={conv.otherUser?.avatar}
                      avatarName={conv.otherUser?.name}
                      title={conv.otherUser?.name || 'New message'}
                      subtitle={`${conv.unreadCount} unread`}
                      onPress={() => router.push(`/chat/${conv.id}` as any)}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}

          {activity.length > 0 && (
            <View style={styles.sectionWrap}>
              <HardShadow offset={6} radius={20} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Activity</Text>
                <View style={styles.rowList}>
                  {activity.map((item) => (
                    <ListRow
                      key={item.id}
                      avatarUri={item.actorAvatar}
                      avatarName={item.actorName || 'TitanConnect'}
                      title={item.actorName || 'Someone'}
                      subtitle={ACTIVITY_COPY[item.type] || 'sent you an update'}
                      unread={!item.read}
                      onPress={() => handleActivityPress(item)}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  sectionWrap: {
    position: 'relative',
  },
  section: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  rowList: {
    gap: 10,
  },
  inlineButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: INK,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
});
