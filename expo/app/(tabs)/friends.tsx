import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, UserPlus, Check, X } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

type Suggestion = {
  id: string;
  name: string;
  avatar?: string;
  major?: string;
  year?: string;
  relationship: 'none' | 'pending' | 'incoming' | 'accepted' | 'blocked';
  connectionId: string | null;
};

export default function FriendsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [profileModalId, setProfileModalId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const connectionsQuery = trpc.connections.list.useQuery();

  const searchQuery = trpc.profiles.search.useQuery(
    { query: debouncedQuery, limit: 8 },
    { enabled: debouncedQuery.length > 0 }
  );

  const upsertConversation = trpc.messages.upsertConversation.useMutation({
    onSuccess: (conv) => {
      setProfileModalId(null);
      router.push(`/chat/${conv.id}` as any);
    },
  });

  const sendRequest = trpc.connections.sendRequest.useMutation({
    onSuccess: () => {
      connectionsQuery.refetch();
      searchQuery.refetch();
    },
  });

  const respond = trpc.connections.respond.useMutation({
    onSuccess: () => {
      connectionsQuery.refetch();
      searchQuery.refetch();
    },
  });

  const removeConnection = trpc.connections.remove.useMutation({
    onSuccess: () => {
      connectionsQuery.refetch();
      searchQuery.refetch();
    },
  });

  const profileQuery = trpc.profiles.getById.useQuery(
    { userId: profileModalId || '' },
    { enabled: !!profileModalId }
  );

  const closeProfileModal = () => setProfileModalId(null);

  const friendButtonLabel = useMemo(() => {
    if (!profileQuery.data) return 'Add Friend';
    switch (profileQuery.data.relationship) {
      case 'accepted':
        return 'Friends';
      case 'pending':
        return 'Cancel Request';
      case 'incoming':
        return 'Accept Request';
      case 'blocked':
        return 'Blocked';
      default:
        return 'Add Friend';
    }
  }, [profileQuery.data]);

  const friendButtonDisabled = useMemo(() => {
    if (!profileQuery.data) return false;
    return profileQuery.data.relationship === 'accepted' || profileQuery.data.relationship === 'blocked';
  }, [profileQuery.data]);

  const friends = useMemo(
    () => (connectionsQuery.data || []).filter((c) => c.status === 'accepted'),
    [connectionsQuery.data]
  );

  const incoming = useMemo(
    () => (connectionsQuery.data || []).filter((c) => c.status === 'pending' && c.direction === 'incoming'),
    [connectionsQuery.data]
  );

  const outgoing = useMemo(
    () => (connectionsQuery.data || []).filter((c) => c.status === 'pending' && c.direction === 'outgoing'),
    [connectionsQuery.data]
  );

  const renderSuggestion = ({ item }: { item: Suggestion }) => {
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
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardLeft}
          onPress={() => setProfileModalId(item.id)}
          disabled={!item.id}
        >
          <Image
            source={{ uri: item.avatar || 'https://i.pravatar.cc/150?img=0' }}
            style={styles.avatar}
          />
          <View style={styles.cardText}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {[item.major, item.year].filter(Boolean).join(' • ') || 'Student'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.chipButton,
            item.relationship === 'incoming' && styles.chipPrimary,
            isDisabled && styles.chipDisabled,
          ]}
          onPress={onPress}
          disabled={isDisabled}
        >
          {item.relationship === 'incoming' ? (
            <Check size={16} color="#fff" />
          ) : (
            <UserPlus size={16} color={isDisabled ? Colors.light.textSecondary : Colors.light.primary} />
          )}
          <Text
            style={[
              styles.chipText,
              item.relationship === 'incoming' && styles.chipTextPrimary,
              isDisabled && styles.chipTextDisabled,
            ]}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Users size={24} color={Colors.light.primary} />
        <Text style={styles.headerTitle}>Friends</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          placeholder="Search people..."
          placeholderTextColor={Colors.light.placeholder}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {debouncedQuery.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggestions</Text>
          {searchQuery.isLoading ? (
            <ActivityIndicator color={Colors.light.primary} />
          ) : searchQuery.data && searchQuery.data.length > 0 ? (
            <FlatList
              data={searchQuery.data}
              renderItem={renderSuggestion}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <Text style={styles.emptyText}>No matches yet. Keep typing.</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friend Requests</Text>
        {connectionsQuery.isLoading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : incoming.length === 0 ? (
          <Text style={styles.emptyText}>No incoming requests.</Text>
        ) : (
          incoming.map((req) => (
            <View key={req.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardLeft}
                onPress={() => req.otherUser?.id && setProfileModalId(req.otherUser.id)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: req.otherUser?.avatar || 'https://i.pravatar.cc/150?img=0' }}
                  style={styles.avatar}
                />
                <View style={styles.cardText}>
                  <Text style={styles.name}>{req.otherUser?.name || 'Student'}</Text>
                  <Text style={styles.meta}>Incoming request</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.inlineButtons}>
                <TouchableOpacity
                  style={[styles.chipButton, styles.chipPrimary]}
                  onPress={() => respond.mutate({ connectionId: req.id, action: 'accept' })}
                >
                  <Check size={16} color="#fff" />
                  <Text style={[styles.chipText, styles.chipTextPrimary]}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chipButton, styles.chipDanger]}
                  onPress={() => respond.mutate({ connectionId: req.id, action: 'decline' })}
                >
                  <X size={16} color="#fff" />
                  <Text style={[styles.chipText, styles.chipTextPrimary]}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friends</Text>
        {connectionsQuery.isLoading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : friends.length === 0 ? (
          <Text style={styles.emptyText}>No friends yet. Search to add some!</Text>
        ) : (
          friends.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={styles.card}
              onPress={() => f.otherUser?.id && setProfileModalId(f.otherUser.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <Image
                  source={{ uri: f.otherUser?.avatar || 'https://i.pravatar.cc/150?img=0' }}
                  style={styles.avatar}
                />
                <View style={styles.cardText}>
                  <Text style={styles.name}>{f.otherUser?.name || 'Student'}</Text>
                  <Text style={styles.meta}>Friends</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Requests Sent</Text>
        {connectionsQuery.isLoading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : outgoing.length === 0 ? (
          <Text style={styles.emptyText}>No pending requests.</Text>
        ) : (
          outgoing.map((req) => (
            <TouchableOpacity
              key={req.id}
              style={styles.card}
              onPress={() => req.otherUser?.id && setProfileModalId(req.otherUser.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <Image
                  source={{ uri: req.otherUser?.avatar || 'https://i.pravatar.cc/150?img=0' }}
                  style={styles.avatar}
                />
                <View style={styles.cardText}>
                  <Text style={styles.name}>{req.otherUser?.name || 'Student'}</Text>
                  <Text style={styles.meta}>Request sent</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.chipButton, styles.chipDanger]}
                onPress={() => req.otherUser?.id && removeConnection.mutate({ targetUserId: req.otherUser.id })}
              >
                <X size={16} color="#fff" />
                <Text style={[styles.chipText, styles.chipTextPrimary]}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>

      <Modal visible={!!profileModalId} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.profileModalContainer}>
          <View style={styles.profileModalHeader}>
            <TouchableOpacity onPress={closeProfileModal}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          {profileQuery.isLoading || !profileQuery.data ? (
            <View style={styles.profileModalLoading}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.profileModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.profileHeader}>
                <Image
                  source={{ uri: profileQuery.data.avatar || 'https://i.pravatar.cc/150?img=0' }}
                  style={styles.profileAvatar}
                />
                <Text style={styles.profileName}>{profileQuery.data.name}</Text>
                {profileQuery.data.major ? <Text style={styles.profileMajor}>{profileQuery.data.major}</Text> : null}
                {profileQuery.data.year ? (
                  <View style={styles.profilePill}>
                    <Text style={styles.profilePillText}>{profileQuery.data.year}</Text>
                  </View>
                ) : null}
                <View style={styles.profileActions}>
                  <TouchableOpacity
                    style={[
                      styles.profileButton,
                      friendButtonDisabled ? styles.profileButtonDisabled : styles.profilePrimary,
                    ]}
                    disabled={friendButtonDisabled || sendRequest.isPending || respond.isPending}
                    onPress={() => {
                      if (!profileQuery.data) return;
                      if (profileQuery.data.relationship === 'incoming' && profileQuery.data.connectionId) {
                        respond.mutate({ connectionId: profileQuery.data.connectionId, action: 'accept' });
                        return;
                      }
                      if (profileQuery.data.relationship === 'none' && profileQuery.data.id !== currentUser?.id) {
                        sendRequest.mutate({ targetUserId: profileQuery.data.id });
                      }
                    }}
                  >
                    <Text style={styles.profileButtonText}>{friendButtonLabel}</Text>
                  </TouchableOpacity>
                  {profileQuery.data.relationship === 'pending' && (
                    <TouchableOpacity
                      style={[styles.profileButton, styles.profileSecondary]}
                      onPress={() =>
                        profileQuery.data?.id && removeConnection.mutate({ targetUserId: profileQuery.data.id })
                      }
                      disabled={removeConnection.isPending}
                    >
                      <Text style={[styles.profileButtonText, styles.profileSecondaryText]}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.profileButton, styles.profileSecondary]}
                    onPress={() => profileQuery.data && upsertConversation.mutate({ otherUserId: profileQuery.data.id })}
                  >
                    <Text style={[styles.profileButtonText, styles.profileSecondaryText]}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {profileQuery.data.bio ? (
                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>About</Text>
                  <Text style={styles.profileBody}>{profileQuery.data.bio}</Text>
                </View>
              ) : null}

              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Details</Text>
                {profileQuery.data.major ? <Text style={styles.profileDetail}>Major: {profileQuery.data.major}</Text> : null}
                {profileQuery.data.year ? <Text style={styles.profileDetail}>Year: {profileQuery.data.year}</Text> : null}
                {profileQuery.data.createdAt ? (
                  <Text style={styles.profileDetail}>
                    Joined: {new Date(profileQuery.data.createdAt).toLocaleDateString()}
                  </Text>
                ) : null}
              </View>

              {profileQuery.data.interests?.length ? (
                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>Interests</Text>
                  <View style={styles.profileChips}>
                    {profileQuery.data.interests.map((interest: string) => (
                      <View key={interest} style={styles.profileChip}>
                        <Text style={styles.profileChipText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.feedBackground,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  searchBox: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    fontSize: 16,
    color: Colors.light.text,
  },
  section: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  meta: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  chipPrimary: {
    backgroundColor: Colors.light.primary,
  },
  chipDanger: {
    backgroundColor: Colors.light.error,
  },
  chipDisabled: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  chipTextPrimary: {
    color: '#fff',
  },
  chipTextDisabled: {
    color: Colors.light.textSecondary,
  },
  separator: {
    height: 12,
  },
  inlineButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileSecondary: {
    backgroundColor: Colors.light.border,
  },
  profileSecondaryText: {
    color: Colors.light.text,
  },
  profileDetail: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
  },
  reportButton: {
    backgroundColor: Colors.light.error,
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 18,
  },
  reportText: {
    color: '#fff',
  },
  profileModalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  profileModalHeader: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalCloseText: {
    color: Colors.light.primary,
    fontWeight: '700' as const,
    fontSize: 16,
  },
  profileModalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileModalContent: {
    padding: 20,
    gap: 16,
  },
  profileHeader: {
    alignItems: 'center',
    gap: 8,
  },
  profileAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  profileMajor: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  profilePill: {
    marginTop: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  profilePillText: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  profileButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  profilePrimary: {
    backgroundColor: Colors.light.primary,
  },
  profileButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  profileSection: {
    gap: 8,
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  profileBody: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  profileChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileChip: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  profileChipText: {
    color: '#fff',
    fontWeight: '600' as const,
  },
});

