import { Heart, MessageCircle,Mail, BookOpenText, MessageCircleHeart, Plus, Image as ImageIcon, X, MoreHorizontal, Award, GraduationCap, University } from 'lucide-react-native';
import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Post, Comment } from '@/types';
import { trpc } from '@/lib/trpc';
import { uploadImage } from '@/lib/storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import styles from '@/styles/home.styles';

// Helper to show alerts safely on web
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function HomeScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreatePost, setShowCreatePost] = useState<boolean>(false);
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);
  const [profileModalId, setProfileModalId] = useState<string | null>(null);
  const reportsMutation = trpc.reports.reportUser.useMutation();
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({});
  const [commentLiked, setCommentLiked] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [commentReplies, setCommentReplies] = useState<
    Record<
      string,
      Array<{
        id: string;
        userId: string;
        userName: string;
        userAvatar?: string;
        content: string;
        createdAt: string;
      }>
    >
  >({});
  const [postOptionsId, setPostOptionsId] = useState<string | null>(null);
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState<string>('');
  const [commentOptions, setCommentOptions] = useState<{ id: string; content: string } | null>(null);
  const [showEditCommentModal, setShowEditCommentModal] = useState(false);
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState<string>('');

  const utils = trpc.useUtils();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = trpc.posts.getInfinite.useInfiniteQuery(
    {
      limit: 10,
      search: searchQuery.trim() || undefined,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        p.userName.toLowerCase().includes(q)
    );
  }, [posts, searchQuery]);

  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      setNewPostContent('');
      setSelectedImage(null);
      setShowCreatePost(false);
      setIsPosting(false);
    },
    onError: (error) => {
      console.error('Create Post Error:', error);
      showAlert('Error', error.message || 'Failed to create post');
      setIsPosting(false);
    },
  });

  const toggleLikeMutation = trpc.posts.toggleLike.useMutation({
    // Optimistic UI for smoother like experience
    onMutate: async ({ postId }) => {
      await utils.posts.getInfinite.cancel();
      const input = { limit: 10, search: searchQuery.trim() || undefined };
      const previous = utils.posts.getInfinite.getData(input);

      utils.posts.getInfinite.setInfiniteData(input, (data) => {
        if (!data) return data;
        return {
          pageParams: data.pageParams,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((p: Post) => {
              if (p.id !== postId) return p;
              const liked = p.likedBy.includes(currentUser?.id || '');
              const nextLikedBy = liked
                ? p.likedBy.filter((id) => id !== (currentUser?.id || ''))
                : [...p.likedBy, currentUser?.id || ''];
              return {
                ...p,
                likedBy: nextLikedBy,
                likes: liked ? Math.max(0, p.likes - 1) : p.likes + 1,
              };
            }),
          })),
        };
      });

      return { previous, input };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        utils.posts.getInfinite.setInfiniteData(context.input, context.previous);
      }
    },
  });

  const addCommentMutation = trpc.posts.addComment.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      setCommentText('');
    },
  });

  const updatePostMutation = trpc.posts.update.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      setShowEditPostModal(false);
      setEditPostId(null);
      setEditPostContent('');
    },
  });

  const deletePostMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      setPostOptionsId(null);
      setShowComments(null);
    },
  });

  const updateCommentMutation = trpc.posts.updateComment.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      setShowEditCommentModal(false);
      setEditCommentId(null);
      setEditCommentContent('');
    },
  });

  const deleteCommentMutation = trpc.posts.deleteComment.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      setCommentOptions(null);
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage) return;

    console.log('Creating post...', { content: newPostContent, hasImage: !!selectedImage });
    setIsPosting(true);
    try {
      let imageUrl = undefined;
      if (selectedImage) {
        console.log('Uploading image...');
        const uploadedUrl = await uploadImage('posts', selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          console.log('Image uploaded:', imageUrl);
        } else {
          showAlert('Error', 'Failed to upload image');
          setIsPosting(false);
          return;
        }
      }

      console.log('Mutating createPost...');
      await createPostMutation.mutateAsync({
        content: newPostContent.trim(),
        category: 'all',
        imageUrl,
      });
    } catch (error) {
      // Error handled in mutation onError
      console.error('HandleCreatePost catch:', error);
    }
  };

  const handleToggleLike = (postId: string) => {
    toggleLikeMutation.mutate({ postId });
    Haptics.selectionAsync();
  };

  const handleLikeComment = (commentId: string) => {
    setCommentLiked((prev) => {
      const nextLiked = !prev[commentId];
      setCommentLikes((likes) => ({
        ...likes,
        [commentId]: (likes[commentId] || 0) + (nextLiked ? 1 : -1),
      }));
      Haptics.selectionAsync();
      return { ...prev, [commentId]: nextLiked };
    });
  };

  const handleReplyChange = (commentId: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [commentId]: text }));
  };

  const handleSubmitReply = (commentId: string) => {
    const text = replyDrafts[commentId]?.trim();
    if (!text || !currentUser) return;
    const newReply = {
      id: `r-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setCommentReplies((prev) => ({
      ...prev,
      [commentId]: [...(prev[commentId] || []), newReply],
    }));
    setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getCommentLikes = (commentId: string, base = 0) => {
    return base + (commentLikes[commentId] || 0);
  };

  const handleAddComment = useCallback(
    (postId: string) => {
      if (commentText.trim()) {
        addCommentMutation.mutate({ postId, content: commentText.trim() });
      }
    },
    [commentText, addCommentMutation]
  );

  const openPostOptions = (post: Post) => {
    if (post.userId !== currentUser?.id) return;
    setPostOptionsId(post.id);
    setEditPostId(post.id);
    setEditPostContent(post.content);
  };

  const handleUpdatePost = () => {
    if (!editPostId || !editPostContent.trim()) return;
    updatePostMutation.mutate({ postId: editPostId, content: editPostContent.trim() });
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert('Delete post?', 'This will remove the post and its comments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePostMutation.mutate({ postId }),
      },
    ]);
  };

  const openCommentOptions = (comment: Comment) => {
    if (comment.userId !== currentUser?.id) return;
    setCommentOptions({ id: comment.id, content: comment.content });
    setEditCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  const handleUpdateComment = () => {
    if (!editCommentId || !editCommentContent.trim()) return;
    updateCommentMutation.mutate({
      commentId: editCommentId,
      content: editCommentContent.trim(),
    });
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCommentMutation.mutate({ commentId }),
      },
    ]);
  };

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const isLiked = currentUser ? item.likedBy.includes(currentUser.id) : false;
      const showingComments = showComments === item.id;

      const onAddComment = () => {
        handleAddComment(item.id);
      };

      return (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <TouchableOpacity
              onPress={() => {
                if (item.userId === currentUser?.id) {
                  router.push('/(tabs)/profile');
                } else {
                  setProfileModalId(item.userId);
                }
              }}
              style={styles.avatarWrap}
            >
              <Image
                source={{ uri: item.userAvatar || 'https://i.pravatar.cc/150?img=0' }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (item.userId === currentUser?.id) {
                  router.push('/(tabs)/profile');
                } else {
                  setProfileModalId(item.userId);
                }
              }}
              style={styles.postHeaderText}
            >
              <Text style={styles.userName}>{item.userName}</Text>
              <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
            </TouchableOpacity>
            {currentUser?.id === item.userId && (
              <TouchableOpacity onPress={() => openPostOptions(item)} style={styles.moreButton}>
                <MoreHorizontal size={20} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.postContent}>{item.content}</Text>

          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="contain" />
          )}

          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleToggleLike(item.id)}
              testID={`like-button-${item.id}`}
            >
              <Heart
                size={20}
                color={isLiked ? Colors.light.error : Colors.light.textSecondary}
                fill={isLiked ? Colors.light.error : 'transparent'}
              />
              <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                {item.likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowComments(showingComments ? null : item.id)}
              testID={`comment-button-${item.id}`}
            >
              <MessageCircle size={20} color={Colors.light.textSecondary} />
              <Text style={styles.actionText}>{item.comments.length}</Text>
            </TouchableOpacity>
          </View>

          {showingComments && (
            <View style={styles.commentsSection}>
              {[...item.comments]
                .sort((a, b) => {
                  const likeA = getCommentLikes(a.id, 0);
                  const likeB = getCommentLikes(b.id, 0);
                  if (likeA !== likeB) return likeB - likeA;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((comment) => {
                  const replies = commentReplies[comment.id] || [];
                  return (
                    <View key={comment.id} style={styles.comment}>
                      <TouchableOpacity
                        onPress={() => {
                          if (comment.userId === currentUser?.id) {
                            router.push('/(tabs)/profile');
                          } else {
                            setProfileModalId(comment.userId);
                          }
                        }}
                      >
                        <Image
                          source={{ uri: comment.userAvatar || 'https://i.pravatar.cc/150?img=0' }}
                          style={styles.commentAvatar}
                        />
                      </TouchableOpacity>
                      <View style={styles.commentContent}>
                        <TouchableOpacity
                          onPress={() => {
                            if (comment.userId === currentUser?.id) {
                              router.push('/(tabs)/profile');
                            } else {
                              setProfileModalId(comment.userId);
                            }
                          }}
                        >
                          <Text style={styles.commentUserName}>{comment.userName}</Text>
                        </TouchableOpacity>
                        <Text style={styles.commentText}>{comment.content}</Text>
                        {comment.userId === currentUser?.id && (
                          <TouchableOpacity
                            style={styles.commentOptions}
                            onPress={() => openCommentOptions(comment)}
                          >
                            <MoreHorizontal size={16} color={Colors.light.textSecondary} />
                          </TouchableOpacity>
                        )}
                        <View style={styles.commentActionsRow}>
                          <TouchableOpacity
                            onPress={() => handleLikeComment(comment.id)}
                            style={styles.commentAction}
                          >
                            <Text style={styles.commentActionText}>
                              {getCommentLikes(comment.id, 0)} Likes
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [comment.id]: prev[comment.id] ?? '',
                              }))
                            }
                            style={styles.commentAction}
                          >
                            <Text style={styles.commentActionText}>Reply</Text>
                          </TouchableOpacity>
                        </View>

                        {replies.length > 0 && (
                          <View style={styles.repliesContainer}>
                            {replies
                              .sort(
                                (a, b) =>
                                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                              )
                              .map((reply) => (
                                <View key={reply.id} style={styles.replyRow}>
                                  <Image
                                    source={{ uri: reply.userAvatar || 'https://i.pravatar.cc/150?img=0' }}
                                    style={styles.replyAvatar}
                                  />
                                  <View style={styles.replyContent}>
                                    <Text style={styles.replyAuthor}>{reply.userName}</Text>
                                    <Text style={styles.replyText}>{reply.content}</Text>
                                  </View>
                                </View>
                              ))}
                          </View>
                        )}

                        {replyDrafts[comment.id] !== undefined && (
                          <View style={styles.replyInputRow}>
                            <TextInput
                              style={styles.replyInput}
                              placeholder="Write a reply..."
                              placeholderTextColor={Colors.light.placeholder}
                              value={replyDrafts[comment.id]}
                              onChangeText={(text) => handleReplyChange(comment.id, text)}
                            />
                            <TouchableOpacity
                              onPress={() => handleSubmitReply(comment.id)}
                              style={styles.replySend}
                            >
                              <Text style={styles.replySendText}>Send</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}

              <View style={styles.addComment}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor={Colors.light.placeholder}
                  value={commentText}
                  onChangeText={setCommentText}
                  testID={`comment-input-${item.id}`}
                />
                <TouchableOpacity
                  onPress={onAddComment}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  testID={`submit-comment-${item.id}`}
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
            </View>
          )}
        </View>
      );
    },
    [
      currentUser,
      showComments,
      commentText,
      handleToggleLike,
      handleAddComment,
      addCommentMutation.isPending,
      commentReplies,
      replyDrafts,
      handleReplyChange,
      handleSubmitReply,
      openPostOptions,
      openCommentOptions,
      getCommentLikes,
      handleLikeComment,
    ]
  );

  const closeProfileModal = () => setProfileModalId(null);

  const profileQuery = trpc.profiles.getById.useQuery(
    { userId: profileModalId || '' },
    { enabled: !!profileModalId }
  );

  const sendRequest = trpc.connections.sendRequest.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });

  const respond = trpc.connections.respond.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });

  const removeConnection = trpc.connections.remove.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });

  const upsertConversation = trpc.messages.upsertConversation.useMutation({
    onSuccess: (conv) => {
      closeProfileModal();
      router.push(`/chat/${conv.id}` as any);
    },
  });

  const handleFriendAction = useCallback(() => {
    if (!profileQuery.data) return;
    const { relationship, connectionId, id } = profileQuery.data;
    if (relationship === 'none') {
      sendRequest.mutate({ targetUserId: id });
      return;
    }
    if (relationship === 'incoming' && connectionId) {
      respond.mutate({ connectionId, action: 'accept' });
      return;
    }
    if (relationship === 'pending') {
      removeConnection.mutate({ targetUserId: id });
      return;
    }
  }, [profileQuery.data, sendRequest, respond, removeConnection]);

  const friendButtonLabel = useMemo(() => {
    if (!profileQuery.data) return 'Add Friend';
    switch (profileQuery.data.relationship) {
      case 'accepted':
        return 'Friends';
      case 'pending':
        return 'Cancel Request';
      case 'incoming':
        return 'Accept Request';
      case 'blocked':
        return 'Blocked';
      default:
        return 'Add Friend';
    }
  }, [profileQuery.data]);

  const friendButtonDisabled = useMemo(() => {
    if (!profileQuery.data) return false;
    return (
      profileQuery.data.relationship === 'accepted' ||
      profileQuery.data.relationship === 'blocked'
    );
  }, [profileQuery.data]);

  // Ensure only one button is rendered based on the relationship state
  const renderFriendButton = () => {
    if (!profileQuery.data) return null;

    const { relationship } = profileQuery.data;

    if (relationship === 'pending') {
      return (
        <TouchableOpacity
          style={[styles.profileButton, styles.profileSecondary]}
          onPress={() => removeConnection.mutate({ targetUserId: profileQuery.data.id })}
          disabled={friendButtonDisabled}
        >
          <Text style={styles.profileSecondaryText}>Cancel Request</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.profileButton, styles.profilePrimary]}
        onPress={handleFriendAction}
        disabled={friendButtonDisabled}
      >
        <Text style={styles.profileButtonText}>{friendButtonLabel}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts or people..."
          placeholderTextColor={Colors.light.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.trim().length > 0 && (
          <TouchableOpacity style={styles.cancelSearch} onPress={() => setSearchQuery('')}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.light.primary} /> : null}
          ListEmptyComponent={
            !isLoading && (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No posts found</Text>
              </View>
            )
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreatePost(true)}
        testID="create-post-button"
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>

      <Modal
        visible={!!postOptionsId}
        transparent
        animationType="fade"
        onRequestClose={() => setPostOptionsId(null)}
      >
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setPostOptionsId(null)}>
          <View style={styles.optionsCard}>
            <TouchableOpacity
              style={styles.optionsItem}
              onPress={() => {
                setPostOptionsId(null);
                setShowEditPostModal(true);
              }}
            >
              <Text style={styles.optionsItemText}>Edit Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsItem}
              onPress={() => {
                const id = postOptionsId;
                setPostOptionsId(null);
                if (id) handleDeletePost(id);
              }}
            >
              <Text style={styles.optionsItemDestructive}>Delete Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionsCancel} onPress={() => setPostOptionsId(null)}>
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!commentOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentOptions(null)}
      >
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setCommentOptions(null)}>
          <View style={styles.optionsCard}>
            <TouchableOpacity
              style={styles.optionsItem}
              onPress={() => {
                setShowEditCommentModal(true);
                setCommentOptions(null);
              }}
            >
              <Text style={styles.optionsItemText}>Edit Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsItem}
              onPress={() => {
                const id = commentOptions?.id;
                setCommentOptions(null);
                if (id) handleDeleteComment(id);
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
        visible={showCreatePost}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreatePost(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setShowCreatePost(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.postInput}
              placeholder="What's on your mind?"
              placeholderTextColor={Colors.light.placeholder}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              autoFocus
              testID="post-content-input"
            />

            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <ImageIcon size={24} color={Colors.light.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.postButton,
                  (!newPostContent.trim() && !selectedImage) && styles.postButtonDisabled,
                ]}
                onPress={handleCreatePost}
                disabled={isPosting || (!newPostContent.trim() && !selectedImage)}
                testID="submit-post-button"
              >
                {isPosting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showEditPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowEditPostModal(false);
          setEditPostId(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditPostModal(false);
                  setEditPostId(null);
                }}
              >
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
        visible={showEditCommentModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowEditCommentModal(false);
          setEditCommentId(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Comment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditCommentModal(false);
                  setEditCommentId(null);
                }}
              >
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

      <Modal visible={!!profileModalId} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.profileModalContainer}>
          <View style={styles.profileModalHeader}>
            <TouchableOpacity onPress={closeProfileModal}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          {profileQuery.isLoading || !profileQuery.data ? (
            <View style={styles.profileModalLoading}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.profileModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.profileHeader}>
                <Image
                  source={{ uri: profileQuery.data.avatar || 'https://i.pravatar.cc/150?img=0' }}
                  style={styles.profileAvatar}
                />
                <Text style={styles.profileName}>{profileQuery.data.name}</Text>
                {profileQuery.data.major ? <Text style={styles.profileMajor}>{profileQuery.data.major}</Text> : null}
                {profileQuery.data.year ? (
                  <View style={styles.profilePill}>
                    <Text style={styles.profilePillText}>{profileQuery.data.year}</Text>
                  </View>
                ) : null}
                <View style={styles.profileActions}>
                  {renderFriendButton()}
                  <TouchableOpacity
                    style={[styles.profileButton, styles.profileSecondary]}
                    onPress={() => upsertConversation.mutate({ otherUserId: profileQuery.data.id })}
                  >
                    <Text style={[styles.profileButtonText, styles.profileSecondaryText]}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bio Section of the Profile Modal */}
              {profileQuery.data.bio && (
                <View style={styles.profileSection}>

                  {/* Header with Icon + Title */}
                  <View style={styles.sectionHeader}>
                    <BookOpenText size={20} color={Colors.light.primary} />
                    <Text style={styles.sectionTitle}>Bio</Text>
                  </View>

                  {/* Card-style body */}
                  <View style={styles.infoCard}>
                    <Text style={styles.profileBody}>{profileQuery.data.bio}</Text>
                  </View>

                </View>
              )}



              <View style={styles.profileSection}>

                {/* Header: Icon + Title */}
                <View style={styles.sectionHeader}>
                  <Award size={20} color={Colors.light.primary} />
                  <Text style={styles.sectionTitle}>Academic Info</Text>
                </View>

                {/* Card Container */}
                <View style={styles.infoCard}>

                  {/* Major */}
                  {profileQuery.data.major && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoIcon}>
                        <GraduationCap size={20} color={Colors.light.secondary} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Major</Text>
                        <Text style={styles.infoValue}>{profileQuery.data.major}</Text>
                      </View>
                    </View>
                  )}

                  {/* Year */}
                  {profileQuery.data.year && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoIcon}>
                        <University size={20} color={Colors.light.secondary} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Year</Text>
                        <Text style={styles.infoValue}>{profileQuery.data.year}</Text>
                      </View>
                    </View>
                  )}

                  {/* Joined Date */}
                  {profileQuery.data.createdAt && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoIcon}>
                        <Mail size={20} color={Colors.light.secondary} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Joined</Text>
                        <Text style={styles.infoValue}>
                          {new Date(profileQuery.data.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  )}

                </View>
              </View>

              {/* Interests Section of the Profile Modal */}
              {profileQuery.data.interests?.length > 0 && (
                <View style={styles.profileSection}>

                  {/* Header: Icon + Title */}
                  <View style={styles.sectionHeader}>
                    <Heart size={20} color={Colors.light.primary} />
                    <Text style={styles.sectionTitle}>Interests</Text>
                  </View>

                  {/* Card container for chips */}
                  <View style={styles.infoCard}>
                    <View style={styles.profileChips}>
                      {profileQuery.data.interests.map((interest: string) => (
                        <View key={interest} style={styles.profileChip}>
                          <Text style={styles.profileChipText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                </View>
              )}

              <TouchableOpacity
                style={[styles.profileButton, styles.reportButton]}
                onPress={async () => {
                  try {
                    await reportsMutation.mutateAsync({ userId: profileQuery.data.id });
                    Alert.alert('Report submitted', 'Thank you. We will review.');
                  } catch (err: any) {
                    const msg =
                      err?.message?.includes('cooldown') || err?.data?.code === 'TOO_MANY_REQUESTS'
                        ? 'You have recently reported this user. Please wait before reporting again.'
                        : 'Could not submit report.';
                    Alert.alert('Report', msg);
                  }
                }}
              >
                <Text style={[styles.profileButtonText, styles.reportText]}>Report User</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
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