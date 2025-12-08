import { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Bell, UserPlus, MessageCircle, AtSign } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

type NotificationItem = {
  id: string;
  type: 'friend_request' | 'message' | 'mention';
  title: string;
  subtitle?: string;
  icon: JSX.Element;
};

export default function NotificationsScreen() {
  const { connections, conversations } = useApp();

  const items = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    connections
      .filter((c) => c.status === 'pending' && c.direction === 'incoming')
      .forEach((req) => {
        list.push({
          id: `req-${req.id}`,
          type: 'friend_request',
          title: `${req.otherUser?.name || 'Someone'} sent you a friend request`,
          subtitle: 'Tap Messages to accept or decline',
          icon: <UserPlus size={18} color={Colors.light.primary} />,
        });
      });

    conversations
      .filter((c: any) => c.unreadCount && c.unreadCount > 0)
      .forEach((conv: any) => {
        list.push({
          id: `msg-${conv.id}`,
          type: 'message',
          title: `${conv.otherUser?.name || 'New message'}`,
          subtitle: `${conv.unreadCount} unread`,
          icon: <MessageCircle size={18} color={Colors.light.secondary} />,
        });
      });

    return list;
  }, [connections, conversations]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Bell size={20} color={Colors.light.text} />
        <Text style={styles.headerText}>Notifications</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing new</Text>
          <Text style={styles.emptySubtitle}>You’re all caught up.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.iconWrap}>{item.icon}</View>
              <View style={styles.itemText}>
                <Text style={styles.title}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  listContent: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginLeft: 64,
  },
});

