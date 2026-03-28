import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, Building2, FileText, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsiveLayout } from '@/lib/responsive';

export default function SetupFacultyScreen() {
  const router = useRouter();
  const { currentUser, updateUser } = useAuth();
  const { isSmallHeight, insets } = useResponsiveLayout();

  const [name, setName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [office, setOffice] = useState<string>('');
  const [bio, setBio] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'student') {
      // Students should use the student onboarding flow instead
      router.replace('/setup-profile');
    }
  }, [currentUser, router]);

  const handleComplete = async () => {
    if (!name || !department) {
      alert('Please fill in your name and department.');
      return;
    }

    try {
      await updateUser({
        name,
        major: department,
        year: title,
        bio,
        isProfileComplete: true,
        role: 'faculty',
      });

      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error updating faculty profile:', error);
      alert('Failed to save your faculty profile. Please try again.');
    }
  };

  const isValid = !!name && !!department;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isSmallHeight && styles.scrollContentSmall,
            { paddingBottom: (isSmallHeight ? 24 : 40) + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <Sparkles size={32} color={Colors.light.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Faculty Profile</Text>
            <Text style={styles.subtitle}>
              Share a few details so students know how to reach you.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <Briefcase size={18} color={Colors.light.primary} />
                <Text style={styles.label}>
                  Full Name <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Dr. Jane Smith"
                  placeholderTextColor={Colors.light.placeholder}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <Building2 size={18} color={Colors.light.primary} />
                <Text style={styles.label}>
                  Department <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Computer Science"
                  placeholderTextColor={Colors.light.placeholder}
                  value={department}
                  onChangeText={setDepartment}
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <Briefcase size={18} color={Colors.light.primary} />
                <Text style={styles.label}>Title (Optional)</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Associate Professor"
                  placeholderTextColor={Colors.light.placeholder}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <Building2 size={18} color={Colors.light.primary} />
                <Text style={styles.label}>Office Location (Optional)</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="CS-401"
                  placeholderTextColor={Colors.light.placeholder}
                  value={office}
                  onChangeText={setOffice}
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <FileText size={18} color={Colors.light.primary} />
                <Text style={styles.label}>Bio (Optional)</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell students a bit about your background, interests, or office hours."
                  placeholderTextColor={Colors.light.placeholder}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, !isValid && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={!isValid}
              activeOpacity={0.85}
            >
              <Sparkles size={20} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Complete Faculty Setup</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  scrollContentSmall: {
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.qrBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.light.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  form: {
    gap: 24,
  },
  field: {
    gap: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  required: {
    color: Colors.light.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.light.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: Colors.light.border,
    shadowOpacity: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
});



