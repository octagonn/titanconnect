// app/(tabs)/profile.tsx
import { useRouter, useNavigation } from 'expo-router';
import { LogOut, Mail, GraduationCap, Award, Heart, Pencil, University } from 'lucide-react-native';
import { useLayoutEffect, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, TextInput, Button, ActionSheetIOS, Platform } from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import EncodingType from 'expo-file-system';
import styles from '../../styles/profile.styles';
import { set } from 'zod';
import { ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { currentUser, signOut } = useAuth();
  const { posts, connections } = useApp();
  // Bio states
  const [isAddingBio, setIsAddingBio] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  // avatar_url aka profile picture states
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar);
  const [isUploading, setIsUploading] = useState<boolean>(false);



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


  // Force avatar url to update after user changes it
  useEffect(() => {
    if (currentUser?.avatar) {
      setAvatarUrl(`${currentUser.avatar}?v=${Date.now()}`); // ensure cache busting
    }
  }, [currentUser?.avatar]);


  return (


    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* -----------------------------Header Section-------------------------------------- */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              key={avatarUrl} //This forces re-render when URL changes for profile pic update
              source={{ uri: avatarUrl || 'https://i.pravatar.cc/150?img=0' }}
              style={styles.avatar}
            />

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

