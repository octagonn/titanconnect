// app/(tabs)/profile.tsx
import { useRouter, useNavigation } from 'expo-router';
import { LogOut, Mail, GraduationCap, Award, Heart, Edit2, Image as ImageIcon, Save, Pencil, University, Check, FileText, Users, Star } from 'lucide-react-native';
import { useLayoutEffect, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, ActionSheetIOS, ActivityIndicator } from 'react-native';
import { showAlert } from '@/lib/alert';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import Colors, { INK, palette } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/storage';
import { uploadProfilePicture } from '@/lib/uploadProfilePicture';
import styles from '../../styles/profile.styles';
import { INTERESTS } from '@/constants/interests';
import Avatar from '@/components/ui/Avatar';
import Chip from '@/components/ui/Chip';
import StatTile from '@/components/ui/StatTile';
import HardShadow from '@/components/ui/HardShadow';
import ListRow from '@/components/ui/ListRow';

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { currentUser, signOut, updateUser } = useAuth();
  const { connections } = useApp();
  const postsQuery = trpc.posts.getInfinite.useQuery(
    { limit: 100, userId: currentUser?.id ?? '' },
    { enabled: !!currentUser }
  );
  
  // Edit modal states (from HEAD)
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [major, setMajor] = useState(currentUser?.major || '');
  const [year, setYear] = useState(currentUser?.year || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(currentUser?.interests || []);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(currentUser?.avatar);
  const [instagram, setInstagram] = useState(currentUser?.instagram || '');
  const [linkedin, setLinkedin] = useState(currentUser?.linkedin || '');
  const [linktree, setLinktree] = useState(currentUser?.linktree || '');
  const [website, setWebsite] = useState(currentUser?.website || '');

  // Bio states (from incoming branch)
  const [isAddingBio, setIsAddingBio] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  
  // Avatar states (from incoming branch)
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showFriendsModal, setShowFriendsModal] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name || '');
    setMajor(currentUser.major || '');
    setYear(currentUser.year || '');
    setBio(currentUser.bio || '');
    setSelectedInterests(currentUser.interests || []);
    setAvatarUri(currentUser.avatar);
    setInstagram(currentUser.instagram || '');
    setLinkedin(currentUser.linkedin || '');
    setLinktree(currentUser.linktree || '');
    setWebsite(currentUser.website || '');
  }, [currentUser, isEditing]);

  // Force avatar url to update after user changes it
  useEffect(() => {
    if (currentUser?.avatar) {
      setAvatarUrl(`${currentUser.avatar}?v=${Date.now()}`); // ensure cache busting
    } else {
      setAvatarUrl(undefined);
    }
  }, [currentUser?.avatar]);

  const handleSignOut = useCallback(() => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
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

  const handleAddBio = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: newBio })
        .eq('id', currentUser.id);

      if (error) {
        showAlert('Error', 'Failed to add bio. Please try again.');
      } else {
        showAlert('Success', 'Bio added successfully!');
        currentUser.bio = newBio; // Update the local user object
        setIsAddingBio(false);
        setNewBio('');
      }
    } catch (err) {
      showAlert('Error', 'An unexpected error occurred.');
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
        showAlert('Error', 'Failed to update bio. Please try again.');
      } else {
        showAlert('Success', 'Bio updated successfully!');
        currentUser.bio = newBio; // Update the local user object
        setIsEditingBio(false);
        setNewBio('');
      }
    } catch (err) {
      showAlert('Error', 'An unexpected error occurred.');
    }
  };

  const handleBioChange = (text: string) => {
    if (text.length <= 150) {
      setNewBio(text);
    }
  };

  const pickAndUploadProfilePic = async (source: 'camera' | 'library') => {
    if (!currentUser) return;

    let result = null;

    try {
      // --- TAKE PHOTO ---
      if (source === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted)
          return showAlert("Permission Required", "Camera access is needed.");

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
      }

      // --- UPLOAD PHOTO ---
      if (source === 'library') {
        const { granted } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted)
          return showAlert(
            "Permission Required",
            "Photo library access is needed."
          );

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
      }

      if (!result || result.canceled) return;

      const selectedUri = result.assets[0].uri;

      // Upload to Supabase Storage
      setIsUploading(true);

      const publicUrl = await uploadProfilePicture(selectedUri, currentUser.id);

      if (!publicUrl) {
        setIsUploading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", currentUser.id)
        .select();

      setIsUploading(false);


      console.log("⬅ UPDATE RESULT:", { data, error });

      if (error) {
        return showAlert(
          "Failed to update profile picture",
          `Database error:\n${error.message}\n\nRaw:\n${JSON.stringify(
            error,
            null,
            2
          )}`
        );
      }

      // 🔥 Instant UI update
      setAvatarUrl(publicUrl);
      currentUser.avatar = publicUrl;

      showAlert("Success", "Profile picture updated successfully!");
    } catch (err: any) {
      setIsUploading(false);
      console.log("PROFILE PIC ERROR:", err);
      showAlert("Unexpected Error", err.message || err.toString());
    }
  };

  const handleProfilePicAction = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Upload Photo"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickAndUploadProfilePic('camera');
          if (buttonIndex === 2) pickAndUploadProfilePic('library');
        }
      );
    } else if (Platform.OS === 'web') {
      // Browsers use a file picker; no camera action sheet needed
      pickAndUploadProfilePic('library');
    } else {
      showAlert("Update Profile Picture", "Choose a photo source", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: () => pickAndUploadProfilePic('camera') },
        { text: "Upload Photo", onPress: () => pickAndUploadProfilePic('library') },
      ]);
    }
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        interests: selectedInterests,
        avatar: uploadedAvatar,
        instagram: instagram.trim(),
        linkedin: linkedin.trim(),
        linktree: linktree.trim(),
        website: website.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      showAlert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [avatarUri, bio, currentUser, selectedInterests, major, name, updateUser, year, instagram, linkedin, linktree, website]);

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

  const userPosts = postsQuery.data?.items ?? [];
  const userConnections = connections.filter((c: any) => c.status === 'accepted');
  const totalLikes = userPosts.reduce((sum: number, p: any) => sum + (p.likes ?? 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* -----------------------------Header Section-------------------------------------- */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Avatar key={avatarUrl} uri={avatarUrl} name={currentUser.name} size={120} />

            {/* Edit avatar_url iconbutton */}
            <TouchableOpacity style={styles.editProfileIconButton} onPress={handleProfilePicAction}>
              <Pencil size={20} color="#ffffff" strokeWidth={2.5} />
            </TouchableOpacity>

          </View>
          <Text style={styles.name}>{currentUser.name}</Text>
          <View style={styles.majorAndYearContainer}>
            <Text style={styles.major}>{currentUser.major}</Text>
            <Chip label={currentUser.year || ''} variant="solid" color={palette.orange} />
          </View>
          <View style={styles.pointsBadge}>
            <Star size={13} color={INK} strokeWidth={2.5} fill={INK} />
            <Text style={styles.pointsBadgeText}>{currentUser.points ?? 0} points</Text>
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
              <Text style={styles.bioText}>{currentUser.bio}</Text>
              <View style={styles.editBioBadge}>
                <Text style={styles.editBioText} onPress={() => {
                  setIsEditingBio(true);
                  setNewBio(currentUser.bio || '');
                }}>
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

        {/* -----------------------------Lower Section (not actually grouped in a singular <View> like the header section BTW)-------------------------------------- */}

        {/* Stats Section (Posts, Connections, Likes) */}
        <View style={styles.statsContainer}>
          <StatTile icon={FileText} value={String(userPosts.length)} label="POSTS" color={palette.amber} />
          <StatTile
            icon={Users}
            value={String(userConnections.length)}
            label="CONNECTIONS"
            color={palette.skyBlue}
            onPress={() => setShowFriendsModal(true)}
          />
          <StatTile icon={Heart} value={String(totalLikes)} label="LIKES" color={palette.orange} />
        </View>

        {/* Interests (Not gonna show anything unless interests exist) */}
        {currentUser.interests && currentUser.interests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWell}>
                <Heart size={16} color={INK} strokeWidth={2.5} />
              </View>
              <Text style={styles.sectionTitle}>Interests</Text>
            </View>
            <View style={styles.interestsContainer}>
              {currentUser.interests.map((interest) => (
                <Chip key={interest} label={interest} variant="outline" />
              ))}
            </View>
          </View>
        )}

        {/* Academic info section   */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWell}>
              <Award size={16} color={INK} strokeWidth={2.5} />
            </View>
            <Text style={styles.sectionTitle}>Academic Info</Text>
          </View>

          <View style={styles.infoCardWrap}>
          <HardShadow offset={6} radius={20} />
          <View style={styles.infoCard}>

            {/* Major */}
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <GraduationCap size={20} color={Colors.light.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Major</Text>
                <Text style={styles.infoValue}>{currentUser.major}</Text>
              </View>
            </View>

            {/* Year */}
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <University size={20} color={Colors.light.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Year</Text>
                <Text style={styles.infoValue}>{currentUser.year}</Text>
              </View>
            </View>

            {/* Email */}
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
        </View>

        {/* Date Joined text */}
        <View style={styles.joinedSection}>
          <Text style={styles.joinedText}>
            Joined {currentUser.createdAt ? formatJoinDate(currentUser.createdAt) : 'Unknown'}
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal (from HEAD) */}
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
              <Avatar uri={avatarUri} name={currentUser.name} size={140} />
              <View style={styles.editAvatarOverlay}>
                <ImageIcon size={18} color="#fff" strokeWidth={2.5} />
                <Text style={styles.editAvatarText}>{avatarUri ? 'Change photo' : 'Add photo'}</Text>
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
              <Text style={styles.editLabel}>Instagram</Text>
              <TextInput
                value={instagram}
                onChangeText={setInstagram}
                style={styles.editInput}
                placeholder="Instagram username"
                placeholderTextColor={Colors.light.placeholder}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>LinkedIn</Text>
              <TextInput
                value={linkedin}
                onChangeText={setLinkedin}
                style={styles.editInput}
                placeholder="LinkedIn profile URL"
                placeholderTextColor={Colors.light.placeholder}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Linktree</Text>
              <TextInput
                value={linktree}
                onChangeText={setLinktree}
                style={styles.editInput}
                placeholder="Linktree URL"
                placeholderTextColor={Colors.light.placeholder}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Website</Text>
              <TextInput
                value={website}
                onChangeText={setWebsite}
                style={styles.editInput}
                placeholder="Website URL"
                placeholderTextColor={Colors.light.placeholder}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Interests</Text>
              <ScrollView
                style={styles.interestsEditScrollView}
                contentContainerStyle={styles.interestsEditContainer}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {INTERESTS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <TouchableOpacity
                      key={interest}
                      style={[
                        styles.interestChipEdit,
                        isSelected && styles.interestChipEditSelected,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedInterests(selectedInterests.filter((i) => i !== interest));
                        } else {
                          setSelectedInterests([...selectedInterests, interest]);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.interestChipTextEdit,
                          isSelected && styles.interestChipTextEditSelected,
                        ]}
                      >
                        {interest}
                      </Text>
                      {isSelected && <Check size={14} color="#ffffff" style={styles.chipIconEdit} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Instagram-style friends list, opened from the Connections stat tile */}
      <Modal
        visible={showFriendsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <View style={styles.friendsModalContainer}>
          <View style={styles.friendsModalHeader}>
            <Text style={styles.friendsModalTitle}>Friends</Text>
            <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
              <Text style={styles.friendsModalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          {userConnections.length === 0 ? (
            <View style={styles.friendsModalEmpty}>
              <Text style={styles.friendsModalEmptyText}>No friends yet.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.friendsModalList}>
              {userConnections.map((c: any) => (
                <ListRow
                  key={c.id}
                  avatarUri={c.otherUser?.avatar}
                  avatarName={c.otherUser?.name}
                  title={c.otherUser?.name || 'Student'}
                  subtitle={[c.otherUser?.major, c.otherUser?.year].filter(Boolean).join(' • ')}
                  onPress={() => {
                    setShowFriendsModal(false);
                    router.push(`/profile/${c.otherUser?.id}` as any);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Conditional Blur for when user is uploading a new profile photo */}
      {isUploading && (
        <View style={styles.uploadOverlay} pointerEvents="auto">
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.uploadingText}>Updating profile photo…</Text>
        </View>
      )}
    </View>
  );
}

function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}
