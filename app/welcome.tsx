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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

export default function WelcomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

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
    if (email.toLowerCase().endsWith('@csu.fullerton.edu')) {
      router.push({
        pathname: '/verify-email',
        params: { email },
      });
    } else {
      alert('Please use your CSUF email (@csu.fullerton.edu)');
    }
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
          <Animated.View
            style={{ flex: 1 }}
          >
            <View style={styles.scrollContent}>
              <Animated.View 
                style={[
                  styles.header,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
              <View style={styles.logoContainer}>
                <Image 
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/m6lclsym72r3z5xyhxqhn' }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>TitanConnect</Text>
              <Text style={styles.subtitle}>Your campus, your community</Text>
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
                <Text style={styles.formSubtitle}>Sign in with your CSUF email</Text>
                
                <View style={styles.inputContainer}>
                  <Mail size={20} color={Colors.light.placeholder} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="yourname@csu.fullerton.edu"
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
            </View>
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  logoContainer: {
    marginBottom: -45,
    alignItems: 'center',
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#ffffff',
    marginBottom: 2,
    marginTop: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 5,
    fontWeight: '500' as const,
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
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600' as const,
  },
  featuresContainer: {
    marginBottom: 8,
    gap: 4,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700' as const,
    marginBottom: 0,
  },
  featureDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500' as const,
  },
  form: {
    marginTop: 8,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 1,
  },
  formSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.light.border,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.light.text,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    paddingVertical: 10,
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
    fontSize: 15,
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
