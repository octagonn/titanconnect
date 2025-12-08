import { Heart, MessageCircle, Plus, Image as ImageIcon, X, MoreHorizontal } from 'lucide-react-native';
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
    onSuccess: () => {
      profileQuery.refetch();
      closeProfileModal();
    },
  });

  const respond = trpc.connections.respond.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
      closeProfileModal();
    },
  });

  const removeConnection = trpc.connections.remove.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
      closeProfileModal();
    },
  });

  const upsertConversation = trpc.messages.upsertConversation.useMutation({
    onSuccess: (conv) => {
      closeProfileModal();
      router.push(`/chat/${conv.id}` as any);
    },
  });

  const handleFriendAction = useCallback(() => {
    const data = profileQuery.data;
    if (!data || !data.id) return;
    const { relationship, connectionId, id } = data;
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
    return profileQuery.data.relationship === 'accepted' || profileQuery.data.relationship === 'blocked';
  }, [profileQuery.data]);

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
                  <TouchableOpacity
                    style={[
                      styles.profileButton,
                      friendButtonDisabled ? styles.profileButtonDisabled : styles.profilePrimary,
                    ]}
                    disabled={friendButtonDisabled || sendRequest.isPending || respond.isPending || removeConnection.isPending}
                    onPress={handleFriendAction}
                  >
                    <Text style={styles.profileButtonText}>{friendButtonLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.profileButton, styles.profileSecondary]}
                    onPress={() => upsertConversation.mutate({ otherUserId: profileQuery.data.id })}
                  >
                    <Text style={[styles.profileButtonText, styles.profileSecondaryText]}>Message</Text>
                  </TouchableOpacity>
                  {profileQuery.data.relationship === 'pending' && (
                    <TouchableOpacity
                      style={[styles.profileButton, styles.profileSecondary]}
                      onPress={() => removeConnection.mutate({ targetUserId: profileQuery.data.id })}
                      disabled={removeConnection.isPending}
                    >
                      <Text style={[styles.profileButtonText, styles.profileSecondaryText]}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {profileQuery.data.bio ? (
                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>About</Text>
                  <Text style={styles.profileBody}>{profileQuery.data.bio}</Text>
                </View>
              ) : null}

              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Details</Text>
                {profileQuery.data.major ? (
                  <Text style={styles.profileDetail}>Major: {profileQuery.data.major}</Text>
                ) : null}
                {profileQuery.data.year ? <Text style={styles.profileDetail}>Year: {profileQuery.data.year}</Text> : null}
                {profileQuery.data.createdAt ? (
                  <Text style={styles.profileDetail}>
                    Joined: {new Date(profileQuery.data.createdAt).toLocaleDateString()}
                  </Text>
                ) : null}
              </View>

              {profileQuery.data.interests?.length ? (
                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>Interests</Text>
                  <View style={styles.profileChips}>
                    {profileQuery.data.interests.map((interest: string) => (
                      <View key={interest} style={styles.profileChip}>
                        <Text style={styles.profileChipText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  cancelSearch: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cancelText: {
    color: Colors.light.primary,
    fontWeight: '700' as const,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
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
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    height: 250,
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 12,
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
  commentActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  commentAction: {
    paddingVertical: 4,
  },
  commentActionText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
  },
  repliesContainer: {
    marginTop: 8,
    gap: 8,
  },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  replyContent: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    padding: 10,
  },
  replyAuthor: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  replyText: {
    fontSize: 13,
    color: Colors.light.text,
    marginTop: 2,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.light.text,
    fontSize: 13,
  },
  replySend: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  replySendText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 13,
  },
  addComment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageButton: {
    padding: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
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
  selectedImageContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  profileModalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  profileModalHeader: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalCloseText: {
    color: Colors.light.primary,
    fontWeight: '700' as const,
    fontSize: 16,
  },
  profileModalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileModalContent: {
    padding: 20,
    gap: 16,
  },
  profileHeader: {
    alignItems: 'center',
    gap: 8,
  },
  profileAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  profileMajor: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  profilePill: {
    marginTop: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  profilePillText: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  profileButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  profilePrimary: {
    backgroundColor: Colors.light.primary,
  },
  profileButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  profileSecondary: {
    backgroundColor: Colors.light.border,
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  profileSecondaryText: {
    color: Colors.light.text,
  },
  profileSection: {
    gap: 8,
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  profileBody: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  profileChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileChip: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  profileChipText: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  profileDetail: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
  },
  reportButton: {
    backgroundColor: Colors.light.error,
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 18,
  },
  reportText: {
    color: '#fff',
  },
  moreButton: {
    padding: 6,
  },
  commentOptions: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
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
