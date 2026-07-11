import { View, Text, StyleSheet, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { ShoppingBag, Tag, Bookmark } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import HardShadow from '@/components/ui/HardShadow';
import Chip from '@/components/ui/Chip';
import Colors, { INK, palette } from '@/constants/colors';
import { shadowOffset } from '@/constants/neo';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';

export default function MarketplacePreview() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.posts.getInfinite.useInfiniteQuery(
    { limit: 20, category: 'market' },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const upsertConversation = trpc.messages.upsertConversation.useMutation({
    onSuccess: (conv) => {
      router.push(`/chat/${conv.id}` as any);
    },
  });

  const toggleSaveMutation = trpc.posts.toggleLike.useMutation({
    onSuccess: () => utils.posts.getInfinite.invalidate(),
  });

  const toggleSave = (postId: string) => {
    toggleSaveMutation.mutate({ postId });
    Haptics.selectionAsync();
  };

  const listings = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No listings yet — tap + to sell something.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {listings.map((item) => {
        const isOwnListing = currentUser?.id === item.userId;
        const isSaved = currentUser ? item.likedBy.includes(currentUser.id) : false;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.cardWrap}
            activeOpacity={0.9}
            onPress={() => router.push(`/post/${item.id}` as any)}
          >
            <HardShadow offset={shadowOffset.raised} radius={20} />
            <View style={styles.card}>
              <View style={[styles.imageBlock, { backgroundColor: palette.skyBlue }]}>
                <ShoppingBag size={28} color={INK} strokeWidth={2} />
                {!isOwnListing && (
                  <Pressable
                    style={({ pressed }) => [styles.saveBtn, { transform: [{ scale: pressed ? 0.88 : 1 }] }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleSave(item.id);
                    }}
                    disabled={toggleSaveMutation.isPending && toggleSaveMutation.variables?.postId === item.id}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {toggleSaveMutation.isPending && toggleSaveMutation.variables?.postId === item.id ? (
                      <ActivityIndicator size="small" color={INK} />
                    ) : (
                      <Bookmark
                        size={14}
                        color={INK}
                        fill={isSaved ? INK : 'transparent'}
                        strokeWidth={2.5}
                      />
                    )}
                  </Pressable>
                )}
                {item.price != null && (
                  <View style={styles.priceTag}>
                    <Tag size={11} color={INK} strokeWidth={2.5} />
                    <Text style={styles.priceText}>{item.price === 0 ? 'Free' : `$${item.price}`}</Text>
                  </View>
                )}
              </View>
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{item.title || 'Untitled listing'}</Text>
                {item.listingStatus === 'pending' && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                )}
                {item.listingStatus === 'sold' && (
                  <View style={styles.soldBadge}>
                    <Text style={styles.soldBadgeText}>Sold</Text>
                  </View>
                )}
                {!!item.condition && <Text style={styles.condition}>{item.condition}</Text>}
                {!!item.tags?.length && (
                  <View style={styles.tagRow}>
                    {item.tags.map((tag: string) => (
                      <Chip key={tag} label={tag} variant="outline" color={palette.skyBlue} size="sm" />
                    ))}
                  </View>
                )}
                <Text style={styles.seller}>{item.userName}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.messageBtn,
                    isOwnListing && styles.messageBtnDisabled,
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!isOwnListing) upsertConversation.mutate({ otherUserId: item.userId, postId: item.id });
                  }}
                  disabled={isOwnListing || (upsertConversation.isPending && upsertConversation.variables?.otherUserId === item.userId)}
                >
                  {upsertConversation.isPending && upsertConversation.variables?.otherUserId === item.userId ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.messageBtnText, isOwnListing && styles.messageBtnTextDisabled]}>
                      {isOwnListing ? 'Your Listing' : 'Message Seller'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardWrap: {
    position: 'relative',
    width: '45%',
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    overflow: 'hidden',
  },
  imageBlock: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: INK,
  },
  saveBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 8,
    padding: 4,
  },
  priceTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  priceText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: INK,
  },
  body: {
    padding: 10,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: INK,
    minHeight: 34,
  },
  condition: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.amber,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '900' as const,
    color: INK,
  },
  soldBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.rust,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  soldBadgeText: {
    fontSize: 10,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  seller: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  messageBtn: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: palette.blue,
  },
  messageBtnDisabled: {
    backgroundColor: '#FFFFFF',
  },
  messageBtnText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  messageBtnTextDisabled: {
    color: Colors.light.textSecondary,
  },
});
