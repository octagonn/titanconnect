import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types';
import { trpc } from '@/lib/trpc';
import { useMessageRealtime } from '@/hooks/useMessageRealtime';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { conversations, getOtherParticipant, markMessagesAsRead } = useApp();
  useMessageRealtime();

  const [messageText, setMessageText] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);

  const conversationFromList = conversations.find((conv) => conv.id === id);
  const conversationQuery = trpc.messages.getConversation.useQuery(
    { conversationId: id! },
    { enabled: !!id && !conversationFromList }
  );

  const conversation = conversationFromList || conversationQuery.data || null;
  const otherUser = conversation ? (conversation as any).otherUser || getOtherParticipant(conversation) : null;

  const messagesQuery = trpc.messages.getMessages.useInfiniteQuery(
    { conversationId: id!, limit: 50 },
    {
      enabled: !!id && !!currentUser,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    }
  );

  const sendMessageMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText('');
      messagesQuery.refetch();
    },
    onError: (err) => {
      Alert.alert('Send failed', err.message || 'Could not send message. Please try again.');
    },
  });

  const deleteMessageMutation = trpc.messages.deleteMessage.useMutation({
    onSuccess: () => {
      messagesQuery.refetch();
    },
  });

  const conversationMessages =
    messagesQuery.data?.pages.flatMap((page) => page.items).filter((m) => !m.deletedAt) ?? [];

  useLayoutEffect(() => {
    if (otherUser) {
      navigation.setOptions({
        title: otherUser.name,
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push(`/profile/${otherUser.id}` as any)}>
            <Text style={{ color: Colors.light.primary, fontWeight: '600' }}>Profile</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, otherUser, router]);

  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    if (!id || !currentUser) return;
    if (markingRead) return;

    const hasUnread = conversationMessages.some(
      (m) => m.receiverId === currentUser.id && !m.read
    );

    if (!hasUnread) return;

    setMarkingRead(true);
    markMessagesAsRead(id).finally(() => setMarkingRead(false));
  }, [id, currentUser?.id, conversationMessages, markingRead, markMessagesAsRead]);

  const handleSend = useCallback(() => {
    if (!messageText.trim() || !otherUser || !currentUser) return;

    sendMessageMutation.mutate({ otherUserId: otherUser.id, content: messageText.trim() });
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messageText, otherUser, currentUser, sendMessageMutation]);

  const confirmDelete = useCallback(
    (message: Message) => {
      Alert.alert('Delete message?', 'This will remove the message for both participants.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessageMutation.mutate({ messageId: message.id }),
        },
      ]);
    },
    [deleteMessageMutation]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = item.senderId === currentUser?.id;

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => confirmDelete(item)}
          delayLongPress={300}
        >
          <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
            {!isMe && otherUser && (
              <Image
                source={{ uri: otherUser.avatar || 'https://i.pravatar.cc/150?img=0' }}
                style={styles.messageAvatar}
              />
            )}
            <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
              <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                {item.content}
              </Text>
              <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
            {isMe && currentUser && (
              <Image
                source={{ uri: currentUser.avatar || 'https://i.pravatar.cc/150?img=0' }}
                style={styles.messageAvatar}
              />
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [currentUser, otherUser, confirmDelete]
  );

  if (!conversation || !otherUser) {
    if (conversationQuery.isLoading) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Loading conversation...</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Conversation not found</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >

      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        refreshing={messagesQuery.isRefetching}
        onRefresh={messagesQuery.refetch}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={Colors.light.placeholder}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
          testID="message-input"
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim()}
          testID="send-button"
        >
          <Send size={20} color={messageText.trim() ? '#ffffff' : Colors.light.placeholder} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    gap: 8,
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: Colors.light.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: Colors.light.card,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.light.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
});
