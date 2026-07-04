import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ShoppingBag, Tag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import HardShadow from '@/components/ui/HardShadow';
import Chip from '@/components/ui/Chip';
import Colors, { INK, palette } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';

export default function MarketplacePreview() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const { data, isLoading } = trpc.posts.getInfinite.useInfiniteQuery(
    { limit: 20, category: 'market' },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const upsertConversation = trpc.messages.upsertConversation.useMutation({
    onSuccess: (conv) => {
      router.push(`/chat/${conv.id}` as any);
    },
  });

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
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.cardWrap}
            activeOpacity={0.9}
            onPress={() => router.push(`/post/${item.id}` as any)}
          >
            <HardShadow offset={6} radius={20} />
            <View style={styles.card}>
              <View style={[styles.imageBlock, { backgroundColor: palette.skyBlue }]}>
                <ShoppingBag size={28} color={INK} strokeWidth={2} />
                {item.price != null && (
                  <View style={styles.priceTag}>
                    <Tag size={11} color={INK} strokeWidth={2.5} />
                    <Text style={styles.priceText}>{item.price === 0 ? 'Free' : `$${item.price}`}</Text>
                  </View>
                )}
              </View>
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{item.title || 'Untitled listing'}</Text>
                {!!item.condition && <Text style={styles.condition}>{item.condition}</Text>}
                {!!item.tags?.length && (
                  <View style={styles.tagRow}>
                    {item.tags.map((tag: string) => (
                      <Chip key={tag} label={tag} variant="outline" color={palette.skyBlue} size="sm" />
                    ))}
                  </View>
                )}
                <Text style={styles.seller}>{item.userName}</Text>
                <TouchableOpacity
                  style={[styles.messageBtn, isOwnListing && styles.messageBtnDisabled]}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!isOwnListing) upsertConversation.mutate({ otherUserId: item.userId });
                  }}
                  activeOpacity={0.8}
                  disabled={isOwnListing || upsertConversation.isPending}
                >
                  <Text style={[styles.messageBtnText, isOwnListing && styles.messageBtnTextDisabled]}>
                    {isOwnListing ? 'Your Listing' : 'Message Seller'}
                  </Text>
                </TouchableOpacity>
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
    width: '46%',
    flexGrow: 1,
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
