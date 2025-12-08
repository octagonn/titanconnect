// app/(tabs)/profile.tsx
import { useRouter, useNavigation } from 'expo-router';
import { LogOut, Mail, GraduationCap, Award, Heart, Edit2, Image as ImageIcon, Save, Pencil, University, Check, User } from 'lucide-react-native';
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
  ActionSheetIOS,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/storage';
import styles from '../../styles/profile.styles';
import { INTERESTS } from '@/constants/interests';

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { currentUser, signOut, updateUser } = useAuth();
  const { connections } = useApp();
  
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

  // Bio states (from incoming branch)
  const [isAddingBio, setIsAddingBio] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  
  // Avatar states (from incoming branch)
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name || '');
    setMajor(currentUser.major || '');
    setYear(currentUser.year || '');
    setBio(currentUser.bio || '');
    setSelectedInterests(currentUser.interests || []);
    setAvatarUri(currentUser.avatar);
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
        setNewBio('');
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
        setNewBio('');
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

  if (typeof global.Buffer === "undefined") {
    global.Buffer = Buffer;
  }

  const uploadProfilePicture = async (uri: string, userId: string) => {
    try {
      console.log("STEP 1: Upload started. URI =", uri);

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      const fileBytes = Buffer.from(base64, "base64");

      const filePath = `${userId}.jpg`; // ALWAYS same name for each corresponding user

      console.log("STEP 2: Checking if file exists…");

      // List objects in the bucket root
      const { data: existingFiles } = await supabase.storage
        .from("avatars")
        .list("", { search: filePath });

      const fileExists = existingFiles?.some((f) => f.name === filePath);

      let result, error;

      if (fileExists) {
        console.log("STEP 3: File exists → using update()");
        ({ data: result, error } = await supabase.storage
          .from("avatars")
          .update(filePath, fileBytes, {
            contentType: "image/jpeg",
          }));
      } else {
        console.log("STEP 3: File does not exist → using upload()");
        ({ data: result, error } = await supabase.storage
          .from("avatars")
          .upload(filePath, fileBytes, {
            contentType: "image/jpeg",
          }));
      }

      console.log("STEP 4: Upload/update response:", { result, error });

      if (error) {
        Alert.alert(
          "Upload Failed",
          `Message: ${error.message}\nRaw:\n${JSON.stringify(error, null, 2)}`
        );
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add a version query param when uploading avatar_urls so CDN treats it as a different file (To avoid stale/caching issues)
      const freshUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      console.log("STEP 5: Fresh Public URL:", freshUrl);
      return freshUrl;


    } catch (err: any) {
      console.log("UNEXPECTED ERROR:", err);
      Alert.alert("Unexpected Error", err.message || err.toString());
      return null;
    }
  };


  const handleProfilePicAction = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Unsupported Platform", "This feature is only available on iOS.");
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Take Photo", "Upload Photo"],
        cancelButtonIndex: 0,
      },
      async (buttonIndex) => {

        if (!currentUser) return;

        let result = null;

        try {
          // --- TAKE PHOTO ---
          if (buttonIndex === 1) {
            const { granted } = await ImagePicker.requestCameraPermissionsAsync();
            if (!granted)
              return Alert.alert("Permission Required", "Camera access is needed.");

            result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });
          }

          // --- UPLOAD PHOTO ---
          if (buttonIndex === 2) {
            const { granted } =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted)
              return Alert.alert(
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
            return Alert.alert(
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

          Alert.alert("Success", "Profile picture updated successfully!");
        } catch (err: any) {
          setIsUploading(false);
          console.log("PROFILE PIC ERROR:", err);
          Alert.alert("Unexpected Error", err.message || err.toString());
        }
      }
    );
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
      });
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [avatarUri, bio, currentUser, selectedInterests, major, name, updateUser, year]);

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* -----------------------------Header Section-------------------------------------- */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image
                key={avatarUrl} //This forces re-render when URL changes for profile pic update
                source={{ uri: avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={60} color={Colors.light.textSecondary} />
              </View>
            )}

            {/* Edit avatar_url iconbutton */}
            <TouchableOpacity style={styles.editProfileIconButton} onPress={handleProfilePicAction}>
              <Pencil size={20} color="#ffffff" />
            </TouchableOpacity>

          </View>
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

        {/* Interests (Not gonna show anything unless interests exist) */}
        {currentUser.interests && currentUser.interests.length > 0 && (
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

        {/* Academic info section   */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color={Colors.light.primary} />
            <Text style={styles.sectionTitle}>Academic Info</Text>
          </View>

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
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.editAvatar}
                />
              ) : (
                <View style={styles.editAvatarPlaceholder}>
                  <User size={50} color={Colors.light.textSecondary} />
                </View>
              )}
              <View style={styles.editAvatarOverlay}>
                <ImageIcon size={18} color="#fff" />
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
