import { useRouter, useNavigation } from 'expo-router';
import { LogOut, Mail, GraduationCap, Award, Heart } from 'lucide-react-native';
import { useLayoutEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, TextInput, Button } from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { currentUser, signOut } = useAuth();
  const { posts, connections } = useApp();

  const [isAddingBio, setIsAddingBio] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/welcome');
        },
      },
    ]);
  }, [signOut, router]);

  const handleAddBio = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: newBio })
        .eq('id', currentUser.id);

      if (error) {
        Alert.alert('Error', 'Failed to add bio. Please try again.');
      } else {
        Alert.alert('Success', 'Bio added successfully!');
        currentUser.bio = newBio; // Update the local user object
        setIsAddingBio(false);
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleEditBio = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: newBio })
        .eq('id', currentUser.id);

      if (error) {
        Alert.alert('Error', 'Failed to update bio. Please try again.');
      } else {
        Alert.alert('Success', 'Bio updated successfully!');
        currentUser.bio = newBio; // Update the local user object
        setIsEditingBio(false);
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleBioChange = (text: string) => {
    if (text.length <= 150) {
      setNewBio(text);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <LogOut size={20} color="#ffffff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSignOut]);

  if (!currentUser) {
    return null;
  }

  const userPosts = posts.filter((p) => p.userId === currentUser.id);
  const userConnections = connections.filter(
    (c) => c.userId === currentUser.id || c.connectedUserId === currentUser.id
  );

  const totalLikes = userPosts.reduce((sum, post) => sum + post.likes, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={{ uri: currentUser.avatar || 'https://i.pravatar.cc/150?img=0' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{currentUser.name}</Text>
          <View style={styles.majorAndYearContainer}>
            <Text style={styles.major}>{currentUser.major}</Text>
            <View style={styles.yearBadge}>
              <Text style={styles.yearText}>{currentUser.year}</Text>
            </View>
          </View>

          {!currentUser.bio && !isAddingBio && (
            <View style={styles.addBioBadge}>
              <Text style={styles.addBioText} onPress={() => setIsAddingBio(true)}>
                Add Bio
              </Text>
            </View>
          )}

          {isAddingBio && (
            <View style={[styles.addBioSection, { backgroundColor: 'transparent', borderWidth: 0 }]}>
              <TextInput
                style={styles.bioInput}
                placeholder="Write your bio here..."
                value={newBio}
                onChangeText={handleBioChange}
                multiline
              />
              <Text style={styles.charCount}>{150 - newBio.length} characters left</Text>
              <View style={styles.saveBioBadge}>
                <Text style={styles.saveBioText} onPress={handleAddBio}>
                  Save Bio
                </Text>
              </View>
            </View>
          )}

          {currentUser.bio && !isEditingBio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioText}>"{currentUser.bio}"</Text>
              <View style={styles.editBioBadge}>
                <Text style={styles.editBioText} onPress={() => setIsEditingBio(true)}>
                  Edit Bio
                </Text>
              </View>
            </View>
          )}

          {isEditingBio && (
            <View style={[styles.addBioSection, { backgroundColor: 'transparent', borderWidth: 0 }]}>
              <TextInput
                style={[styles.bioInput, { backgroundColor: 'transparent' }]}
                placeholder="Edit your bio here..."
                value={newBio}
                onChangeText={handleBioChange}
                multiline
              />
              <Text style={styles.charCount}>{150 - newBio.length} characters left</Text>
              <View style={styles.saveBioBadge}>
                <Text style={styles.saveBioText} onPress={handleEditBio}>
                  Save Bio
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userPosts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userConnections.length}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalLikes}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>

        {currentUser.interests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Heart size={20} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>Interests</Text>
            </View>
            <View style={styles.interestsContainer}>
              {currentUser.interests.map((interest) => (
                <View key={interest} style={styles.interestChip}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color={Colors.light.primary} />
            <Text style={styles.sectionTitle}>Academic Info</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <GraduationCap size={20} color={Colors.light.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Major</Text>
                <Text style={styles.infoValue}>{currentUser.major}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Mail size={20} color={Colors.light.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{currentUser.email}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.joinedSection}>
          <Text style={styles.joinedText}>
            Joined {currentUser.createdAt ? formatJoinDate(currentUser.createdAt) : 'Unknown'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  logoutButton: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: Colors.light.qrBackground,
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
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  majorAndYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  major: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  yearBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  yearText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bioSection: {
    alignItems: 'center',
    marginTop: 16, // Ensure consistent spacing
    marginBottom: 8, // Added to balance spacing
  },
  bioText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  addBioSection: {
    padding: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    marginVertical: 8, // Reduced to maintain consistent spacing
  },
  bioInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.light.text,
    marginBottom: 12,
  },
  charCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  infoCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.qrBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500' as const,
  },
  joinedSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  joinedText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  editBioBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'center',
  },
  editBioText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  saveBioBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'center',
  },
  saveBioText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  addBioBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'center',
  },
  addBioText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
});
