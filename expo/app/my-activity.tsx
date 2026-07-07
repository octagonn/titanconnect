import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Colors, { INK } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { formatScheduledAt } from '@/lib/formatSchedule';
import ListRow from '@/components/ui/ListRow';
import HardShadow from '@/components/ui/HardShadow';
import type { Post } from '@/types';

function subtitleFor(post: Post): string | undefined {
  if (post.category === 'market') {
    const price = post.price === 0 ? 'Free' : post.price != null ? `$${post.price}` : undefined;
    return [price, post.condition].filter(Boolean).join(' · ') || undefined;
  }
  const when = post.scheduledAt ? formatScheduledAt(post.scheduledAt) : undefined;
  return [when, post.location].filter(Boolean).join(' · ') || undefined;
}

export default function MyActivityScreen() {
  const router = useRouter();
  const { data, isLoading } = trpc.posts.getJoined.useQuery();

  const posts = useMemo(() => data ?? [], [data]);
  const events = useMemo(() => posts.filter((p) => p.category === 'events'), [posts]);
  const studyGroups = useMemo(() => posts.filter((p) => p.category === 'study'), [posts]);
  const listings = useMemo(() => posts.filter((p) => p.category === 'market'), [posts]);

  const sections: { title: string; items: Post[] }[] = [
    { title: 'Events', items: events },
    { title: 'Study Buddy', items: studyGroups },
    { title: 'Marketplace', items: listings },
  ];
  const hasNothing = !isLoading && posts.length === 0;

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : hasNothing ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing yet</Text>
          <Text style={styles.emptySubtitle}>
            Join an event, a study group, or save a listing to see it here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {sections
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <View key={section.title} style={styles.sectionWrap}>
                <HardShadow offset={6} radius={20} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.rowList}>
                    {section.items.map((item) => (
                      <ListRow
                        key={item.id}
                        avatarUri={item.userAvatar}
                        avatarName={item.userName}
                        title={item.title || item.content}
                        subtitle={subtitleFor(item)}
                        onPress={() => router.push(`/post/${item.id}` as any)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  sectionWrap: {
    position: 'relative',
  },
  section: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  rowList: {
    gap: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: INK,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
