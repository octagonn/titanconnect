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
  Alert,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const postId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { currentUser } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [postOptionsVisible, setPostOptionsVisible] = useState(false);
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [editPostContent, setEditPostContent] = useState('');
  const [commentOptions, setCommentOptions] = useState<{ id: string; content: string } | null>(null);
  const [showEditCommentModal, setShowEditCommentModal] = useState(false);
  const [editCommentContent, setEditCommentContent] = useState('');

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

  const updatePostMutation = trpc.posts.update.useMutation({
    onSuccess: () => {
      utils.posts.getById.invalidate({ id: postId || '' });
      utils.posts.getInfinite.invalidate();
      setShowEditPostModal(false);
    },
  });

  const deletePostMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      router.back();
    },
  });

  const updateCommentMutation = trpc.posts.updateComment.useMutation({
    onSuccess: () => {
      utils.posts.getById.invalidate({ id: postId || '' });
      utils.posts.getInfinite.invalidate();
      setShowEditCommentModal(false);
      setCommentOptions(null);
    },
  });

  const deleteCommentMutation = trpc.posts.deleteComment.useMutation({
    onSuccess: () => {
      utils.posts.getById.invalidate({ id: postId || '' });
      utils.posts.getInfinite.invalidate();
      setCommentOptions(null);
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

  const openPostOptions = () => {
    if (!post || post.userId !== currentUser?.id) return;
    setEditPostContent(post.content);
    setPostOptionsVisible(true);
    setShowEditPostModal(false);
  };

  const handleUpdatePost = () => {
    if (!post || !editPostContent.trim()) return;
    updatePostMutation.mutate({ postId: post.id, content: editPostContent.trim() });
  };

  const handleDeletePost = () => {
    if (!post) return;
    Alert.alert('Delete post?', 'This will remove the post and its comments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePostMutation.mutate({ postId: post.id }),
      },
    ]);
  };

  const openCommentOptions = (comment: { id: string; content: string; userId: string }) => {
    if (comment.userId !== currentUser?.id) return;
    setCommentOptions({ id: comment.id, content: comment.content });
    setEditCommentContent(comment.content);
  };

  const handleUpdateComment = () => {
    if (!commentOptions || !editCommentContent.trim()) return;
    updateCommentMutation.mutate({
      commentId: commentOptions.id,
      content: editCommentContent.trim(),
    });
  };

  const handleDeleteComment = () => {
    if (!commentOptions) return;
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCommentMutation.mutate({ commentId: commentOptions.id }),
      },
    ]);
  };

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
          {currentUser?.id === post.userId && (
            <TouchableOpacity onPress={openPostOptions} style={styles.moreButton}>
              <MoreHorizontal size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          )}
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
                {comment.userId === currentUser?.id && (
                  <TouchableOpacity
                    style={styles.commentOptions}
                    onPress={() => openCommentOptions(comment)}
                  >
                    <MoreHorizontal size={16} color={Colors.light.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <Modal
        visible={postOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPostOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setPostOptionsVisible(false)}
        >
          <View style={styles.optionsCard}>
            <TouchableOpacity
              style={styles.optionsItem}
              onPress={() => {
                setPostOptionsVisible(false);
                setShowEditPostModal(true);
              }}
            >
              <Text style={styles.optionsItemText}>Edit Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsItem}
              onPress={() => {
                setPostOptionsVisible(false);
                handleDeletePost();
              }}
            >
              <Text style={styles.optionsItemDestructive}>Delete Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionsCancel} onPress={() => setPostOptionsVisible(false)}>
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showEditPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditPostModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.optionsOverlay}
        >
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TouchableOpacity onPress={() => setShowEditPostModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.postInput}
              placeholder="Update your post..."
              placeholderTextColor={Colors.light.placeholder}
              value={editPostContent}
              onChangeText={setEditPostContent}
              multiline
            />
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={[
                  styles.postButton,
                  (!editPostContent.trim() || updatePostMutation.isPending) && styles.postButtonDisabled,
                ]}
                onPress={handleUpdatePost}
                disabled={!editPostContent.trim() || updatePostMutation.isPending}
              >
                {updatePostMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!commentOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentOptions(null)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setCommentOptions(null)}
        >
          <View style={styles.optionsCard}>
            <TouchableOpacity
              style={styles.optionsItem}
              onPress={() => {
                setShowEditCommentModal(true);
                setCommentOptions((prev) => prev);
              }}
            >
              <Text style={styles.optionsItemText}>Edit Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsItem}
              onPress={() => {
                handleDeleteComment();
              }}
            >
              <Text style={styles.optionsItemDestructive}>Delete Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionsCancel} onPress={() => setCommentOptions(null)}>
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showEditCommentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditCommentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.optionsOverlay}
        >
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Comment</Text>
              <TouchableOpacity onPress={() => setShowEditCommentModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.postInput}
              placeholder="Update your comment..."
              placeholderTextColor={Colors.light.placeholder}
              value={editCommentContent}
              onChangeText={setEditCommentContent}
              multiline
            />
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={[
                  styles.postButton,
                  (!editCommentContent.trim() || updateCommentMutation.isPending) && styles.postButtonDisabled,
                ]}
                onPress={handleUpdateComment}
                disabled={!editCommentContent.trim() || updateCommentMutation.isPending}
              >
                {updateCommentMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  modalClose: {
    fontSize: 16,
    color: Colors.light.textSecondary,
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
  postInput: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  postButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 100,
  },
  postButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
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
    position: 'relative',
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
  commentOptions: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
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
  moreButton: {
    padding: 6,
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  optionsCard: {
    backgroundColor: Colors.light.card,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 8,
  },
  optionsItem: {
    paddingVertical: 12,
  },
  optionsItemText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600' as const,
  },
  optionsItemDestructive: {
    fontSize: 16,
    color: Colors.light.error,
    fontWeight: '700' as const,
  },
  optionsCancel: {
    paddingVertical: 12,
  },
  optionsCancelText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  editModalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  editModalActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});


