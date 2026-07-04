import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar, MapPin, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import HardShadow from '@/components/ui/HardShadow';
import Chip from '@/components/ui/Chip';
import Colors, { INK, palette } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { formatScheduledAt } from '@/lib/formatSchedule';

export default function EventsPreview() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.posts.getInfinite.useInfiniteQuery(
    { limit: 20, category: 'events' },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const toggleLikeMutation = trpc.posts.toggleLike.useMutation({
    onSuccess: () => utils.posts.getInfinite.invalidate(),
  });

  const events = data?.pages.flatMap((page) => page.items) ?? [];

  const toggleInterested = (postId: string) => {
    toggleLikeMutation.mutate({ postId });
    Haptics.selectionAsync();
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No events yet — tap + to host one.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {events.map((event) => {
        const isInterested = currentUser ? event.likedBy.includes(currentUser.id) : false;
        return (
          <TouchableOpacity
            key={event.id}
            style={styles.cardWrap}
            activeOpacity={0.9}
            onPress={() => router.push(`/post/${event.id}` as any)}
          >
            <HardShadow offset={7} radius={22} />
            <View style={styles.card}>
              <View style={[styles.imageBlock, { backgroundColor: palette.skyBlue }]}>
                <Calendar size={32} color={INK} strokeWidth={2} />
              </View>
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={1}>{event.title || 'Untitled event'}</Text>
                <Text style={styles.host}>Hosted by {event.userName}</Text>
                {(!!event.scheduledAt || !!event.location) && (
                  <View style={styles.metaRow}>
                    {!!event.scheduledAt && (
                      <>
                        <Calendar size={13} color={Colors.light.textSecondary} strokeWidth={2.5} />
                        <Text style={styles.metaText}>{formatScheduledAt(event.scheduledAt)}</Text>
                      </>
                    )}
                    {!!event.location && (
                      <>
                        <MapPin size={13} color={Colors.light.textSecondary} strokeWidth={2.5} />
                        <Text style={styles.metaText}>{event.location}</Text>
                      </>
                    )}
                  </View>
                )}
                {!!event.content && <Text style={styles.description}>{event.content}</Text>}
                {!!event.tags?.length && (
                  <View style={styles.tagRow}>
                    {event.tags.map((tag: string) => (
                      <Chip key={tag} label={tag} variant="outline" color={palette.skyBlue} size="sm" />
                    ))}
                  </View>
                )}
                <View style={styles.footerRow}>
                  <Text style={styles.interestedText}>{event.likes} interested</Text>
                  <TouchableOpacity
                    style={[styles.interestBtn, isInterested && styles.interestBtnActive]}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleInterested(event.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Star size={14} color={isInterested ? '#FFFFFF' : INK} fill={isInterested ? '#FFFFFF' : 'transparent'} strokeWidth={2.5} />
                    <Text style={[styles.interestBtnText, isInterested && styles.interestBtnTextActive]}>
                      {isInterested ? 'Interested' : 'Interested?'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
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
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: INK,
    overflow: 'hidden',
  },
  imageBlock: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: INK,
  },
  body: {
    padding: 14,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: INK,
  },
  host: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  description: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.text,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
    marginRight: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  interestedText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  interestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  interestBtnActive: {
    backgroundColor: palette.orange,
  },
  interestBtnText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: INK,
  },
  interestBtnTextActive: {
    color: '#FFFFFF',
  },
});
