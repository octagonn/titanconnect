import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, MessageCircle } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const postId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { currentUser } = useAuth();
  const [commentText, setCommentText] = useState('');

  const utils = trpc.useUtils();

  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = trpc.posts.getById.useQuery(
    { id: postId || '' },
    {
      enabled: !!postId,
    },
  );

  const toggleLikeMutation = trpc.posts.toggleLike.useMutation({
    onSuccess: () => {
      utils.posts.getById.invalidate({ id: postId || '' });
      utils.posts.getInfinite.invalidate();
    },
  });

  const addCommentMutation = trpc.posts.addComment.useMutation({
    onSuccess: () => {
      setCommentText('');
      utils.posts.getById.invalidate({ id: postId || '' });
      utils.posts.getInfinite.invalidate();
    },
  });

  const handleToggleLike = () => {
    if (!post) return;
    toggleLikeMutation.mutate({ postId: post.id });
  };

  const handleAddComment = useCallback(() => {
    if (!post || !commentText.trim()) return;
    addCommentMutation.mutate({
      postId: post.id,
      content: commentText.trim(),
    });
  }, [post, commentText, addCommentMutation]);

  if (!postId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>Invalid post link.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>Post not found.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLiked =
    !!currentUser && post.likedBy && post.likedBy.includes(currentUser.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image
            source={{ uri: post.userAvatar || 'https://i.pravatar.cc/150?img=0' }}
            style={styles.avatar}
          />
          <View style={styles.postHeaderText}>
            <Text style={styles.userName}>{post.userName}</Text>
            <Text style={styles.timeAgo}>{getTimeAgo(post.createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.postContent}>{post.content}</Text>

        {post.imageUrl && (
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.postImage}
            resizeMode="contain"
          />
        )}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleLike}>
            <Heart
              size={20}
              color={isLiked ? Colors.light.error : Colors.light.textSecondary}
              fill={isLiked ? Colors.light.error : 'transparent'}
            />
            <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
              {post.likes}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButton}>
            <MessageCircle size={20} color={Colors.light.textSecondary} />
            <Text style={styles.actionText}>{post.comments.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>Comments</Text>

        {post.comments.length === 0 ? (
          <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
        ) : (
          post.comments.map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <Image
                source={{ uri: comment.userAvatar || 'https://i.pravatar.cc/150?img=0' }}
                style={styles.commentAvatar}
              />
              <View style={styles.commentContent}>
                <Text style={styles.commentUserName}>{comment.userName}</Text>
                <Text style={styles.commentText}>{comment.content}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.addCommentBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={Colors.light.placeholder}
          value={commentText}
          onChangeText={setCommentText}
          multiline={Platform.OS !== 'web'}
        />
        <TouchableOpacity
          onPress={handleAddComment}
          disabled={!commentText.trim() || addCommentMutation.isPending}
        >
          <Text
            style={[
              styles.commentSubmit,
              (!commentText.trim() || addCommentMutation.isPending) && styles.commentSubmitDisabled,
            ]}
          >
            Post
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  messageText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600' as const,
  },
  postCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postHeaderText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 260,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  actionTextActive: {
    color: Colors.light.error,
  },
  commentsSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  noCommentsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  comment: {
    flexDirection: 'row',
    gap: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 10,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  addCommentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 6 : 8,
    fontSize: 14,
    color: Colors.light.text,
  },
  commentSubmit: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  commentSubmitDisabled: {
    color: Colors.light.placeholder,
  },
});


