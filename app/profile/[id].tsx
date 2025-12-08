import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { trpc } from '@/lib/trpc';

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
      Alert.alert('Message failed', err.message || 'Could not start conversation. Please try again.');
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
    Alert.alert('Remove friend?', 'This will remove the connection.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate({ targetUserId: id }) },
    ]);
  };

  const handleMessage = () => {
    if (!id) return;
    upsertConversation.mutate({ otherUserId: id });
  };

  const actionButton = useMemo(() => {
    switch (relationship) {
      case 'accepted':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleMessage}>
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleRemove}>
              <Text style={[styles.actionText, styles.secondaryText]}>Remove</Text>
            </TouchableOpacity>
          </View>
        );
      case 'incoming':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={() => handleRespond('accept')}>
              <Text style={styles.actionText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => handleRespond('decline')}>
              <Text style={[styles.actionText, styles.secondaryText]}>Decline</Text>
            </TouchableOpacity>
          </View>
        );
      case 'pending':
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} disabled>
              <Text style={[styles.actionText, styles.secondaryText]}>Request sent</Text>
            </TouchableOpacity>
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
            <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleAddFriend}>
              <Text style={styles.actionText}>Add Friend</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleMessage}>
              <Text style={[styles.actionText, styles.secondaryText]}>Message</Text>
            </TouchableOpacity>
          </View>
        );
    }
  }, [relationship]);

  if (profileQuery.isLoading || !profileQuery.data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const profile = profileQuery.data;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={{ uri: profile.avatar || 'https://i.pravatar.cc/150?img=0' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.major}>{profile.major}</Text>
        </View>

        {actionButton}

        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bodyText}>{profile.bio}</Text>
          </View>
        ) : null}

        {profile.interests?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chipContainer}>
              {profile.interests.map((interest: string) => (
                <View key={interest} style={styles.chip}>
                  <Text style={styles.chipText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
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
  },
  loadingText: {
    color: Colors.light.textSecondary,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    backgroundColor: Colors.light.qrBackground,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  name: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  major: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.light.border,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 15,
  },
  secondaryText: {
    color: Colors.light.text,
  },
  blockedText: {
    color: Colors.light.error,
    fontWeight: '700' as const,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  bodyText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  chipText: {
    color: '#fff',
    fontWeight: '600' as const,
  },
});

