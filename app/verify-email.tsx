import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useResponsiveLayout } from '@/lib/responsive';
import { useAuth } from '@/contexts/AuthContext';

type Params = {
  email?: string;
  mode?: 'check' | 'unverified';
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { resendVerification } = useAuth();
  const { isSmallHeight, insets } = useResponsiveLayout();

  const email = useMemo(
    () => (typeof params.email === 'string' ? params.email : ''),
    [params.email]
  );

  const mode = params.mode === 'unverified' ? 'unverified' : 'check';
  const isUnverifiedLogin = mode === 'unverified';

  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Email missing', 'Please go back and enter your email again.');
      return;
    }

    setIsResending(true);
    try {
      await resendVerification(email);
      Alert.alert('Verification email sent', `We’ve sent a new verification email to ${email}.`);
    } catch (error) {
      console.error('Error resending verification email:', error);
      Alert.alert('Failed to resend email', 'Please try again in a moment.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToSignIn = () => {
    if (!email) {
      router.replace('/welcome');
      return;
    }

    router.replace({
      pathname: '/auth/email-password',
      params: { email },
    });
  };

  const title = isUnverifiedLogin
    ? 'Verify your email to continue'
    : 'Check your email';

  const subtitle = isUnverifiedLogin
    ? 'Your email address is not verified yet. Please click the link in the verification email we sent you.'
    : 'We’ve sent a verification link to your inbox. Click the link to activate your TitanConnect account.';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#00274C', '#003d73', '#0066CC']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isSmallHeight && styles.contentSmall,
            { paddingBottom: (isSmallHeight ? 24 : 40) + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconCircle}>
            <Mail size={40} color="#ffffff" />
          </View>

          <Text style={styles.title}>{title}</Text>

          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Mail size={20} color={Colors.light.accent} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email address</Text>
              <Text style={styles.infoText}>{email || 'No email provided'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isResending && styles.buttonDisabled]}
            onPress={handleResend}
            disabled={isResending}
            activeOpacity={0.85}
          >
            <RefreshCw size={18} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>
              {isResending ? 'Resending…' : 'Resend verification email'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackToSignIn}
            activeOpacity={0.85}
          >
            <ArrowLeft size={18} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  contentSmall: {
    paddingTop: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: '500' as const,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.qrBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '600' as const,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: Colors.light.primary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
});
