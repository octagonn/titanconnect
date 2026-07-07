import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TextInput, TouchableOpacity, Pressable, ScrollView, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { showAlert } from '@/lib/alert';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, MessageCircle, MoreHorizontal, Star } from 'lucide-react-native';

import Colors, { INK, palette } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/ui/Avatar';
import HardShadow from '@/components/ui/HardShadow';

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
    showAlert('Delete post?', 'This will remove the post and its comments.', [
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
    showAlert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCommentMutation.mutate({ commentId: commentOptions.id }),
      },
    ]);
  };

  const headerScreen = <Stack.Screen options={{ title: post?.title || 'Post' }} />;

  if (!postId) {
    return (
      <>
        {headerScreen}
        <View style={styles.centerContainer}>
          <Text style={styles.messageText}>Invalid post link.</Text>
        </View>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        {headerScreen}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </>
    );
  }

  if (isError || !post) {
    return (
      <>
        {headerScreen}
        <View style={styles.centerContainer}>
          <Text style={styles.messageText}>Post not found.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const isLiked =
    !!currentUser && post.likedBy && post.likedBy.includes(currentUser.id);

  return (
    <>
      {headerScreen}
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.postCardWrap}>
      <HardShadow offset={8} radius={24} />
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Pressable
            style={styles.postHeaderIdentity}
            disabled={post.category === 'anon'}
            onPress={() => router.push(`/profile/${post.userId}` as any)}
          >
            <Avatar uri={post.userAvatar} name={post.userName} size={44} />
            <View style={styles.postHeaderText}>
              <Text style={styles.userName}>{post.userName}</Text>
              <Text style={styles.timeAgo}>{getTimeAgo(post.createdAt)}</Text>
            </View>
          </Pressable>
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
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              post.category === 'events' && isLiked && styles.interestActive,
              { transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
            onPress={handleToggleLike}
            disabled={toggleLikeMutation.isPending}
          >
            {toggleLikeMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.light.textSecondary} />
            ) : post.category === 'events' ? (
              <Star
                size={18}
                color={isLiked ? '#FFFFFF' : Colors.light.textSecondary}
                fill={isLiked ? '#FFFFFF' : 'transparent'}
                strokeWidth={2.5}
              />
            ) : (
              <Heart
                size={20}
                color={isLiked ? Colors.light.error : Colors.light.textSecondary}
                fill={isLiked ? Colors.light.error : 'transparent'}
                strokeWidth={2.5}
              />
            )}
            <Text
              style={[
                styles.actionText,
                isLiked && (post.category === 'events' ? styles.interestTextActive : styles.actionTextActive),
              ]}
            >
              {post.category === 'events'
                ? isLiked
                  ? 'Interested'
                  : 'Interested?'
                : post.category === 'study'
                ? isLiked
                  ? 'Joined'
                  : 'Join'
                : post.likes}
            </Text>
          </Pressable>

          <View style={styles.actionButton}>
            <MessageCircle size={20} color={Colors.light.textSecondary} strokeWidth={2.5} />
            <Text style={styles.actionText}>{post.comments.length}</Text>
          </View>
        </View>
      </View>
      </View>

      <View style={styles.commentsSectionWrap}>
      <HardShadow offset={6} radius={20} />
      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>Comments</Text>

        {post.comments.length === 0 ? (
          <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
        ) : (
          post.comments.map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <Pressable onPress={() => router.push(`/profile/${comment.userId}` as any)}>
                <Avatar uri={comment.userAvatar} name={comment.userName} size={32} />
              </Pressable>
              <View style={styles.commentContent}>
                <Pressable onPress={() => router.push(`/profile/${comment.userId}` as any)}>
                  <Text style={styles.commentUserName}>{comment.userName}</Text>
                </Pressable>
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
              <View style={styles.postButtonWrap}>
                {!(!editPostContent.trim() || updatePostMutation.isPending) && (
                  <HardShadow offset={5} radius={18} />
                )}
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
              <View style={styles.postButtonWrap}>
                {!(!editCommentContent.trim() || updateCommentMutation.isPending) && (
                  <HardShadow offset={5} radius={18} />
                )}
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
          {addCommentMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : (
            <Text
              style={[
                styles.commentSubmit,
                !commentText.trim() && styles.commentSubmitDisabled,
              ]}
            >
              Post
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
    </>
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
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: INK,
    backgroundColor: Colors.light.primary,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '900' as const,
  },
  postCardWrap: {
    position: 'relative',
  },
  postCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: INK,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  postHeaderIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.light.textSecondary,
  },
  postHeaderText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  timeAgo: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: INK,
    marginBottom: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 2.5,
    borderTopColor: INK,
  },
  postInput: {
    backgroundColor: Colors.light.card,
    borderWidth: 2.5,
    borderColor: INK,
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  postButtonWrap: {
    position: 'relative',
  },
  postButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: INK,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 100,
  },
  postButtonDisabled: {
    backgroundColor: '#C7C2D6',
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900' as const,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '800' as const,
  },
  actionTextActive: {
    color: Colors.light.error,
  },
  interestActive: {
    backgroundColor: palette.orange,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  interestTextActive: {
    color: '#FFFFFF',
  },
  commentsSectionWrap: {
    position: 'relative',
  },
  commentsSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    padding: 16,
    gap: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  noCommentsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  comment: {
    flexDirection: 'row',
    gap: 8,
    position: 'relative',
  },
  commentContent: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 14,
    padding: 10,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    fontWeight: '500' as const,
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
    backgroundColor: Colors.light.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 3,
    borderColor: INK,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 6 : 8,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  commentSubmit: {
    fontSize: 14,
    fontWeight: '900' as const,
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
    backgroundColor: 'rgba(22,13,40,0.5)',
    justifyContent: 'flex-end',
  },
  optionsCard: {
    backgroundColor: Colors.light.card,
    padding: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 3,
    borderColor: INK,
    gap: 8,
  },
  optionsItem: {
    paddingVertical: 12,
  },
  optionsItemText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '700' as const,
  },
  optionsItemDestructive: {
    fontSize: 16,
    color: Colors.light.error,
    fontWeight: '900' as const,
  },
  optionsCancel: {
    paddingVertical: 12,
  },
  optionsCancelText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  editModalContent: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 3,
    borderColor: INK,
    padding: 24,
  },
  editModalActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});


