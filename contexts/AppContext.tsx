import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';
import { Post, Event, Connection, Message, Conversation } from '@/types';
import { mockPosts, mockEvents, mockMessages, mockConversations, mockUsers } from '@/mocks/data';
import { useAuth } from './AuthContext';

export const [AppContext, useApp] = createContextHook(() => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);

  const addPost = useCallback((content: string, category: Post['category'] = 'all') => {
    if (!currentUser) return;

    const newPost: Post = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content,
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
      category,
    };

    setPosts((prev) => [newPost, ...prev]);
  }, [currentUser]);

  const toggleLike = useCallback((postId: string) => {
    if (!currentUser) return;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isLiked = post.likedBy.includes(currentUser.id);
          return {
            ...post,
            likes: isLiked ? post.likes - 1 : post.likes + 1,
            likedBy: isLiked
              ? post.likedBy.filter((id) => id !== currentUser.id)
              : [...post.likedBy, currentUser.id],
          };
        }
        return post;
      })
    );
  }, [currentUser]);

  const addComment = useCallback((postId: string, content: string) => {
    if (!currentUser) return;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [
              ...post.comments,
              {
                id: Date.now().toString(),
                userId: currentUser.id,
                userName: currentUser.name,
                userAvatar: currentUser.avatar,
                content,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }
        return post;
      })
    );
  }, [currentUser]);

  const toggleEventRSVP = useCallback((eventId: string, type: 'attending' | 'interested') => {
    if (!currentUser) return;

    setEvents((prev) =>
      prev.map((event) => {
        if (event.id === eventId) {
          if (type === 'attending') {
            const isAttending = event.attendees.includes(currentUser.id);
            return {
              ...event,
              attendees: isAttending
                ? event.attendees.filter((id) => id !== currentUser.id)
                : [...event.attendees, currentUser.id],
              interestedUsers: event.interestedUsers.filter((id) => id !== currentUser.id),
            };
          } else {
            const isInterested = event.interestedUsers.includes(currentUser.id);
            return {
              ...event,
              interestedUsers: isInterested
                ? event.interestedUsers.filter((id) => id !== currentUser.id)
                : [...event.interestedUsers, currentUser.id],
              attendees: event.attendees.filter((id) => id !== currentUser.id),
            };
          }
        }
        return event;
      })
    );
  }, [currentUser]);

  const addConnection = useCallback((connectedUserId: string) => {
    if (!currentUser) return;

    const newConnection: Connection = {
      id: Date.now().toString(),
      userId: currentUser.id,
      connectedUserId,
      status: 'accepted',
      createdAt: new Date().toISOString(),
    };

    setConnections((prev) => [...prev, newConnection]);
  }, [currentUser]);

  const sendMessage = useCallback((receiverId: string, content: string) => {
    if (!currentUser) return;

    const existingConversation = conversations.find((conv) =>
      conv.participants.includes(currentUser.id) && conv.participants.includes(receiverId)
    );

    const conversationId = existingConversation?.id || `conv${Date.now()}`;

    const newMessage: Message = {
      id: `m${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      receiverId,
      content,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);

    if (existingConversation) {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, lastMessage: newMessage, updatedAt: newMessage.createdAt }
            : conv
        )
      );
    } else {
      const newConversation: Conversation = {
        id: conversationId,
        participants: [currentUser.id, receiverId],
        lastMessage: newMessage,
        updatedAt: newMessage.createdAt,
      };
      setConversations((prev) => [newConversation, ...prev]);
    }
  }, [currentUser, conversations]);

  const markMessagesAsRead = useCallback((conversationId: string) => {
    if (!currentUser) return;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.conversationId === conversationId && msg.receiverId === currentUser.id
          ? { ...msg, read: true }
          : msg
      )
    );
  }, [currentUser]);

  const getConversationMessages = useCallback(
    (conversationId: string) => {
      return messages.filter((msg) => msg.conversationId === conversationId);
    },
    [messages]
  );

  const getOtherParticipant = useCallback(
    (conversation: Conversation) => {
      if (!currentUser) return null;
      const otherUserId = conversation.participants.find((id) => id !== currentUser.id);
      return mockUsers.find((user) => user.id === otherUserId) || null;
    },
    [currentUser]
  );

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return messages.filter((msg) => msg.receiverId === currentUser.id && !msg.read).length;
  }, [messages, currentUser]);

  return useMemo(
    () => ({
      posts,
      events,
      connections,
      messages,
      conversations,
      unreadCount,
      addPost,
      toggleLike,
      addComment,
      toggleEventRSVP,
      addConnection,
      sendMessage,
      markMessagesAsRead,
      getConversationMessages,
      getOtherParticipant,
    }),
    [
      posts,
      events,
      connections,
      messages,
      conversations,
      unreadCount,
      addPost,
      toggleLike,
      addComment,
      toggleEventRSVP,
      addConnection,
      sendMessage,
      markMessagesAsRead,
      getConversationMessages,
      getOtherParticipant,
    ]
  );
});
