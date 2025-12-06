// app/(tabs)/profile.tsx
import { useRouter, useNavigation } from 'expo-router';
import { LogOut, Mail, GraduationCap, Award, Heart, Pencil } from 'lucide-react-native';
import { useLayoutEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, TextInput, Button, ActionSheetIOS, Platform } from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';

import styles from '../../styles/profile.styles';


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

  const uploadProfilePicture = async (uri: string, userId: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileName = `${userId}-${uuidv4()}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, blob, {
        contentType: blob.type,
      });

      if (error) {
        Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
        return null;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred while uploading the profile picture.');
      return null;
    }
  };

  const handleProfilePicAction = async () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Upload Photo'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          let result;
          if (buttonIndex === 1) {
            // Take Photo
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (permission.granted) {
              result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
              });
            }
          } else if (buttonIndex === 2) {
            // Upload Photo
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permission.granted) {
              result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
              });
            }
          }

          if (result && !result.canceled && currentUser) {
            const publicUrl = await uploadProfilePicture(result.assets[0].uri, currentUser.id);
            if (publicUrl) {
              // Update the user's profile with the new avatar URL
              const { error } = await supabase
                .from('profiles')
                .update({ avatar: publicUrl })
                .eq('id', currentUser.id);

              if (error) {
                Alert.alert('Error', 'Failed to update profile picture. Please try again.');
              } else {
                Alert.alert('Success', 'Profile picture updated successfully!');
                currentUser.avatar = publicUrl; // Update the local user object
              }
            }
          }
        }
      );
    } else {
      Alert.alert('Unsupported Platform', 'This feature is only available on iOS.');
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
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: currentUser.avatar || 'https://i.pravatar.cc/150?img=0' }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editIconButton} onPress={handleProfilePicAction}>
              <Pencil size={20} color="#ffffff" /> {/* Updated to use the Pencil icon */}
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

