import { useRouter, useNavigation } from 'expo-router';
import { LogOut, Mail, GraduationCap, Award, Heart, Edit2, Image as ImageIcon, Save } from 'lucide-react-native';
import { useLayoutEffect, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { uploadImage } from '@/lib/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { currentUser, signOut, updateUser } = useAuth();
  const { connections } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [major, setMajor] = useState(currentUser?.major || '');
  const [year, setYear] = useState(currentUser?.year || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [interests, setInterests] = useState((currentUser?.interests || []).join(', '));
  const [avatarUri, setAvatarUri] = useState<string | undefined>(currentUser?.avatar);

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name || '');
    setMajor(currentUser.major || '');
    setYear(currentUser.year || '');
    setBio(currentUser.bio || '');
    setInterests((currentUser.interests || []).join(', '));
    setAvatarUri(currentUser.avatar);
  }, [currentUser, isEditing]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (signingOut) return;
          setSigningOut(true);
          try {
            await signOut();
          } catch (err) {
            console.error('Sign out error', err);
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }, [signOut, signingOut]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Edit2 size={18} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
            <LogOut size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, handleSignOut]);

  if (!currentUser) {
    return null;
  }

  const userPosts = [];
  const userConnections = connections.filter((c: any) => c.status === 'accepted');
  const totalLikes = 0;

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.Images],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const saveProfile = useCallback(async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      let uploadedAvatar: string | undefined = avatarUri;
      if (avatarUri && avatarUri !== currentUser.avatar) {
        const uploaded = await uploadImage('avatars', avatarUri);
        if (uploaded) {
          uploadedAvatar = uploaded;
        }
      }

      await updateUser({
        name: name.trim(),
        major: major.trim(),
        year: year.trim(),
        bio: bio.trim(),
        interests: interests
          .split(',')
          .map((i) => i.trim())
          .filter(Boolean),
        avatar: uploadedAvatar,
      });
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [avatarUri, bio, currentUser, interests, major, name, updateUser, year]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={{ uri: currentUser.avatar || 'https://i.pravatar.cc/150?img=0' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.major}>{currentUser.major}</Text>
          <View style={styles.yearBadge}>
            <Text style={styles.yearText}>{currentUser.year}</Text>
          </View>
        </View>

        {currentUser.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bio}>{currentUser.bio}</Text>
          </View>
        )}

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

      <Modal visible={isEditing} animationType="slide">
        <KeyboardAvoidingView
          style={styles.editContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={saveProfile} disabled={saving} style={styles.saveButton}>
              <Save size={18} color={saving ? Colors.light.placeholder : Colors.light.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.editContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.editAvatarWrap} onPress={pickAvatar}>
              <Image
                source={{ uri: avatarUri || 'https://i.pravatar.cc/150?img=0' }}
                style={styles.editAvatar}
              />
              <View style={styles.editAvatarOverlay}>
                <ImageIcon size={18} color="#fff" />
                <Text style={styles.editAvatarText}>Change photo</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.editInput}
                placeholder="Your name"
                placeholderTextColor={Colors.light.placeholder}
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Major</Text>
              <TextInput
                value={major}
                onChangeText={setMajor}
                style={styles.editInput}
                placeholder="Major"
                placeholderTextColor={Colors.light.placeholder}
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Year</Text>
              <TextInput
                value={year}
                onChangeText={setYear}
                style={styles.editInput}
                placeholder="Year"
                placeholderTextColor={Colors.light.placeholder}
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                style={[styles.editInput, styles.editTextarea]}
                placeholder="Tell us about yourself"
                placeholderTextColor={Colors.light.placeholder}
                multiline
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Interests (comma separated)</Text>
              <TextInput
                value={interests}
                onChangeText={setInterests}
                style={styles.editInput}
                placeholder="e.g. AI, Web Dev, Gaming"
                placeholderTextColor={Colors.light.placeholder}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  editButton: {
    paddingHorizontal: 8,
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
  major: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 8,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  bio: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    textAlign: 'center',
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
  editContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  cancelText: {
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  saveButton: {
    padding: 6,
  },
  editContent: {
    padding: 20,
    gap: 16,
  },
  editAvatarWrap: {
    alignSelf: 'center',
    position: 'relative',
  },
  editAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editAvatarText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 12,
  },
  editField: {
    gap: 6,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  editInput: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.light.text,
  },
  editTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
