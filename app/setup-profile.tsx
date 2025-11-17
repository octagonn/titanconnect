import { useRouter, useLocalSearchParams } from 'expo-router';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User as UserIcon, GraduationCap, Calendar, Heart, FileText, Check, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const MAJORS = [
  'Computer Science',
  'Business Administration',
  'Psychology',
  'Biology',
  'Mechanical Engineering',
  'Communications',
  'Nursing',
  'Graphic Design',
  'Other',
];

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];

const INTERESTS = [
  'Gaming',
  'Sports',
  'Music',
  'Art',
  'Coding',
  'Reading',
  'Fitness',
  'Photography',
  'Travel',
  'Food',
];

export default function SetupProfileScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { updateUser } = useAuth();

  const [name, setName] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [bio, setBio] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleComplete = async () => {
    if (!name || !major || !year) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await updateUser({
        name,
        major,
        year,
        interests: selectedInterests,
        bio,
        isProfileComplete: true,
      });
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to create profile. Please try again.');
    }
  };

  const isValid = name && major && year;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.headerIconContainer}>
              <Sparkles size={32} color={Colors.light.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.round((1 + (major ? 1 : 0) + (year ? 1 : 0)) / 3 * 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round((1 + (major ? 1 : 0) + (year ? 1 : 0)) / 3 * 100)}% complete</Text>
            </View>
          </Animated.View>

          <View style={styles.form}>
            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <UserIcon size={18} color={Colors.light.primary} />
                <Text style={styles.label}>
                  Full Name <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.light.placeholder}
                  value={name}
                  onChangeText={setName}
                  testID="name-input"
                />
                {name && <Check size={20} color={Colors.light.success} />}
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <GraduationCap size={18} color={Colors.light.primary} />
                <Text style={styles.label}>
                  Major <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScrollContainer}
              >
                {MAJORS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, major === m && styles.chipSelected]}
                    onPress={() => setMajor(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, major === m && styles.chipTextSelected]}>
                      {m}
                    </Text>
                    {major === m && <Check size={16} color="#ffffff" style={styles.chipIcon} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <Calendar size={18} color={Colors.light.primary} />
                <Text style={styles.label}>
                  Year <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScrollContainer}
              >
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.chip, year === y && styles.chipSelected]}
                    onPress={() => setYear(y)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, year === y && styles.chipTextSelected]}>
                      {y}
                    </Text>
                    {year === y && <Check size={16} color="#ffffff" style={styles.chipIcon} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <View style={styles.labelContainer}>
                <Heart size={18} color={Colors.light.primary} />
                <Text style={styles.label}>Interests (Optional)</Text>
              </View>
              <View style={styles.chipContainer}>
                {INTERESTS.map((interest) => (
                  <TouchableOpacity
                    key={interest}
                    style={[
                      styles.chip,
                      selectedInterests.includes(interest) && styles.chipSelected,
                    ]}
                    onPress={() => toggleInterest(interest)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedInterests.includes(interest) && styles.chipTextSelected,
                      ]}
                    >
                      {interest}
                    </Text>
                    {selectedInterests.includes(interest) && <Check size={16} color="#ffffff" style={styles.chipIcon} />}
                  </TouchableOpacity>
                ))}
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
                  placeholder="Tell others about yourself..."
                  placeholderTextColor={Colors.light.placeholder}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  testID="bio-input"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, !isValid && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={!isValid}
              testID="complete-button"
              activeOpacity={0.8}
            >
              <Sparkles size={20} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Complete Setup</Text>
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
    paddingVertical: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
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
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.light.textSecondary,
    marginBottom: 20,
    fontWeight: '500' as const,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
  },
  form: {
    gap: 28,
  },
  field: {
    gap: 12,
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
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.light.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  chipScrollContainer: {
    flexDirection: 'row',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.light.border,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '600' as const,
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  chipIcon: {
    marginLeft: 2,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
