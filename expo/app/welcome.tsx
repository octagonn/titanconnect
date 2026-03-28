import { useRouter } from 'expo-router';
import { GraduationCap, Users, Calendar, Sparkles, ArrowRight, Mail, Shield, Heart } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useResponsiveLayout } from '@/lib/responsive';

export default function WelcomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const { isSmallHeight, isLargeHeight, insets } = useResponsiveLayout();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleContinue = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      alert('Please enter your CSUF or Fullerton email');
      return;
    }

    let role: 'student' | 'faculty' | null = null;

    if (normalizedEmail.endsWith('@csu.fullerton.edu')) {
      role = 'student';
    } else if (normalizedEmail.endsWith('@fullerton.edu')) {
      role = 'faculty';
    }

    if (!role) {
      alert('Please use your CSUF or Fullerton email (@csu.fullerton.edu or @fullerton.edu)');
      return;
    }

    router.push({
      pathname: '/auth/email-password',
      params: { email: normalizedEmail, role },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#00274C', '#003d73', '#0066CC']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                isSmallHeight && styles.scrollContentSmall,
                isLargeHeight && styles.scrollContentLarge,
                { paddingBottom: (isSmallHeight ? 16 : 32) + insets.bottom },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View 
                style={[
                  styles.header,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
              <View style={[
                styles.logoContainer,
                isLargeHeight && styles.logoContainerLarge
              ]}
              >
                <Image 
                  source={require('@/assets/images/icon.png')}
                  style={[styles.logo, isLargeHeight && styles.logoLarge]}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.title, isLargeHeight && styles.titleLarge]}>TitanConnect</Text>
              <Text style={[styles.subtitle, isLargeHeight && styles.subtitleLarge]}>Your campus, your community</Text>
              <View style={styles.badge}>
                <Shield size={14} color={Colors.light.accent} />
                <Text style={styles.badgeText}>CSUF Verified Only</Text>
              </View>
            </Animated.View>

            <View style={styles.featuresContainer}>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Users size={22} color={Colors.light.accent} strokeWidth={2} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Connect</Text>
                  <Text style={styles.featureDesc}>Meet fellow Titans</Text>
                </View>
              </View>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Calendar size={22} color={Colors.light.accent} strokeWidth={2} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Explore</Text>
                  <Text style={styles.featureDesc}>Discover campus events</Text>
                </View>
              </View>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Sparkles size={22} color={Colors.light.accent} strokeWidth={2} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Engage</Text>
                  <Text style={styles.featureDesc}>Quick tap-in connections</Text>
                </View>
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Get Started</Text>
                <Text style={styles.formSubtitle}>Use your CSUF or Fullerton email</Text>
                
                <View style={styles.inputContainer}>
                  <Mail size={20} color={Colors.light.placeholder} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="yourname@csu.fullerton.edu or faculty@fullerton.edu"
                    placeholderTextColor={Colors.light.placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="email-input"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, !email && styles.buttonDisabled]}
                  onPress={handleContinue}
                  disabled={!email}
                  testID="continue-button"
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                  <ArrowRight size={20} color="#ffffff" style={styles.buttonIcon} />
                </TouchableOpacity>

                <View style={styles.disclaimerContainer}>
                  <Heart size={14} color={Colors.light.textSecondary} />
                  <Text style={styles.disclaimer}>
                    Built for Titans, by Titans
                  </Text>
                </View>
              </View>
            </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: 'flex-start',
    gap: 24,
  },
  scrollContentSmall: {
    paddingTop: 16,
  },
  scrollContentLarge: {
    paddingTop: 72,
    gap: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoContainer: {
    marginBottom: -24,
    alignItems: 'center',
  },
  logoContainerLarge: {
    marginTop: 16,
    marginBottom: 24,
  },
  logo: {
    width: 170,
    height: 170,
  },
  logoLarge: {
    width: 260,
    height: 260,
  },
  title: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: '#ffffff',
    marginBottom: 4,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  titleLarge: {
    fontSize: 44,
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 5,
    fontWeight: '500' as const,
  },
  subtitleLarge: {
    fontSize: 18,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600' as const,
  },
  featuresContainer: {
    marginBottom: 12,
    gap: 8,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '700' as const,
    marginBottom: 0,
  },
  featureDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500' as const,
  },
  form: {
    marginTop: 12,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 1,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.light.text,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: Colors.light.border,
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700' as const,
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
});
