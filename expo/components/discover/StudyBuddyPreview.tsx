import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BookOpen, Clock, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import HardShadow from '@/components/ui/HardShadow';
import Avatar from '@/components/ui/Avatar';
import Chip from '@/components/ui/Chip';
import Colors, { INK, palette } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { formatScheduledAt } from '@/lib/formatSchedule';

export default function StudyBuddyPreview() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.posts.getInfinite.useInfiniteQuery(
    { limit: 20, category: 'study' },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const toggleLikeMutation = trpc.posts.toggleLike.useMutation({
    onSuccess: () => utils.posts.getInfinite.invalidate(),
  });

  const groups = data?.pages.flatMap((page) => page.items) ?? [];

  const toggleJoin = (postId: string) => {
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

  if (groups.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No study groups yet — tap + to start one.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {groups.map((group) => {
        const isJoined = currentUser ? group.likedBy.includes(currentUser.id) : false;
        return (
          <TouchableOpacity
            key={group.id}
            style={styles.cardWrap}
            activeOpacity={0.9}
            onPress={() => router.push(`/post/${group.id}` as any)}
          >
            <HardShadow offset={6} radius={20} />
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={[styles.courseWell, { backgroundColor: palette.skyBlue }]}>
                  <BookOpen size={18} color={INK} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.course}>{group.course || 'Study group'}</Text>
                  <Text style={styles.topic}>{group.title || group.content}</Text>
                </View>
              </View>

              {(!!group.scheduledAt || !!group.location) && (
                <View style={styles.metaRow}>
                  {!!group.scheduledAt && (
                    <>
                      <Clock size={13} color={Colors.light.textSecondary} strokeWidth={2.5} />
                      <Text style={styles.metaText}>{formatScheduledAt(group.scheduledAt)}</Text>
                    </>
                  )}
                  {!!group.location && (
                    <>
                      <MapPin size={13} color={Colors.light.textSecondary} strokeWidth={2.5} />
                      <Text style={styles.metaText}>{group.location}</Text>
                    </>
                  )}
                </View>
              )}

              {!!group.title && <Text style={styles.description}>{group.content}</Text>}

              {!!group.tags?.length && (
                <View style={styles.tagRow}>
                  {group.tags.map((tag: string) => (
                    <Chip key={tag} label={tag} variant="outline" color={palette.skyBlue} size="sm" />
                  ))}
                </View>
              )}

              <View style={styles.footerRow}>
                <View style={styles.hostRow}>
                  <Avatar name={group.userName} uri={group.userAvatar} size={28} />
                  <Text style={styles.hostText}>{group.userName} · {group.likes} joined</Text>
                </View>
                <TouchableOpacity
                  style={[styles.joinBtn, isJoined && styles.joinBtnActive]}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleJoin(group.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.joinBtnText, isJoined && styles.joinBtnTextActive]}>
                    {isJoined ? 'Joined' : 'Join'}
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
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  courseWell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  course: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: INK,
  },
  topic: {
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
    marginTop: 2,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  joinBtn: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: palette.blue,
  },
  joinBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  joinBtnText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  joinBtnTextActive: {
    color: INK,
  },
});
