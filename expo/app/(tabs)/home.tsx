import { Heart, MessageCircle, Mail, BookOpenText, Image as ImageIcon, X, MoreHorizontal, Award, GraduationCap, University, Rss, Calendar, BookOpen, Ghost, ShoppingBag } from 'lucide-react-native';
import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { showAlert } from '@/lib/alert';
import { getFriendlyErrorMessage } from '@/lib/errors';
import * as ImagePicker from 'expo-image-picker';
import Colors, { INK, palette } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Post, Comment } from '@/types';
import { trpc } from '@/lib/trpc';
import { uploadImage } from '@/lib/storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import styles from '@/styles/home.styles';
import HardShadow from '@/components/ui/HardShadow';
import Avatar from '@/components/ui/Avatar';
import Chip from '@/components/ui/Chip';
import EventsPreview from '@/components/discover/EventsPreview';
import StudyBuddyPreview from '@/components/discover/StudyBuddyPreview';
import AnonymousPreview from '@/components/discover/AnonymousPreview';
import MarketplacePreview from '@/components/discover/MarketplacePreview';

const CATEGORIES = [
  { key: 'feed', label: 'Feed', icon: Rss },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'study', label: 'Study Buddy', icon: BookOpen },
  { key: 'anon', label: 'Anonymous', icon: Ghost },
  { key: 'market', label: 'Marketplace', icon: ShoppingBag },
] as const;
type CategoryKey = typeof CATEGORIES[number]['key'];

type CreateType = 'all' | 'events' | 'study' | 'anon' | 'market';

const CREATE_OPTIONS: { type: CreateType; label: string; icon: typeof Rss }[] = [
  { type: 'all', label: 'Post', icon: Rss },
  { type: 'events', label: 'Event', icon: Calendar },
  { type: 'study', label: 'Study Buddy', icon: BookOpen },
  { type: 'anon', label: 'Anonymous Post', icon: Ghost },
  { type: 'market', label: 'Marketplace Listing', icon: ShoppingBag },
];

const CREATE_TITLES: Record<CreateType, string> = {
  all: 'Create Post',
  events: 'Create Event',
  study: 'Create Study Buddy Post',
  anon: 'Create Anonymous Post',
  market: 'Create Marketplace Listing',
};

const DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6];

function dayLabel(offset: number): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

const TIME_SLOTS: { hour: number; label: string }[] = [
  { hour: 9, label: '9:00 AM' },
  { hour: 12, label: '12:00 PM' },
  { hour: 15, label: '3:00 PM' },
  { hour: 18, label: '6:00 PM' },
  { hour: 21, label: '9:00 PM' },
];

const LOCATION_OPTIONS = ['TSU', 'Pollak Library', 'McCarthy Hall', 'Titan Stadium', 'Online / Zoom', 'Other'];

const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'];

const PRICE_PRESETS: { label: string; value: number }[] = [
  { label: 'Free', value: 0 },
  { label: '$5', value: 5 },
  { label: '$10', value: 10 },
  { label: '$20', value: 20 },
  { label: '$50', value: 50 },
  { label: '$100+', value: 100 },
];

type AnonSubtype = 'thought' | 'poll' | 'wishbone';

const ANON_SUBTYPES: { key: AnonSubtype; label: string }[] = [
  { key: 'thought', label: 'Random Thought' },
  { key: 'poll', label: 'Poll' },
  { key: 'wishbone', label: 'Wishbone' },
];

const TAG_PRESETS: Partial<Record<CreateType, string[]>> = {
  events: ['Free Food', 'Free', 'Club', 'Sports', 'Social', 'Academic', 'Greek Life'],
  study: ['Exam Prep', 'Homework Help', 'Group Project', 'Weekly', 'Drop-in'],
  market: ['Free Food', 'Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Tickets', 'Free'],
};

export default function HomeScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { isCreateMenuOpen, closeCreateMenu } = useApp();
  const [category, setCategory] = useState<CategoryKey>('feed');
  const [showCreatePost, setShowCreatePost] = useState<boolean>(false);
  const [createType, setCreateType] = useState<CreateType>('all');
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [selectedDayOffset, setSelectedDayOffset] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [customLocation, setCustomLocation] = useState<string>('');
  const [newCourse, setNewCourse] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [selectedPriceOption, setSelectedPriceOption] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [anonSubtype, setAnonSubtype] = useState<AnonSubtype>('thought');
  const [pollOptionInputs, setPollOptionInputs] = useState<string[]>(['', '']);
  const [wishboneLeftImage, setWishboneLeftImage] = useState<string | null>(null);
  const [wishboneRightImage, setWishboneRightImage] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState<string>('');
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
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  const resetCreateForm = () => {
    setNewPostContent('');
    setNewTitle('');
    setSelectedDayOffset(null);
    setSelectedHour(null);
    setSelectedLocation(null);
    setCustomLocation('');
    setNewCourse('');
    setNewPrice('');
    setSelectedPriceOption(null);
    setSelectedCondition(null);
    setSelectedImage(null);
    setAnonSubtype('thought');
    setPollOptionInputs(['', '']);
    setWishboneLeftImage(null);
    setWishboneRightImage(null);
    setSelectedTags([]);
    setCustomTag('');
    setCreateType('all');
  };

  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      utils.posts.getInfinite.invalidate();
      resetCreateForm();
      setShowCreatePost(false);
      setIsPosting(false);
    },
    onError: (error) => {
      console.error('Create Post Error:', error);
      showAlert('Error', getFriendlyErrorMessage(error, 'Failed to create post'));
      setIsPosting(false);
    },
  });

  const toggleLikeMutation = trpc.posts.toggleLike.useMutation({
    // Optimistic UI for smoother like experience
    onMutate: async ({ postId }) => {
      await utils.posts.getInfinite.cancel();
      const input = { limit: 10 };
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

  const pickImageInto = async (setter: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const pickImage = () => pickImageInto(setSelectedImage);

  const updatePollOption = (index: number, text: string) => {
    setPollOptionInputs((prev) => prev.map((opt, i) => (i === index ? text : opt)));
  };

  const addPollOption = () => {
    setPollOptionInputs((prev) => (prev.length < 4 ? [...prev, ''] : prev));
  };

  const removePollOption = (index: number) => {
    setPollOptionInputs((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      return prev.length < 6 ? [...prev, tag] : prev;
    });
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (tag && !selectedTags.includes(tag) && selectedTags.length < 6) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTag('');
  };

  const isCreateFormValid = () => {
    if (createType === 'anon' && anonSubtype === 'poll') {
      return newTitle.trim().length > 0 && pollOptionInputs.filter((o) => o.trim()).length >= 2;
    }
    if (createType === 'anon' && anonSubtype === 'wishbone') {
      return !!wishboneLeftImage && !!wishboneRightImage;
    }
    return !!newPostContent.trim() || !!selectedImage;
  };

  const handleCreatePost = async () => {
    if (!isCreateFormValid()) return;

    setIsPosting(true);
    try {
      let imageUrl: string | undefined;
      let imageUrl2: string | undefined;
      let content = newPostContent.trim();
      let subtype: AnonSubtype | undefined;
      let pollOptions: string[] | undefined;

      if (createType === 'anon' && anonSubtype === 'poll') {
        subtype = 'poll';
        content = newTitle.trim();
        pollOptions = pollOptionInputs.map((o) => o.trim()).filter(Boolean);
      } else if (createType === 'anon' && anonSubtype === 'wishbone') {
        subtype = 'wishbone';
        content = newPostContent.trim() || 'This or that?';
        const [uploadedLeft, uploadedRight] = await Promise.all([
          uploadImage('posts', wishboneLeftImage!),
          uploadImage('posts', wishboneRightImage!),
        ]);
        if (!uploadedLeft || !uploadedRight) {
          showAlert('Error', 'Failed to upload images');
          setIsPosting(false);
          return;
        }
        imageUrl = uploadedLeft;
        imageUrl2 = uploadedRight;
      } else {
        if (createType === 'anon') subtype = 'thought';
        if (selectedImage) {
          const uploadedUrl = await uploadImage('posts', selectedImage);
          if (!uploadedUrl) {
            showAlert('Error', 'Failed to upload image');
            setIsPosting(false);
            return;
          }
          imageUrl = uploadedUrl;
        }
      }

      let scheduledAt: string | undefined;
      if (selectedDayOffset !== null && selectedHour !== null) {
        const dt = new Date();
        dt.setDate(dt.getDate() + selectedDayOffset);
        dt.setHours(selectedHour, 0, 0, 0);
        scheduledAt = dt.toISOString();
      }
      const location =
        selectedLocation === 'Other' ? customLocation.trim() || undefined : selectedLocation ?? undefined;

      let price: number | undefined;
      if (selectedPriceOption === 'Custom') {
        price = newPrice.trim() ? Number(newPrice.trim()) : undefined;
      } else if (selectedPriceOption === 'Free') {
        price = 0;
      } else if (selectedPriceOption) {
        price = Number(selectedPriceOption.replace(/[^0-9.]/g, ''));
      }

      await createPostMutation.mutateAsync({
        content,
        category: createType,
        imageUrl,
        imageUrl2,
        title: createType !== 'anon' ? newTitle.trim() || undefined : undefined,
        subtype,
        pollOptions,
        scheduledAt,
        location,
        course: newCourse.trim() || undefined,
        price,
        condition: selectedCondition ?? undefined,
        tags: selectedTags.length ? selectedTags : undefined,
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
    showAlert('Delete post?', 'This will remove the post and its comments.', [
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
    showAlert('Delete comment?', 'This cannot be undone.', [
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
        <View style={styles.postCardWrap}>
          <HardShadow offset={8} radius={24} />
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
              <Avatar uri={item.userAvatar} name={item.userName} size={44} />
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
                        <Avatar uri={comment.userAvatar} name={comment.userName} size={32} />
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
                                  <Avatar uri={reply.userAvatar} name={reply.userName} size={24} />
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

  const contentPlaceholder =
    createType === 'market'
      ? 'Describe the item...'
      : createType === 'events'
      ? "What's happening?"
      : createType === 'study'
      ? 'What do you need help with?'
      : createType === 'anon'
      ? 'Share anonymously...'
      : "What's on your mind?";

  const closeCreatePostModal = () => {
    setShowCreatePost(false);
    resetCreateForm();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        contentContainerStyle={styles.categoryBarContent}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          const Icon = cat.icon;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.8}
            >
              <Icon size={15} color={active ? '#FFFFFF' : INK} strokeWidth={2.5} />
              <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {category === 'feed' && (
        <>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
          ) : (
            <FlatList
              style={styles.feedContent}
              data={posts}
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
        </>
      )}

      {category !== 'feed' && (
        <ScrollView style={styles.feedContent} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {category === 'events' && <EventsPreview />}
          {category === 'study' && <StudyBuddyPreview />}
          {category === 'anon' && <AnonymousPreview />}
          {category === 'market' && <MarketplacePreview />}
        </ScrollView>
      )}

      <Modal
        visible={isCreateMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCreateMenu}
      >
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={closeCreateMenu}>
          <View style={styles.optionsCard}>
            {CREATE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <TouchableOpacity
                  key={option.type}
                  style={styles.createOptionItem}
                  onPress={() => {
                    closeCreateMenu();
                    setCreateType(option.type);
                    setShowCreatePost(true);
                  }}
                  testID={`create-option-${option.type}`}
                >
                  <Icon size={18} color={INK} strokeWidth={2.5} />
                  <Text style={styles.optionsItemText}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.optionsCancel} onPress={closeCreateMenu}>
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
        onRequestClose={closeCreatePostModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{CREATE_TITLES[createType]}</Text>
              <TouchableOpacity onPress={closeCreatePostModal}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {(createType === 'events' || createType === 'study' || createType === 'market') && (
              <TextInput
                style={styles.extraInput}
                placeholder={createType === 'market' ? 'Item name' : createType === 'study' ? 'Topic' : 'Event title'}
                placeholderTextColor={Colors.light.placeholder}
                value={newTitle}
                onChangeText={setNewTitle}
                testID="post-title-input"
              />
            )}

            {createType === 'study' && (
              <TextInput
                style={styles.extraInput}
                placeholder="Course (e.g. CPSC 335)"
                placeholderTextColor={Colors.light.placeholder}
                value={newCourse}
                onChangeText={setNewCourse}
                testID="post-course-input"
              />
            )}

            {createType === 'anon' && (
              <>
                <Text style={styles.fieldLabel}>Type</Text>
                <View style={styles.chipRow}>
                  {ANON_SUBTYPES.map((st) => (
                    <Chip
                      key={st.key}
                      label={st.label}
                      variant={anonSubtype === st.key ? 'solid' : 'outline'}
                      color={palette.navy}
                      onPress={() => setAnonSubtype(st.key)}
                    />
                  ))}
                </View>
              </>
            )}

            {createType === 'anon' && anonSubtype === 'poll' && (
              <>
                <TextInput
                  style={styles.extraInput}
                  placeholder="Ask a question..."
                  placeholderTextColor={Colors.light.placeholder}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  testID="poll-question-input"
                />
                <Text style={styles.fieldLabel}>Options</Text>
                {pollOptionInputs.map((opt, i) => (
                  <View key={i} style={styles.pollOptionRow}>
                    <TextInput
                      style={[styles.extraInput, styles.pollOptionInput]}
                      placeholder={`Option ${i + 1}`}
                      placeholderTextColor={Colors.light.placeholder}
                      value={opt}
                      onChangeText={(text) => updatePollOption(i, text)}
                      testID={`poll-option-input-${i}`}
                    />
                    {pollOptionInputs.length > 2 && (
                      <TouchableOpacity
                        onPress={() => removePollOption(i)}
                        style={styles.pollOptionRemove}
                      >
                        <X size={16} color={Colors.light.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {pollOptionInputs.length < 4 && (
                  <TouchableOpacity onPress={addPollOption} style={styles.addOptionButton}>
                    <Text style={styles.addOptionText}>+ Add option</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {createType === 'anon' && anonSubtype === 'wishbone' && (
              <>
                <Text style={styles.fieldLabel}>Two photos — people vote a side</Text>
                <View style={styles.wishboneRow}>
                  <TouchableOpacity
                    style={styles.wishboneSlot}
                    onPress={() => pickImageInto(setWishboneLeftImage)}
                    testID="wishbone-left-picker"
                  >
                    {wishboneLeftImage ? (
                      <Image source={{ uri: wishboneLeftImage }} style={styles.wishboneImage} />
                    ) : (
                      <ImageIcon size={28} color={INK} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                  <View style={styles.wishboneDivider} />
                  <TouchableOpacity
                    style={styles.wishboneSlot}
                    onPress={() => pickImageInto(setWishboneRightImage)}
                    testID="wishbone-right-picker"
                  >
                    {wishboneRightImage ? (
                      <Image source={{ uri: wishboneRightImage }} style={styles.wishboneImage} />
                    ) : (
                      <ImageIcon size={28} color={INK} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {(createType === 'events' || createType === 'study') && (
              <>
                <Text style={styles.fieldLabel}>When?</Text>
                <View style={styles.chipRow}>
                  {DAY_OFFSETS.map((offset) => (
                    <Chip
                      key={offset}
                      label={dayLabel(offset)}
                      variant={selectedDayOffset === offset ? 'solid' : 'outline'}
                      color={palette.blue}
                      onPress={() => setSelectedDayOffset(offset)}
                    />
                  ))}
                </View>
                <View style={styles.chipRow}>
                  {TIME_SLOTS.map((slot) => (
                    <Chip
                      key={slot.hour}
                      label={slot.label}
                      variant={selectedHour === slot.hour ? 'solid' : 'outline'}
                      color={palette.blue}
                      onPress={() => setSelectedHour(slot.hour)}
                    />
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Where?</Text>
                <View style={styles.chipRow}>
                  {LOCATION_OPTIONS.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      variant={selectedLocation === option ? 'solid' : 'outline'}
                      color={palette.orange}
                      onPress={() => setSelectedLocation(option)}
                    />
                  ))}
                </View>
                {selectedLocation === 'Other' && (
                  <TextInput
                    style={styles.extraInput}
                    placeholder="Enter a location"
                    placeholderTextColor={Colors.light.placeholder}
                    value={customLocation}
                    onChangeText={setCustomLocation}
                    testID="post-custom-location-input"
                  />
                )}
              </>
            )}

            {createType === 'market' && (
              <>
                <Text style={styles.fieldLabel}>Price</Text>
                <View style={styles.chipRow}>
                  {PRICE_PRESETS.map((preset) => (
                    <Chip
                      key={preset.label}
                      label={preset.label}
                      variant={selectedPriceOption === preset.label ? 'solid' : 'outline'}
                      color={palette.amber}
                      onPress={() =>
                        setSelectedPriceOption(selectedPriceOption === preset.label ? null : preset.label)
                      }
                    />
                  ))}
                  <Chip
                    label="Custom"
                    variant={selectedPriceOption === 'Custom' ? 'solid' : 'outline'}
                    color={palette.amber}
                    onPress={() =>
                      setSelectedPriceOption(selectedPriceOption === 'Custom' ? null : 'Custom')
                    }
                  />
                </View>
                {selectedPriceOption === 'Custom' && (
                  <TextInput
                    style={styles.extraInput}
                    placeholder="Enter a price"
                    placeholderTextColor={Colors.light.placeholder}
                    value={newPrice}
                    onChangeText={setNewPrice}
                    keyboardType="numeric"
                    testID="post-price-input"
                  />
                )}
                <Text style={styles.fieldLabel}>Condition (optional)</Text>
                <View style={styles.chipRow}>
                  {CONDITION_OPTIONS.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      variant={selectedCondition === option ? 'solid' : 'outline'}
                      color={palette.orange}
                      onPress={() => setSelectedCondition(selectedCondition === option ? null : option)}
                    />
                  ))}
                </View>
              </>
            )}

            {TAG_PRESETS[createType] && (
              <>
                <Text style={styles.fieldLabel}>Tags (optional)</Text>
                <View style={styles.chipRow}>
                  {TAG_PRESETS[createType]!.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      variant={selectedTags.includes(tag) ? 'solid' : 'outline'}
                      color={palette.skyBlue}
                      onPress={() => toggleTag(tag)}
                    />
                  ))}
                </View>
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={[styles.extraInput, styles.tagInput]}
                    placeholder="Add a custom tag"
                    placeholderTextColor={Colors.light.placeholder}
                    value={customTag}
                    onChangeText={setCustomTag}
                    onSubmitEditing={addCustomTag}
                    testID="custom-tag-input"
                  />
                  <TouchableOpacity onPress={addCustomTag} style={styles.addTagButton}>
                    <Text style={styles.addTagButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {selectedTags.filter((t) => !TAG_PRESETS[createType]!.includes(t)).length > 0 && (
                  <View style={styles.chipRow}>
                    {selectedTags
                      .filter((t) => !TAG_PRESETS[createType]!.includes(t))
                      .map((tag) => (
                        <Chip
                          key={tag}
                          label={`${tag} ✕`}
                          variant="solid"
                          color={palette.skyBlue}
                          onPress={() => toggleTag(tag)}
                        />
                      ))}
                  </View>
                )}
              </>
            )}

            {!(createType === 'anon' && anonSubtype === 'poll') && (
              <TextInput
                style={styles.postInput}
                placeholder={
                  createType === 'anon' && anonSubtype === 'wishbone'
                    ? 'Add a caption (optional)'
                    : contentPlaceholder
                }
                placeholderTextColor={Colors.light.placeholder}
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
                autoFocus={!(createType === 'anon' && anonSubtype === 'wishbone')}
                testID="post-content-input"
              />
            )}

            {!(createType === 'anon' && (anonSubtype === 'poll' || anonSubtype === 'wishbone')) && selectedImage && (
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
              {!(createType === 'anon' && (anonSubtype === 'poll' || anonSubtype === 'wishbone')) && (
                <TouchableOpacity style={styles.imageButton} onPress={pickImage} testID="pick-image-button">
                  <ImageIcon size={24} color={INK} strokeWidth={2.5} />
                </TouchableOpacity>
              )}

              <View style={styles.postButtonWrap}>
                {!(isPosting || !isCreateFormValid()) && <HardShadow offset={5} radius={18} />}
                <TouchableOpacity
                  style={[styles.postButton, !isCreateFormValid() && styles.postButtonDisabled]}
                  onPress={handleCreatePost}
                  disabled={isPosting || !isCreateFormValid()}
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
                <Avatar uri={profileQuery.data.avatar} name={profileQuery.data.name} size={140} />
                <Text style={styles.profileName}>{profileQuery.data.name}</Text>
                {profileQuery.data.major ? <Text style={styles.profileMajor}>{profileQuery.data.major}</Text> : null}
                {profileQuery.data.year ? (
                  <Chip label={profileQuery.data.year} variant="solid" color={palette.blue} />
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
                    <View style={styles.sectionIconWell}>
                      <BookOpenText size={16} color={INK} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.sectionTitle}>Bio</Text>
                  </View>

                  {/* Card-style body */}
                  <View style={styles.infoCardWrap}>
                    <HardShadow offset={6} radius={20} />
                    <View style={styles.infoCard}>
                      <Text style={styles.profileBody}>{profileQuery.data.bio}</Text>
                    </View>
                  </View>

                </View>
              )}



              <View style={styles.profileSection}>

                {/* Header: Icon + Title */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWell}>
                    <Award size={16} color={INK} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.sectionTitle}>Academic Info</Text>
                </View>

                {/* Card Container */}
                <View style={styles.infoCardWrap}>
                <HardShadow offset={6} radius={20} />
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
              </View>

              {/* Interests Section of the Profile Modal */}
              {profileQuery.data.interests?.length > 0 && (
                <View style={styles.profileSection}>

                  {/* Header: Icon + Title */}
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconWell}>
                      <Heart size={16} color={INK} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.sectionTitle}>Interests</Text>
                  </View>

                  {/* Card container for chips */}
                  <View style={styles.infoCardWrap}>
                    <HardShadow offset={6} radius={20} />
                    <View style={styles.infoCard}>
                      <View style={styles.profileChips}>
                        {profileQuery.data.interests.map((interest: string) => (
                          <Chip key={interest} label={interest} variant="outline" />
                        ))}
                      </View>
                    </View>
                  </View>

                </View>
              )}

              <TouchableOpacity
                style={[styles.profileButton, styles.reportButton]}
                onPress={async () => {
                  try {
                    await reportsMutation.mutateAsync({ userId: profileQuery.data.id });
                    showAlert('Report submitted', 'Thank you. We will review.');
                  } catch (err: any) {
                    const msg =
                      err?.message?.includes('cooldown') || err?.data?.code === 'TOO_MANY_REQUESTS'
                        ? 'You have recently reported this user. Please wait before reporting again.'
                        : 'Could not submit report.';
                    showAlert('Report', msg);
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