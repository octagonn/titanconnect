import { useRouter } from 'expo-router';
import { Search, Plus } from 'lucide-react-native';
import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/types';
import { useMessageRealtime } from '@/hooks/useMessageRealtime';
import { trpc } from '@/lib/trpc';

export default function MessagesScreen() {
  const { conversations, conversationsQuery, connections, getOtherParticipant } = useApp();
  const { currentUser } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  useMessageRealtime();
  const respondMutation = trpc.connections.respond.useMutation({
    onSuccess: () => {
      conversationsQuery.refetch();
    },
  });
  const upsertConversation = trpc.messages.upsertConversation.useMutation({
    onSuccess: (conv) => {
      setShowNewMessage(false);
      router.push(`/chat/${conv.id}` as any);
    },
  });

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    return conversations.filter((conv) => {
      const otherUser = (conv as any).otherUser || getOtherParticipant(conv);
      return otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery, getOtherParticipant]);

  const handleRefresh = useCallback(() => {
    conversationsQuery.refetch();
  }, [conversationsQuery]);

  const incomingRequests = useMemo(
    () => connections.filter((c) => c.status === 'pending' && c.direction === 'incoming'),
    [connections]
  );

  const handleRespond = (connectionId: string, action: 'accept' | 'decline') => {
    respondMutation.mutate({ connectionId, action });
  };

  const friendOptions = useMemo(
    () => connections.filter((c) => c.status === 'accepted' && c.otherUser),
    [connections]
  );

  const startConversation = (userId: string) => {
    upsertConversation.mutate({ otherUserId: userId });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = (item as any).otherUser || getOtherParticipant(item);
    if (!otherUser) return null;

    const isUnread =
      item.lastMessage &&
      item.lastMessage.receiverId === currentUser?.id &&
      !item.lastMessage.read;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push(`/chat/${item.id}` as any)}
        testID={`conversation-${item.id}`}
      >
        <Image
          source={{ uri: otherUser.avatar || 'https://i.pravatar.cc/150?img=0' }}
          style={styles.avatar}
        />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, isUnread && styles.unreadText]}>
              {otherUser.name}
            </Text>
            <Text style={styles.timeAgo}>
              {item.lastMessage ? getTimeAgo(item.lastMessage.createdAt) : ''}
            </Text>
          </View>
          <Text
            style={[styles.lastMessage, isUnread && styles.unreadText]}
            numberOfLines={1}
          >
            {item.lastMessage?.content || 'No messages yet'}
          </Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.light.placeholder} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor={Colors.light.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="search-input"
        />
        <TouchableOpacity style={styles.newMessageButton} onPress={() => setShowNewMessage(true)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.newMessageText}>New Message</Text>
        </TouchableOpacity>
      </View>

      {filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No conversations found' : 'No messages yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {!searchQuery && 'Start a conversation with your connections'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={conversationsQuery.isRefetching}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            incomingRequests.length > 0 ? (
              <View style={styles.requestSection}>
                <Text style={styles.requestTitle}>Friend requests</Text>
                {incomingRequests.map((req) => (
                  <View key={req.id} style={styles.requestRow}>
                    <View style={styles.requestUser}>
                      <Image
                        source={{ uri: req.otherUser?.avatar || 'https://i.pravatar.cc/150?img=0' }}
                        style={styles.requestAvatar}
                      />
                      <Text style={styles.requestName}>{req.otherUser?.name || 'Unknown'}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.acceptButton]}
                        onPress={() => handleRespond(req.id, 'accept')}
                      >
                        <Text style={styles.requestButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.declineButton]}
                        onPress={() => handleRespond(req.id, 'decline')}
                      >
                        <Text style={[styles.requestButtonText, styles.declineText]}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      )}

      <Modal visible={showNewMessage} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowNewMessage(false)} />
          <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Message</Text>
            <TouchableOpacity onPress={() => setShowNewMessage(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {friendOptions.length === 0 ? (
            <View style={styles.emptyModal}>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>Add friends to start messaging.</Text>
            </View>
          ) : (
              <FlatList
                data={friendOptions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.friendRow}
                    onPress={() => startConversation(item.otherUser!.id)}
                    disabled={upsertConversation.isPending}
                  >
                    <Image
                      source={{ uri: item.otherUser?.avatar || 'https://i.pravatar.cc/150?img=0' }}
                      style={styles.friendAvatar}
                    />
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{item.otherUser?.name}</Text>
                      <Text style={styles.friendMeta}>Tap to start a conversation</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={styles.friendList}
                keyboardShouldPersistTaps="handled"
              />
          )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.light.text,
  },
  newMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: 8,
    gap: 6,
  },
  newMessageText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  unreadText: {
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  requestSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 8,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  requestUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  requestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  requestName: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '600' as const,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  acceptButton: {
    backgroundColor: Colors.light.primary,
  },
  declineButton: {
    backgroundColor: Colors.light.border,
  },
  requestButtonText: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  declineText: {
    color: Colors.light.text,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    marginTop: 'auto',
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  modalClose: {
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  friendMeta: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginLeft: 76,
  },
  friendList: {
    paddingBottom: 16,
  },
  emptyModal: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 6,
  },
});
