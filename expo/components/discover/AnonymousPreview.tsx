import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ActivityIndicator, Image, Animated } from 'react-native';
import { Ghost, Heart, MessageCircle, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import HardShadow from '@/components/ui/HardShadow';
import Colors, { INK, palette } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import type { Post } from '@/types';

export default function AnonymousPreview() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.posts.getInfinite.useInfiniteQuery(
    { limit: 20, category: 'anon' },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const toggleLikeMutation = trpc.posts.toggleLike.useMutation({
    onSuccess: () => utils.posts.getInfinite.invalidate(),
  });

  const voteMutation = trpc.posts.vote.useMutation({
    onSuccess: () => utils.posts.getInfinite.invalidate(),
  });

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  const toggleLike = (postId: string) => {
    toggleLikeMutation.mutate({ postId });
    Haptics.selectionAsync();
  };

  const castVote = (postId: string, optionIndex: number) => {
    voteMutation.mutate({ postId, optionIndex });
    Haptics.selectionAsync();
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No anonymous posts yet — tap + to share something.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {posts.map((post) => {
        const isLiked = currentUser ? post.likedBy.includes(currentUser.id) : false;
        return (
          <TouchableOpacity
            key={post.id}
            style={styles.cardWrap}
            activeOpacity={0.9}
            onPress={() => router.push(`/post/${post.id}` as any)}
          >
            <HardShadow offset={6} radius={20} color={INK} />
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.maskWell}>
                  <Ghost size={18} color={INK} strokeWidth={2.5} />
                </View>
                <Text style={styles.anonLabel}>{post.userName}</Text>
              </View>

              {post.subtype === 'poll' ? (
                <PollBody post={post} onVote={(i) => castVote(post.id, i)} />
              ) : post.subtype === 'wishbone' ? (
                <WishboneBody post={post} onVote={(i) => castVote(post.id, i)} />
              ) : (
                <Text style={styles.content}>{post.content}</Text>
              )}

              <View style={styles.actionsRow}>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleLike(post.id);
                  }}
                  disabled={toggleLikeMutation.isPending && toggleLikeMutation.variables?.postId === post.id}
                >
                  {toggleLikeMutation.isPending && toggleLikeMutation.variables?.postId === post.id ? (
                    <ActivityIndicator size="small" color={Colors.light.textSecondary} />
                  ) : (
                    <Heart
                      size={18}
                      color={isLiked ? palette.rust : Colors.light.textSecondary}
                      fill={isLiked ? palette.rust : 'transparent'}
                      strokeWidth={2.5}
                    />
                  )}
                  <Text style={styles.actionText}>{post.likes}</Text>
                </Pressable>
                <View style={styles.actionBtn}>
                  <MessageCircle size={18} color={Colors.light.textSecondary} strokeWidth={2.5} />
                  <Text style={styles.actionText}>{post.comments.length}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PollBody({ post, onVote }: { post: Post; onVote: (optionIndex: number) => void }) {
  const options = post.pollOptions ?? [];
  const votes = post.pollVotes ?? options.map(() => 0);
  const total = votes.reduce((sum, v) => sum + v, 0);
  const myVote = post.myVoteIndex;

  // One Animated.Value per option, holding its fill percentage — recreated
  // only if the option count itself changes (never, in practice, since
  // options are immutable once a poll is created).
  const animsRef = useRef<Animated.Value[]>([]);
  if (animsRef.current.length !== options.length) {
    animsRef.current = options.map((_, i) => {
      const pct = total > 0 ? Math.round(((votes[i] ?? 0) / total) * 100) : 0;
      return new Animated.Value(pct);
    });
  }

  useEffect(() => {
    options.forEach((_, i) => {
      const count = votes[i] ?? 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      Animated.timing(animsRef.current[i], {
        toValue: pct,
        duration: 350,
        useNativeDriver: false,
      }).start();
    });
    // Re-run whenever the vote tallies change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(votes)]);

  return (
    <View style={styles.pollBody}>
      {!!post.content && <Text style={styles.pollQuestion}>{post.content}</Text>}
      {options.map((option, i) => {
        const count = votes[i] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const isMine = myVote === i;
        const width = animsRef.current[i]?.interpolate({
          inputRange: [0, 100],
          outputRange: ['0%', '100%'],
        });
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [styles.pollOption, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={(e) => {
              e.stopPropagation();
              onVote(i);
            }}
          >
            <Animated.View style={[styles.pollFill, { width }, isMine && styles.pollFillMine]} />
            <View style={styles.pollOptionContent}>
              {isMine && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
              <Text style={styles.pollOptionLabel}>{option.label}</Text>
              <Text style={styles.pollOptionPct}>{pct}%</Text>
            </View>
          </Pressable>
        );
      })}
      {total > 0 && (
        <Text style={styles.pollTotal}>
          {total} vote{total === 1 ? '' : 's'}
        </Text>
      )}
    </View>
  );
}

function WishboneBody({ post, onVote }: { post: Post; onVote: (optionIndex: number) => void }) {
  const votes = post.wishboneVotes ?? [0, 0];
  const total = votes[0] + votes[1];
  const leftPct = total > 0 ? Math.round((votes[0] / total) * 100) : 0;
  const rightPct = total > 0 ? 100 - leftPct : 0;
  const myVote = post.myVoteIndex;

  const leftScale = useRef(new Animated.Value(1)).current;
  const rightScale = useRef(new Animated.Value(1)).current;
  const badgeOpacity = useRef(new Animated.Value(total > 0 ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(badgeOpacity, {
      toValue: total > 0 ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [total, badgeOpacity]);

  const pulse = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const vote = (index: 0 | 1) => {
    pulse(index === 0 ? leftScale : rightScale);
    onVote(index);
  };

  return (
    <View>
      {!!post.content && <Text style={styles.content}>{post.content}</Text>}
      <View style={styles.wishboneRow}>
        <Pressable
          style={styles.wishbonePressable}
          onPress={(e) => {
            e.stopPropagation();
            vote(0);
          }}
        >
          <Animated.View style={[styles.wishboneSide, { transform: [{ scale: leftScale }] }]}>
            {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.wishboneImage} />}
            {myVote === 0 && (
              <View style={styles.wishboneCheck}>
                <Check size={16} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
            <Animated.View style={[styles.wishbonePctBadge, { opacity: badgeOpacity }]}>
              <Text style={styles.wishbonePctText}>{leftPct}%</Text>
            </Animated.View>
          </Animated.View>
        </Pressable>
        <View style={styles.wishboneDivider} />
        <Pressable
          style={styles.wishbonePressable}
          onPress={(e) => {
            e.stopPropagation();
            vote(1);
          }}
        >
          <Animated.View style={[styles.wishboneSide, { transform: [{ scale: rightScale }] }]}>
            {post.imageUrl2 && <Image source={{ uri: post.imageUrl2 }} style={styles.wishboneImage} />}
            {myVote === 1 && (
              <View style={styles.wishboneCheck}>
                <Check size={16} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
            <Animated.View style={[styles.wishbonePctBadge, { opacity: badgeOpacity }]}>
              <Text style={styles.wishbonePctText}>{rightPct}%</Text>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  cardWrap: {
    position: 'relative',
  },
  card: {
    backgroundColor: INK,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: INK,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  maskWell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: palette.skyBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonLabel: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  content: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    lineHeight: 21,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  pollBody: {
    gap: 8,
  },
  pollQuestion: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: 2,
  },
  pollOption: {
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pollFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  pollFillMine: {
    backgroundColor: `${palette.skyBlue}55`,
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pollOptionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  pollOptionPct: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  pollTotal: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  wishboneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    height: 170,
  },
  wishbonePressable: {
    flex: 1,
  },
  wishboneSide: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  wishboneImage: {
    width: '100%',
    height: '100%',
  },
  wishboneDivider: {
    width: 3,
    backgroundColor: '#FFFFFF',
  },
  wishboneCheck: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: palette.rust,
    borderRadius: 10,
    padding: 4,
  },
  wishbonePctBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  wishbonePctText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
});
