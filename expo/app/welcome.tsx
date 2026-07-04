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
import Colors, { INK, palette } from '@/constants/colors';
import { useResponsiveLayout } from '@/lib/responsive';
import { checkEmailExists } from '@/lib/supabase';
import { showAlert } from '@/lib/alert';
import HardShadow from '@/components/ui/HardShadow';

export default function WelcomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
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

  const handleContinue = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      showAlert('Email required', 'Please enter your CSUF or Fullerton email');
      return;
    }

    let role: 'student' | 'faculty' | null = null;

    if (normalizedEmail.endsWith('@csu.fullerton.edu')) {
      role = 'student';
    } else if (normalizedEmail.endsWith('@fullerton.edu')) {
      role = 'faculty';
    }

    if (!role) {
      showAlert(
        'Invalid email',
        'Please use your CSUF or Fullerton email (@csu.fullerton.edu or @fullerton.edu)'
      );
      return;
    }

    setIsChecking(true);
    // Recognized existing account -> sign-in; otherwise -> sign-up. If the
    // lookup itself fails, default to sign-up (the screen still has a manual
    // "Already have an account?" toggle as a fallback).
    const exists = await checkEmailExists(normalizedEmail).finally(() => setIsChecking(false));

    router.push({
      pathname: '/auth/email-password',
      params: { email: normalizedEmail, role, mode: exists ? 'signin' : 'signup' },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.navy, palette.blue, palette.skyBlue]}
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
                <Shield size={14} color={INK} strokeWidth={2.5} />
                <Text style={styles.badgeText}>CSUF VERIFIED ONLY</Text>
              </View>
            </Animated.View>

            <View style={styles.featuresContainer}>
              <View style={styles.featureWrap}>
                <HardShadow offset={5} radius={22} />
                <View style={styles.featureCard}>
                  <View style={[styles.featureIconContainer, { backgroundColor: palette.amber }]}>
                    <Users size={22} color={INK} strokeWidth={2.5} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Connect</Text>
                    <Text style={styles.featureDesc}>Meet fellow Titans</Text>
                  </View>
                </View>
              </View>
              <View style={styles.featureWrap}>
                <HardShadow offset={5} radius={22} />
                <View style={styles.featureCard}>
                  <View style={[styles.featureIconContainer, { backgroundColor: palette.skyBlue }]}>
                    <Calendar size={22} color={INK} strokeWidth={2.5} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Explore</Text>
                    <Text style={styles.featureDesc}>Discover campus events</Text>
                  </View>
                </View>
              </View>
              <View style={styles.featureWrap}>
                <HardShadow offset={5} radius={22} />
                <View style={styles.featureCard}>
                  <View style={[styles.featureIconContainer, { backgroundColor: palette.orange }]}>
                    <Sparkles size={22} color={INK} strokeWidth={2.5} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Engage</Text>
                    <Text style={styles.featureDesc}>Quick tap-in connections</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.formWrap}>
                <HardShadow offset={8} radius={28} />
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

                <View style={styles.buttonWrap}>
                  {!(!email || isChecking) && <HardShadow offset={5} radius={22} />}
                  <TouchableOpacity
                    style={[styles.button, (!email || isChecking) && styles.buttonDisabled]}
                    onPress={handleContinue}
                    disabled={!email || isChecking}
                    testID="continue-button"
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>{isChecking ? 'Checking…' : 'Continue'}</Text>
                    {!isChecking && (
                      <ArrowRight size={20} color="#ffffff" style={styles.buttonIcon} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.disclaimerContainer}>
                  <Heart size={14} color={Colors.light.textSecondary} />
                  <Text style={styles.disclaimer}>
                    Built for Titans, by Titans
                  </Text>
                </View>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: INK,
  },
  badgeText: {
    fontSize: 12,
    color: INK,
    fontWeight: '900' as const,
    letterSpacing: 0.4,
  },
  featuresContainer: {
    marginBottom: 12,
    gap: 12,
  },
  featureWrap: {
    position: 'relative',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: INK,
    padding: 12,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    color: INK,
    fontWeight: '900' as const,
    marginBottom: 0,
  },
  featureDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
  },
  form: {
    marginTop: 12,
  },
  formWrap: {
    position: 'relative',
  },
  formCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: INK,
    padding: 22,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 1,
  },
  formSubtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: INK,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  buttonWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  button: {
    backgroundColor: palette.orange,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: INK,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#D8D3E0',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900' as const,
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
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
});
