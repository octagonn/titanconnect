import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { showAlert } from '@/lib/alert';
import Colors, { INK, palette } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import HardShadow from '@/components/ui/HardShadow';

export default function PinnedListingCard({ otherUserId }: { otherUserId: string }) {
  const router = useRouter();
  const [offerAmount, setOfferAmount] = useState('');
  const utils = trpc.useUtils();

  const dealQuery = trpc.offers.getForConversation.useQuery({ otherUserId });

  const invalidate = () => {
    utils.offers.getForConversation.invalidate({ otherUserId });
    if (dealQuery.data?.post.id) {
      utils.posts.getById.invalidate({ id: dealQuery.data.post.id });
      utils.offers.getMine.invalidate({ postId: dealQuery.data.post.id });
    }
    utils.posts.getInfinite.invalidate();
  };

  const submitOfferMutation = trpc.offers.submit.useMutation({
    onSuccess: () => {
      invalidate();
      setOfferAmount('');
    },
    onError: (err) => showAlert('Offer failed', err.message || 'Could not submit offer.'),
  });

  const withdrawOfferMutation = trpc.offers.withdraw.useMutation({ onSuccess: invalidate });

  const confirmDealMutation = trpc.offers.confirmCompleted.useMutation({
    onSuccess: invalidate,
    onError: (err) => showAlert('Could not confirm', err.message || 'Please try again.'),
  });

  const cancelDealMutation = trpc.offers.cancelDeal.useMutation({
    onSuccess: invalidate,
    onError: (err) => showAlert('Could not cancel', err.message || 'Please try again.'),
  });

  if (!dealQuery.data) return null;

  const { post, offer, myRole, confirmedBySeller, confirmedByBuyer } = dealQuery.data;
  const isParticipantInDeal =
    myRole === 'seller' ? true : !!post.dealtWithUserId && post.dealtWithUserId === offer?.buyerId;

  const handleSubmitOffer = () => {
    const amount = Number(offerAmount.replace(/[^0-9.]/g, ''));
    if (!offerAmount.trim() || Number.isNaN(amount) || amount < 0) {
      showAlert('Enter an amount', 'Please enter a valid offer amount.');
      return;
    }
    submitOfferMutation.mutate({ postId: post.id, amount });
  };

  const handleCancelDeal = () => {
    showAlert('Cancel this deal?', 'The listing will go back to available.', [
      { text: 'Never mind', style: 'cancel' },
      { text: 'Cancel Deal', style: 'destructive', onPress: () => cancelDealMutation.mutate({ postId: post.id }) },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <HardShadow offset={4} radius={16} />
      <View style={styles.card}>
        <TouchableOpacity style={styles.header} onPress={() => router.push(`/post/${post.id}` as any)} activeOpacity={0.8}>
          {post.imageUrl ? (
            <Image source={{ uri: post.imageUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]} />
          )}
          <View style={styles.headerBody}>
            <Text style={styles.title} numberOfLines={1}>{post.title || 'Untitled listing'}</Text>
            <Text style={styles.price}>{post.price === 0 ? 'Free' : post.price != null ? `$${post.price}` : ''}</Text>
          </View>
          {post.listingStatus === 'pending' && (
            <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pending</Text></View>
          )}
          {post.listingStatus === 'sold' && (
            <View style={styles.soldBadge}><Text style={styles.soldBadgeText}>Sold</Text></View>
          )}
        </TouchableOpacity>

        {post.listingStatus === 'sold' && (
          <Text style={styles.statusText}>Deal completed</Text>
        )}

        {post.listingStatus === 'pending' && isParticipantInDeal && (
          <>
            <Text style={styles.statusText}>
              {confirmedBySeller ? 'Seller confirmed ✓' : 'Waiting on seller'}
              {'  ·  '}
              {confirmedByBuyer ? 'Buyer confirmed ✓' : 'Waiting on buyer'}
            </Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => confirmDealMutation.mutate({ postId: post.id })}
                disabled={confirmDealMutation.isPending}
              >
                {confirmDealMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryActionText}>Confirm Completed</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelDeal} disabled={cancelDealMutation.isPending}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {post.listingStatus === 'pending' && !isParticipantInDeal && (
          <Text style={styles.statusText}>Pending a sale to another buyer</Text>
        )}

        {post.listingStatus === 'available' && myRole === 'seller' && (
          <TouchableOpacity onPress={() => router.push(`/post/${post.id}` as any)}>
            <Text style={styles.reviewLink}>Review offers on this listing</Text>
          </TouchableOpacity>
        )}

        {post.listingStatus === 'available' && myRole === 'buyer' && (
          <>
            {offer?.status === 'pending' ? (
              <View style={styles.actionsRow}>
                <Text style={styles.statusText}>Your offer: ${offer.amount}</Text>
                <TouchableOpacity
                  onPress={() => withdrawOfferMutation.mutate({ offerId: offer.id })}
                  disabled={withdrawOfferMutation.isPending}
                >
                  <Text style={styles.cancelText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.offerRow}>
                <TextInput
                  style={styles.offerInput}
                  placeholder={post.price != null ? `$${post.price}` : 'Offer amount'}
                  placeholderTextColor={Colors.light.placeholder}
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.primaryAction} onPress={handleSubmitOffer} disabled={submitOfferMutation.isPending}>
                  {submitOfferMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryActionText}>Make Offer</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderWidth: 2.5,
    borderColor: INK,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: INK,
  },
  thumbPlaceholder: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  headerBody: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: INK,
  },
  price: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  pendingBadge: {
    backgroundColor: palette.amber,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: INK,
  },
  soldBadge: {
    backgroundColor: palette.rust,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soldBadgeText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  primaryAction: {
    backgroundColor: palette.blue,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.light.error,
  },
  reviewLink: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.light.primary,
    textDecorationLine: 'underline',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerInput: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
});
