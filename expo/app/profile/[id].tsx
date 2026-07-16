import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { Instagram, Linkedin, Link as LinkIcon, Star } from 'lucide-react-native';
import { showAlert } from '@/lib/alert';
import Colors, { INK, palette } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { trpc } from '@/lib/trpc';
import Avatar from '@/components/ui/Avatar';
import Chip from '@/components/ui/Chip';
import HardShadow from '@/components/ui/HardShadow';
import ListRow from '@/components/ui/ListRow';

export default function OtherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { conversationsQuery } = useApp();

  useEffect(() => {
    if (currentUser && id === currentUser.id) {
      router.replace('/(tabs)/profile');
    }
  }, [currentUser, id, router]);

  const profileQuery = trpc.profiles.getById.useQuery(
    { userId: id! },
    { enabled: !!id && !!currentUser }
  );

  const connectionsQuery = trpc.profiles.getConnections.useQuery(
    { userId: id! },
    { enabled: !!id && !!currentUser }
  );

  const postsQuery = trpc.posts.getInfinite.useQuery(
    { limit: 10, userId: id! },
    { enabled: !!id && !!currentUser }
  );

  const sendRequest = trpc.connections.sendRequest.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });

  const respond = trpc.connections.respond.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });

  const remove = trpc.connections.remove.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });

  const upsertConversation = trpc.messages.upsertConversation.useMutation({
    onSuccess: (conv) => {
      conversationsQuery.refetch();
      router.push(`/chat/${conv.id}` as any);
    },
    onError: (err) => {
      showAlert('Message failed', err.message || 'Could not start conversation. Please try again.');
    },
  });

  const relationship = profileQuery.data?.relationship;

  const handleAddFriend = () => {
    if (!id) return;
    sendRequest.mutate({ targetUserId: id });
  };

  const handleRespond = (action: 'accept' | 'decline') => {
    if (!profileQuery.data?.connectionId) return;
    respond.mutate({ connectionId: profileQuery.data.connectionId, action });
  };

  const handleRemove = () => {
    if (!id) return;
    showAlert('Remove friend?', 'This will remove the connection.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate({ targetUserId: id }) },
    ]);
  };

  const handleMessage = () => {
    if (!id) return;
    upsertConversation.mutate({ otherUserId: id });
  };

  function renderActionButton() {
    switch (relationship) {
      case 'accepted':
        return (
          <View style={styles.actionRow}>
            <Chip
              label="Message"
              variant="solid"
              color={palette.blue}
              onPress={handleMessage}
              loading={upsertConversation.isPending}
            />
            <Chip label="Remove" variant="outline" onPress={handleRemove} loading={remove.isPending} />
          </View>
        );
      case 'incoming':
        return (
          <View style={styles.actionRow}>
            <Chip
              label="Accept"
              variant="solid"
              color={palette.blue}
              onPress={() => handleRespond('accept')}
              loading={respond.isPending}
            />
            <Chip
              label="Decline"
              variant="solid"
              color={palette.rust}
              onPress={() => handleRespond('decline')}
              loading={respond.isPending}
            />
          </View>
        );
      case 'pending':
        return (
          <View style={styles.actionRow}>
            <Chip label="Request sent" variant="outline" />
          </View>
        );
      case 'blocked':
        return (
          <View style={styles.actionRow}>
            <Text style={styles.blockedText}>Blocked</Text>
          </View>
        );
      default:
        return (
          <View style={styles.actionRow}>
            <Chip
              label="Add Friend"
              variant="solid"
              color={palette.orange}
              onPress={handleAddFriend}
              loading={sendRequest.isPending}
            />
            <Chip label="Message" variant="outline" onPress={handleMessage} loading={upsertConversation.isPending} />
          </View>
        );
    }
  }

  if (profileQuery.isLoading || !profileQuery.data) {
    return (
      <>
        <Stack.Screen options={{ title: '', headerTitle: () => null }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </>
    );
  }

  const profile = profileQuery.data;
  const connections = connectionsQuery.data ?? [];
  const posts = postsQuery.data?.items ?? [];

  return (
    <>
      <Stack.Screen options={{ title: '', headerTitle: () => null }} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Avatar uri={profile.avatar} name={profile.name} size={120} />
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.major}>{profile.major}</Text>
            <View style={styles.pointsBadge}>
              <Star size={13} color={INK} strokeWidth={2.5} fill={INK} />
              <Text style={styles.pointsBadgeText}>{profile.points ?? 0} points</Text>
            </View>
          </View>

          {renderActionButton()}

          {profile.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.cardWrap}>
                <HardShadow offset={6} radius={20} />
                <View style={styles.card}>
                  <Text style={styles.bodyText}>{profile.bio}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {profile.instagram || profile.linkedin || profile.linktree || profile.website ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Links</Text>
              <View style={styles.cardWrap}>
                <HardShadow offset={6} radius={20} />
                <View style={[styles.card, styles.rowList]}>
                  {profile.instagram ? (
                    <TouchableOpacity
                      style={styles.linkRow}
                      onPress={() => Linking.openURL(`https://instagram.com/${profile.instagram}`)}
                      activeOpacity={0.7}
                    >
                      <Instagram size={18} color={INK} strokeWidth={2.5} />
                      <Text style={styles.linkRowText}>@{profile.instagram}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {profile.linkedin ? (
                    <TouchableOpacity
                      style={styles.linkRow}
                      onPress={() => Linking.openURL(profile.linkedin!)}
                      activeOpacity={0.7}
                    >
                      <Linkedin size={18} color={INK} strokeWidth={2.5} />
                      <Text style={styles.linkRowText}>LinkedIn</Text>
                    </TouchableOpacity>
                  ) : null}
                  {profile.linktree ? (
                    <TouchableOpacity
                      style={styles.linkRow}
                      onPress={() => Linking.openURL(profile.linktree!)}
                      activeOpacity={0.7}
                    >
                      <LinkIcon size={18} color={INK} strokeWidth={2.5} />
                      <Text style={styles.linkRowText}>Linktree</Text>
                    </TouchableOpacity>
                  ) : null}
                  {profile.website ? (
                    <TouchableOpacity
                      style={styles.linkRow}
                      onPress={() => Linking.openURL(profile.website!)}
                      activeOpacity={0.7}
                    >
                      <LinkIcon size={18} color={INK} strokeWidth={2.5} />
                      <Text style={styles.linkRowText}>Website</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          {profile.interests?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.cardWrap}>
                <HardShadow offset={6} radius={20} />
                <View style={[styles.card, styles.chipContainer]}>
                  {profile.interests.map((interest: string) => (
                    <Chip key={interest} label={interest} variant="outline" />
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {connections.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connected with</Text>
              <View style={styles.cardWrap}>
                <HardShadow offset={6} radius={20} />
                <View style={[styles.card, styles.rowList]}>
                  {connections.map((c) => (
                    <ListRow
                      key={c.id}
                      avatarUri={c.avatar}
                      avatarName={c.name}
                      title={c.name}
                      subtitle={c.major ?? undefined}
                      onPress={() => router.push(`/profile/${c.id}` as any)}
                    />
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {posts.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Posts</Text>
              <View style={styles.cardWrap}>
                <HardShadow offset={6} radius={20} />
                <View style={[styles.card, styles.rowList]}>
                  {posts.map((post) => (
                    <ListRow
                      key={post.id}
                      title={post.title || post.content}
                      subtitle={`${post.likes} likes · ${post.comments.length} comments`}
                      onPress={() => router.push(`/post/${post.id}` as any)}
                    />
                  ))}
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    backgroundColor: palette.skyBlue,
    borderBottomWidth: 3,
    borderBottomColor: INK,
    paddingHorizontal: 16,
    gap: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginTop: 8,
  },
  major: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.amber,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
  },
  pointsBadgeText: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: INK,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  blockedText: {
    color: Colors.light.error,
    fontWeight: '900' as const,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  cardWrap: {
    position: 'relative',
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    padding: 16,
  },
  bodyText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.light.text,
    lineHeight: 22,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowList: {
    gap: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkRowText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
});
