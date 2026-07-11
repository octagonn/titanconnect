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
  instagram?: string;
  linkedin?: string;
  linktree?: string;
  website?: string;
  points?: number;
}

export interface Notification {
  id: string;
  type:
    | 'message'
    | 'connection_request'
    | 'connection_accepted'
    | 'offer_new'
    | 'offer_accepted'
    | 'offer_declined'
    | 'deal_confirmed'
    | 'post_like'
    | 'post_comment'
    | 'post_tag';
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  postId?: string;
  postTitle?: string;
  conversationId?: string;
  connectionId?: string;
  offerId?: string;
  read: boolean;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isOwnPost?: boolean;
  content: string;
  imageUrl?: string;
  imageUrl2?: string;
  title?: string;
  scheduledAt?: string;
  location?: string;
  course?: string;
  price?: number;
  condition?: string;
  subtype?: 'thought' | 'poll' | 'wishbone';
  pollOptions?: { id: number; label: string }[];
  pollVotes?: number[];
  wishboneVotes?: [number, number];
  myVoteIndex?: number;
  tags?: string[];
  dealtWithUserId?: string;
  dealtWithUserName?: string;
  listingStatus?: 'available' | 'pending' | 'sold';
  paymentMethods?: string[];
  joinPolicy?: 'open' | 'approval';
  joinRequestStatus?: 'pending' | 'approved' | 'declined';
  mediaType?: 'image' | 'video';
  taggedUsers?: { id: string; name: string; avatar?: string }[];
  taggedEventId?: string;
  taggedEventTitle?: string;
  likes: number;
  likedBy: string[];
  comments: Comment[];
  createdAt: string;
  category: 'all' | 'clubs' | 'events' | 'study' | 'anon' | 'market';
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

export interface MarketplaceOffer {
  id: string;
  postId: string;
  buyerId: string;
  buyerName?: string;
  buyerAvatar?: string;
  amount: number;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'cancelled';
  createdAt: string;
  updatedAt: string;
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
