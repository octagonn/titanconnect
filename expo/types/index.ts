export interface User {
  id: string;
  email: string;
  name: string;
  major: string;
  year: string;
  interests: string[];
  bio?: string;
  avatar?: string;
  createdAt?: string;
  isEmailVerified?: boolean;
  isProfileComplete?: boolean;
  role?: 'student' | 'faculty';
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  imageUrl?: string;
  likes: number;
  likedBy: string[];
  comments: Comment[];
  createdAt: string;
  category: 'all' | 'clubs' | 'events' | 'study';
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  hostId: string;
  hostName: string;
  location: string;
  date: string;
  time: string;
  imageUrl?: string;
  attendees: string[];
  interestedUsers: string[];
  comments?: Comment[];
  createdAt: string;
}

export interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
}

export interface Profile extends User {
  connections: Connection[];
  posts: Post[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageAt?: string;
  updatedAt: string;
  unreadCount?: number;
  otherUser?: {
    id: string;
    name?: string;
    avatar?: string;
  } | null;
}

export type ConnectionStatus = 'pending' | 'accepted' | 'blocked';

export interface ConnectionWithUser {
  id: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt?: string;
  direction: 'incoming' | 'outgoing';
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
}
