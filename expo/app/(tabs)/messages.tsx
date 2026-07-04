import { useRouter } from 'expo-router';
import { Search, Plus } from 'lucide-react-native';
import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import { showAlert } from '@/lib/alert';
import Colors, { INK, palette } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/types';
import { useMessageRealtime } from '@/hooks/useMessageRealtime';
import { trpc } from '@/lib/trpc';
import HardShadow from '@/components/ui/HardShadow';
import ListRow from '@/components/ui/ListRow';
import Chip from '@/components/ui/Chip';

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
      // Refresh conversations so Chat screen has the conversation in context
      conversationsQuery.refetch();
      setShowNewMessage(false);
      router.push(`/chat/${conv.id}` as any);
    },
    onError: (err) => {
      showAlert('Message failed', err.message || 'Could not start conversation. Please try again.');
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
      <ListRow
        avatarUri={otherUser.avatar}
        avatarName={otherUser.name}
        title={otherUser.name}
        subtitle={item.lastMessage?.content || 'No messages yet'}
        meta={item.lastMessage ? getTimeAgo(item.lastMessage.createdAt) : ''}
        unread={!!isUnread}
        onPress={() => router.push(`/chat/${item.id}` as any)}
        style={styles.conversationItem}
      />
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
        <View style={styles.newMessageWrap}>
          <HardShadow offset={4} radius={18} />
          <TouchableOpacity style={styles.newMessageButton} onPress={() => setShowNewMessage(true)}>
            <Plus size={18} color="#fff" strokeWidth={2.5} />
            <Text style={styles.newMessageText}>New Message</Text>
          </TouchableOpacity>
        </View>
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
                  <ListRow
                    key={req.id}
                    avatarUri={req.otherUser?.avatar}
                    avatarName={req.otherUser?.name}
                    title={req.otherUser?.name || 'Unknown'}
                    style={styles.requestRow}
                    trailing={
                      <View style={styles.requestActions}>
                        <Chip
                          label="Accept"
                          variant="solid"
                          color={palette.blue}
                          size="sm"
                          onPress={() => handleRespond(req.id, 'accept')}
                        />
                        <Chip
                          label="Decline"
                          variant="outline"
                          size="sm"
                          onPress={() => handleRespond(req.id, 'decline')}
                        />
                      </View>
                    }
                  />
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
                  <ListRow
                    avatarUri={item.otherUser?.avatar}
                    avatarName={item.otherUser?.name}
                    title={item.otherUser?.name || 'Student'}
                    subtitle="Tap to start a conversation"
                    onPress={() => startConversation(item.otherUser!.id)}
                    style={styles.friendRow}
                  />
                )}
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
    backgroundColor: Colors.light.feedBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: INK,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  newMessageWrap: {
    position: 'relative',
    marginLeft: 8,
  },
  newMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.orange,
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  newMessageText: {
    color: '#fff',
    fontWeight: '900' as const,
    fontSize: 13,
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    marginHorizontal: 12,
    marginVertical: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  requestSection: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: INK,
    gap: 10,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: Colors.light.text,
    paddingHorizontal: 4,
  },
  requestRow: {
    marginHorizontal: 0,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22,13,40,0.5)',
  },
  modalSheet: {
    marginTop: 'auto',
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 3,
    borderColor: INK,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2.5,
    borderBottomColor: INK,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  modalClose: {
    color: Colors.light.textSecondary,
    fontWeight: '800' as const,
  },
  friendRow: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  friendList: {
    paddingVertical: 8,
    paddingBottom: 16,
  },
  emptyModal: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 6,
  },
});
