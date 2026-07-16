import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Pressable, ScrollView, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { showAlert } from '@/lib/alert';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, MessageCircle, MoreHorizontal, Star, Tag } from 'lucide-react-native';

import Colors, { INK, palette } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/ui/Avatar';
import HardShadow from '@/components/ui/HardShadow';
import Chip from '@/components/ui/Chip';
import PostMedia from '@/components/ui/PostMedia';

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
  const [offersPickerVisible, setOffersPickerVisible] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [joinRequestsPickerVisible, setJoinRequestsPickerVisible] = useState(false);

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

  const myOfferQuery = trpc.offers.getMine.useQuery(
    { postId: postId || '' },
    { enabled: !!postId && post?.category === 'market' && !!currentUser && currentUser.id !== post?.userId },
  );

  const offersListQuery = trpc.offers.listForPost.useQuery(
    { postId: postId || '' },
    { enabled: !!postId && post?.category === 'market' && !!currentUser && currentUser.id === post?.userId },
  );

  const dealPartnerId = post && currentUser
    ? (currentUser.id === post.userId ? post.dealtWithUserId : post.userId)
    : undefined;

  const dealQuery = trpc.offers.getForConversation.useQuery(
    { otherUserId: dealPartnerId || '' },
    { enabled: !!dealPartnerId && post?.listingStatus === 'pending' },
  );

  const invalidateOfferQueries = () => {
    utils.posts.getById.invalidate({ id: postId || '' });
    utils.posts.getInfinite.invalidate();
    utils.offers.getMine.invalidate({ postId: postId || '' });
    utils.offers.listForPost.invalidate({ postId: postId || '' });
    if (dealPartnerId) utils.offers.getForConversation.invalidate({ otherUserId: dealPartnerId });
  };

  const submitOfferMutation = trpc.offers.submit.useMutation({
    onSuccess: () => {
      invalidateOfferQueries();
      setOfferAmount('');
    },
    onError: (err) => showAlert('Offer failed', err.message || 'Could not submit offer.'),
  });

  const withdrawOfferMutation = trpc.offers.withdraw.useMutation({
    onSuccess: () => invalidateOfferQueries(),
  });

  const acceptOfferMutation = trpc.offers.accept.useMutation({
    onSuccess: () => {
      invalidateOfferQueries();
      setOffersPickerVisible(false);
    },
    onError: (err) => showAlert('Could not accept offer', err.message || 'Please try again.'),
  });

  const declineOfferMutation = trpc.offers.decline.useMutation({
    onSuccess: () => invalidateOfferQueries(),
  });

  const confirmDealMutation = trpc.offers.confirmCompleted.useMutation({
    onSuccess: () => invalidateOfferQueries(),
    onError: (err) => showAlert('Could not confirm', err.message || 'Please try again.'),
  });

  const cancelDealMutation = trpc.offers.cancelDeal.useMutation({
    onSuccess: () => invalidateOfferQueries(),
    onError: (err) => showAlert('Could not cancel', err.message || 'Please try again.'),
  });

  const { data: joinRequests } = trpc.posts.getJoinRequests.useQuery(
    { postId: postId || '' },
    {
      enabled:
        !!postId &&
        post?.category === 'study' &&
        post?.joinPolicy === 'approval' &&
        currentUser?.id === post?.userId,
    },
  );

  const requestToJoinMutation = trpc.posts.requestToJoin.useMutation({
    onSuccess: () => {
      utils.posts.getById.invalidate({ id: postId || '' });
      utils.posts.getInfinite.invalidate();
    },
    onError: (err) => {
      showAlert('Request failed', err.message || 'Could not send join request.');
    },
  });

  const respondToJoinRequestMutation = trpc.posts.respondToJoinRequest.useMutation({
    onSuccess: () => {
      utils.posts.getById.invalidate({ id: postId || '' });
      utils.posts.getInfinite.invalidate();
      utils.posts.getJoinRequests.invalidate({ postId: postId || '' });
    },
  });

  const upsertConversationMutation = trpc.messages.upsertConversation.useMutation({
    onSuccess: (conv) => {
      router.push(`/chat/${conv.id}` as any);
    },
  });

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
    const isOwner = currentUser?.id === post.userId;
    const isMember = !!currentUser && post.likedBy?.includes(currentUser.id);
    if (post.category === 'study' && post.joinPolicy === 'approval' && !isOwner && !isMember) {
      if (post.joinRequestStatus === 'pending') return;
      requestToJoinMutation.mutate({ postId: post.id });
      return;
    }
    toggleLikeMutation.mutate({ postId: post.id });
  };

  const handleRespondToJoinRequest = (requesterId: string, action: 'approve' | 'decline') => {
    if (!post) return;
    respondToJoinRequestMutation.mutate({ postId: post.id, requesterId, action });
  };

  const handleMessageSeller = () => {
    if (!post) return;
    upsertConversationMutation.mutate({ otherUserId: post.userId, postId: post.id });
  };

  const handleSubmitOffer = () => {
    if (!post) return;
    const amount = Number(offerAmount.replace(/[^0-9.]/g, ''));
    if (!offerAmount.trim() || Number.isNaN(amount) || amount < 0) {
      showAlert('Enter an amount', 'Please enter a valid offer amount.');
      return;
    }
    submitOfferMutation.mutate({ postId: post.id, amount });
  };

  const handleWithdrawOffer = () => {
    if (!myOfferQuery.data) return;
    withdrawOfferMutation.mutate({ offerId: myOfferQuery.data.id });
  };

  const handleAcceptOffer = (offerId: string) => {
    acceptOfferMutation.mutate({ offerId });
  };

  const handleDeclineOffer = (offerId: string) => {
    declineOfferMutation.mutate({ offerId });
  };

  const handleConfirmDeal = () => {
    if (!post) return;
    confirmDealMutation.mutate({ postId: post.id });
  };

  const handleCancelDeal = () => {
    if (!post) return;
    showAlert('Cancel this deal?', 'The listing will go back to available and both sides will need to start over.', [
      { text: 'Never mind', style: 'cancel' },
      { text: 'Cancel Deal', style: 'destructive', onPress: () => cancelDealMutation.mutate({ postId: post.id }) },
    ]);
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

  const headerScreen = <Stack.Screen options={{ title: '', headerTitle: () => null }} />;

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
  const isOwner = currentUser?.id === post.userId;
  const needsApproval = post.category === 'study' && post.joinPolicy === 'approval' && !isOwner && !isLiked;
  const isRequestPending = needsApproval && post.joinRequestStatus === 'pending';
  const pendingRequestCount = joinRequests?.length ?? 0;

  return (
    <>
      {headerScreen}
      <View style={styles.screenColumn}>
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

        {(!!post.taggedUsers?.length || !!post.taggedEventTitle) && (
          <View style={styles.taggedRow}>
            {!!post.taggedUsers?.length && (
              <Text style={styles.taggedText}>
                with{' '}
                {post.taggedUsers.map((tagged: { id: string; name: string }, i: number) => (
                  <Text
                    key={tagged.id}
                    style={styles.taggedName}
                    onPress={() =>
                      tagged.id === currentUser?.id
                        ? router.push('/(tabs)/profile')
                        : router.push(`/profile/${tagged.id}` as any)
                    }
                  >
                    {tagged.name}
                    {i < post.taggedUsers!.length - 1 ? ', ' : ''}
                  </Text>
                ))}
              </Text>
            )}
            {!!post.taggedEventTitle && (
              <Text style={styles.taggedText}>
                {!!post.taggedUsers?.length && '  '}
                at{' '}
                <Text style={styles.taggedName} onPress={() => router.push(`/post/${post.taggedEventId}` as any)}>
                  {post.taggedEventTitle}
                </Text>
              </Text>
            )}
          </View>
        )}

        {post.category === 'market' ? (
          <>
            <Text style={styles.marketTitle}>{post.title || 'Untitled listing'}</Text>

            {post.imageUrl && (
              <PostMedia uri={post.imageUrl} mediaType={post.mediaType} style={styles.marketImage} resizeMode="cover" />
            )}

            <View style={styles.marketMetaRow}>
              {post.price != null && (
                <View style={styles.priceBadge}>
                  <Tag size={13} color={INK} strokeWidth={2.5} />
                  <Text style={styles.priceBadgeText}>{post.price === 0 ? 'Free' : `$${post.price}`}</Text>
                </View>
              )}
              {post.listingStatus === 'pending' && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              )}
              {post.listingStatus === 'sold' && (
                <View style={styles.soldBadge}>
                  <Text style={styles.soldBadgeText}>Sold</Text>
                </View>
              )}
            </View>

            {!!post.condition && <Text style={styles.marketCondition}>{post.condition}</Text>}

            {!!post.paymentMethods?.length && (
              <View style={styles.tagRow}>
                <Text style={styles.paymentMethodsLabel}>Accepts:</Text>
                {post.paymentMethods.map((method: string) => (
                  <Chip key={method} label={method} variant="outline" color={palette.skyBlue} size="sm" />
                ))}
              </View>
            )}

            {!!post.tags?.length && (
              <View style={styles.tagRow}>
                {post.tags.map((tag: string) => (
                  <Chip key={tag} label={tag} variant="outline" color={palette.skyBlue} size="sm" />
                ))}
              </View>
            )}

            <Text style={styles.postContent}>{post.content}</Text>

            {post.listingStatus === 'sold' && (
              <View style={styles.dealtWithRow}>
                <Text style={styles.dealtWithText}>Sold to {post.dealtWithUserName || 'a buyer'}</Text>
              </View>
            )}

            {post.listingStatus === 'pending' && (
              currentUser?.id === post.userId || currentUser?.id === post.dealtWithUserId ? (
                <>
                  <View style={styles.dealtWithRow}>
                    <View style={styles.dealtWithTextWrap}>
                      <Text style={styles.dealtWithText}>
                        Deal in progress with{' '}
                        {currentUser?.id === post.userId ? (post.dealtWithUserName || 'a buyer') : 'the seller'}
                      </Text>
                      <Text style={styles.confirmStatusText}>
                        {dealQuery.data?.confirmedBySeller ? 'Seller confirmed ✓' : 'Waiting on seller'}
                        {'  ·  '}
                        {dealQuery.data?.confirmedByBuyer ? 'Buyer confirmed ✓' : 'Waiting on buyer'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dealActionsRow}>
                    <View style={[styles.marketCtaWrap, styles.dealActionsPrimary]}>
                      <HardShadow offset={5} radius={16} />
                      <TouchableOpacity
                        style={styles.marketCtaButton}
                        onPress={handleConfirmDeal}
                        disabled={confirmDealMutation.isPending}
                      >
                        {confirmDealMutation.isPending ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.marketCtaText}>Confirm Completed</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={handleCancelDeal}
                      disabled={cancelDealMutation.isPending}
                      style={styles.cancelDealButton}
                    >
                      <Text style={styles.undoText}>Cancel Deal</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.dealtWithRow}>
                  <Text style={styles.dealtWithText}>Pending a sale to another buyer</Text>
                </View>
              )
            )}

            {post.listingStatus === 'available' && currentUser?.id === post.userId && (
              <View style={styles.marketCtaWrap}>
                <HardShadow offset={5} radius={16} />
                <TouchableOpacity style={styles.marketCtaButton} onPress={() => setOffersPickerVisible(true)}>
                  <Text style={styles.marketCtaText}>
                    Offers
                    {offersListQuery.data
                      ? ` (${offersListQuery.data.filter((o) => o.status === 'pending').length})`
                      : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {post.listingStatus === 'available' && currentUser?.id !== post.userId && (
              <>
                {myOfferQuery.data?.status === 'pending' ? (
                  <View style={styles.dealtWithRow}>
                    <Text style={styles.dealtWithText}>Your offer: ${myOfferQuery.data.amount}</Text>
                    <TouchableOpacity onPress={handleWithdrawOffer} disabled={withdrawOfferMutation.isPending}>
                      <Text style={styles.undoText}>Withdraw</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.offerInputRow}>
                      <Text style={styles.offerInputPrefix}>$</Text>
                      <TextInput
                        style={styles.offerInput}
                        placeholder={post.price != null ? String(post.price) : 'Enter amount'}
                        placeholderTextColor={Colors.light.placeholder}
                        value={offerAmount}
                        onChangeText={setOfferAmount}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.marketCtaWrap}>
                      <HardShadow offset={5} radius={16} />
                      <TouchableOpacity
                        style={styles.marketCtaButton}
                        onPress={handleSubmitOffer}
                        disabled={submitOfferMutation.isPending}
                      >
                        {submitOfferMutation.isPending ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.marketCtaText}>Make Offer</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                <TouchableOpacity
                  onPress={handleMessageSeller}
                  disabled={upsertConversationMutation.isPending}
                  style={styles.messageSellerLink}
                >
                  <Text style={styles.messageSellerLinkText}>
                    {upsertConversationMutation.isPending ? 'Opening…' : 'Message Seller'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.postContent}>{post.content}</Text>

            {post.imageUrl && (
              <PostMedia uri={post.imageUrl} mediaType={post.mediaType} style={styles.postImage} resizeMode="contain" />
            )}
          </>
        )}

        <View style={styles.postActions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              post.category === 'events' && isLiked && styles.interestActive,
              post.category === 'study' && (isLiked || isRequestPending) && styles.studyActive,
              { transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
            onPress={handleToggleLike}
            disabled={toggleLikeMutation.isPending || requestToJoinMutation.isPending || isRequestPending}
          >
            {toggleLikeMutation.isPending || requestToJoinMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.light.textSecondary} />
            ) : post.category === 'events' ? (
              <Star
                size={18}
                color={isLiked ? '#FFFFFF' : Colors.light.textSecondary}
                fill={isLiked ? '#FFFFFF' : 'transparent'}
                strokeWidth={2.5}
              />
            ) : post.category === 'study' ? null : (
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
                (isLiked || isRequestPending) &&
                  (post.category === 'events'
                    ? styles.interestTextActive
                    : post.category === 'study'
                      ? styles.studyTextActive
                      : styles.actionTextActive),
              ]}
            >
              {post.category === 'events'
                ? isLiked
                  ? 'Interested'
                  : 'Interested?'
                : post.category === 'study'
                ? isLiked
                  ? 'Joined'
                  : isRequestPending
                    ? 'Requested'
                    : needsApproval
                      ? 'Request to Join'
                      : 'Join'
                : post.likes}
            </Text>
          </Pressable>

          {post.category === 'study' && post.joinPolicy === 'approval' && isOwner && (
            <Pressable style={styles.actionButton} onPress={() => setJoinRequestsPickerVisible(true)}>
              <Text style={styles.actionText}>
                Requests{pendingRequestCount > 0 ? ` (${pendingRequestCount})` : ''}
              </Text>
            </Pressable>
          )}

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

      <Modal
        visible={offersPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOffersPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setOffersPickerVisible(false)}
        >
          <View style={styles.optionsCard}>
            <Text style={styles.modalTitle}>Offers</Text>
            {(offersListQuery.data?.length ?? 0) === 0 ? (
              <Text style={styles.noCommentsText}>No offers yet.</Text>
            ) : (
              offersListQuery.data?.map((offer) => (
                <View key={offer.id} style={styles.offerRow}>
                  <Avatar uri={offer.buyerAvatar} name={offer.buyerName || 'Buyer'} size={32} />
                  <View style={styles.offerRowBody}>
                    <Text style={styles.inquirerName}>{offer.buyerName || 'Unknown'}</Text>
                    <Text style={styles.offerAmountText}>
                      ${offer.amount}
                      {offer.status !== 'pending' ? ` · ${offer.status}` : ''}
                    </Text>
                  </View>
                  {offer.status === 'pending' && (
                    <View style={styles.offerRowActions}>
                      <TouchableOpacity
                        onPress={() => handleAcceptOffer(offer.id)}
                        disabled={acceptOfferMutation.isPending || declineOfferMutation.isPending}
                      >
                        <Text style={styles.offerAcceptText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeclineOffer(offer.id)}
                        disabled={acceptOfferMutation.isPending || declineOfferMutation.isPending}
                      >
                        <Text style={styles.offerDeclineText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
            <TouchableOpacity style={styles.optionsCancel} onPress={() => setOffersPickerVisible(false)}>
              <Text style={styles.optionsCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={joinRequestsPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinRequestsPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setJoinRequestsPickerVisible(false)}
        >
          <View style={styles.optionsCard}>
            <Text style={styles.modalTitle}>Join requests</Text>
            {(joinRequests?.length ?? 0) === 0 ? (
              <Text style={styles.noCommentsText}>No pending requests right now.</Text>
            ) : (
              joinRequests?.map((request) => (
                <View key={request.userId} style={styles.joinRequestRow}>
                  <Avatar uri={request.userAvatar} name={request.userName} size={32} />
                  <Text style={[styles.inquirerName, styles.joinRequestName]} numberOfLines={1}>
                    {request.userName}
                  </Text>
                  <View style={styles.joinRequestActions}>
                    <TouchableOpacity
                      style={styles.joinRequestApprove}
                      onPress={() => handleRespondToJoinRequest(request.userId, 'approve')}
                      disabled={respondToJoinRequestMutation.isPending}
                    >
                      <Text style={styles.joinRequestApproveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.joinRequestDecline}
                      onPress={() => handleRespondToJoinRequest(request.userId, 'decline')}
                      disabled={respondToJoinRequestMutation.isPending}
                    >
                      <Text style={styles.joinRequestDeclineText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.optionsCancel} onPress={() => setJoinRequestsPickerVisible(false)}>
              <Text style={styles.optionsCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      </ScrollView>
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
      </View>
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
  screenColumn: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 16,
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
  taggedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4,
    marginBottom: 8,
  },
  taggedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  taggedName: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: palette.blue,
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
  marketTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 10,
  },
  marketImage: {
    width: '100%',
    height: 320,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: INK,
    marginBottom: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  marketMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.amber,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  priceBadgeText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: INK,
  },
  soldBadge: {
    backgroundColor: palette.rust,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  soldBadgeText: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  marketCondition: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  marketCtaWrap: {
    position: 'relative',
    marginTop: 4,
  },
  marketCtaButton: {
    backgroundColor: palette.blue,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: INK,
    paddingVertical: 14,
    alignItems: 'center',
  },
  marketCtaButtonDisabled: {
    backgroundColor: '#FFFFFF',
  },
  marketCtaText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  marketCtaTextDisabled: {
    color: Colors.light.textSecondary,
  },
  dealtWithRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  dealtWithText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.light.text,
  },
  dealtWithTextWrap: {
    flex: 1,
    gap: 2,
  },
  confirmStatusText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  undoText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.light.primary,
  },
  pendingBadge: {
    backgroundColor: palette.amber,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: INK,
  },
  paymentMethodsLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
    alignSelf: 'center',
  },
  dealActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  dealActionsPrimary: {
    flex: 1,
    marginTop: 0,
  },
  cancelDealButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  offerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.card,
    borderWidth: 2.5,
    borderColor: INK,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  offerInputPrefix: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  offerInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  messageSellerLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  messageSellerLinkText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.light.textSecondary,
    textDecorationLine: 'underline',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  offerRowBody: {
    flex: 1,
    gap: 2,
  },
  offerAmountText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  offerRowActions: {
    gap: 6,
    alignItems: 'flex-end',
  },
  offerAcceptText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.light.primary,
  },
  offerDeclineText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.light.error,
  },
  inquirerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  inquirerName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  joinRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  joinRequestName: {
    flex: 1,
    minWidth: 0,
  },
  joinRequestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  joinRequestApprove: {
    backgroundColor: palette.blue,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  joinRequestApproveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900' as const,
  },
  joinRequestDecline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  joinRequestDeclineText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: '900' as const,
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
  studyActive: {
    backgroundColor: palette.blue,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  studyTextActive: {
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


