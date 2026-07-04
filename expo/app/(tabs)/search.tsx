import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, UserPlus, Check } from 'lucide-react-native';

import Colors, { INK, palette } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import ListRow from '@/components/ui/ListRow';
import Chip from '@/components/ui/Chip';
import Avatar from '@/components/ui/Avatar';
import HardShadow from '@/components/ui/HardShadow';
import SegmentedControl from '@/components/ui/SegmentedControl';

type PersonResult = {
  id: string;
  name: string;
  avatar?: string;
  major?: string;
  year?: string;
  relationship: 'none' | 'pending' | 'incoming' | 'accepted' | 'blocked';
  connectionId: string | null;
};

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [mode, setMode] = useState<'people' | 'posts'>('people');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const peopleQuery = trpc.profiles.search.useQuery(
    { query: debouncedQuery, limit: 20 },
    { enabled: debouncedQuery.length > 0 && mode === 'people' }
  );

  const postsSearchQuery = trpc.posts.getInfinite.useInfiniteQuery(
    { limit: 20, search: debouncedQuery },
    { enabled: debouncedQuery.length > 0 && mode === 'posts', getNextPageParam: (last) => last.nextCursor }
  );

  const posts = postsSearchQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const sendRequest = trpc.connections.sendRequest.useMutation({
    onSuccess: () => peopleQuery.refetch(),
  });
  const respond = trpc.connections.respond.useMutation({
    onSuccess: () => peopleQuery.refetch(),
  });
  const removeConnection = trpc.connections.remove.useMutation({
    onSuccess: () => peopleQuery.refetch(),
  });

  const renderPersonRow = (item: PersonResult) => {
    const actionLabel =
      item.relationship === 'accepted'
        ? 'Friends'
        : item.relationship === 'pending'
        ? 'Cancel'
        : item.relationship === 'incoming'
        ? 'Accept'
        : 'Add';
    const isDisabled = item.relationship === 'accepted' || item.relationship === 'blocked';

    const onPress = () => {
      if (item.relationship === 'incoming' && item.connectionId) {
        respond.mutate({ connectionId: item.connectionId, action: 'accept' });
        return;
      }
      if (item.relationship === 'pending') {
        removeConnection.mutate({ targetUserId: item.id });
        return;
      }
      if (item.relationship === 'none') {
        sendRequest.mutate({ targetUserId: item.id });
      }
    };

    return (
      <ListRow
        key={item.id}
        avatarUri={item.avatar}
        avatarName={item.name}
        title={item.name}
        subtitle={[item.major, item.year].filter(Boolean).join(' • ') || 'Student'}
        onPress={() => router.push(`/profile/${item.id}` as any)}
        trailing={
          <Chip
            label={actionLabel}
            icon={item.relationship === 'incoming' ? Check : UserPlus}
            variant={isDisabled ? 'outline' : 'solid'}
            color={item.relationship === 'incoming' ? palette.blue : palette.amber}
            onPress={isDisabled ? undefined : onPress}
          />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <SearchIcon size={18} color={Colors.light.placeholder} strokeWidth={2.5} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people or posts..."
          placeholderTextColor={Colors.light.placeholder}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <View style={styles.segmentWrap}>
        <SegmentedControl
          items={[
            { key: 'people', label: 'People' },
            { key: 'posts', label: 'Posts' },
          ]}
          value={mode}
          onChange={(key) => setMode(key as 'people' | 'posts')}
          activeColor={palette.orange}
        />
      </View>

      {debouncedQuery.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Find people or posts</Text>
          <Text style={styles.emptySubtitle}>Start typing to search TitanConnect.</Text>
        </View>
      ) : mode === 'people' ? (
        <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
          {peopleQuery.isLoading ? (
            <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
          ) : peopleQuery.data && peopleQuery.data.length > 0 ? (
            peopleQuery.data.map((item) => renderPersonRow(item))
          ) : (
            <Text style={styles.emptySubtitle}>No people found.</Text>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
          {postsSearchQuery.isLoading ? (
            <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <View key={post.id} style={styles.postCardWrap}>
                <HardShadow offset={5} radius={18} />
                <TouchableOpacity
                  style={styles.postCard}
                  onPress={() => router.push(`/post/${post.id}` as any)}
                  activeOpacity={0.85}
                >
                  <Avatar uri={post.userAvatar} name={post.userName} size={36} />
                  <View style={styles.postBody}>
                    <Text style={styles.postUserName}>{post.userName}</Text>
                    <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptySubtitle}>No posts found.</Text>
          )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.light.card,
    borderWidth: 2.5,
    borderColor: INK,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  segmentWrap: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  results: {
    padding: 16,
    gap: 10,
  },
  loader: {
    marginTop: 20,
  },
  postCardWrap: {
    position: 'relative',
  },
  postCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.card,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 16,
    padding: 12,
  },
  postBody: {
    flex: 1,
    gap: 2,
  },
  postUserName: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: INK,
  },
  postContent: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
});
