import { useLocalSearchParams, useNavigation } from 'expo-router';
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
} from 'react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  const {
    conversations,
    getConversationMessages,
    getOtherParticipant,
    sendMessage,
    markMessagesAsRead,
  } = useApp();

  const [messageText, setMessageText] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);

  const conversation = conversations.find((conv) => conv.id === id);
  const otherUser = conversation ? getOtherParticipant(conversation) : null;
  const conversationMessages = id ? getConversationMessages(id) : [];

  useLayoutEffect(() => {
    if (otherUser) {
      navigation.setOptions({
        title: otherUser.name,
      });
    }
  }, [navigation, otherUser]);

  useEffect(() => {
    if (id) {
      markMessagesAsRead(id);
    }
  }, [id, markMessagesAsRead]);

  const handleSend = useCallback(() => {
    if (!messageText.trim() || !otherUser || !currentUser) return;

    sendMessage(otherUser.id, messageText.trim());
    setMessageText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messageText, otherUser, currentUser, sendMessage]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = item.senderId === currentUser?.id;

      return (
        <View
          style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}
        >
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
      );
    },
    [currentUser, otherUser]
  );

  if (!conversation || !otherUser) {
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
