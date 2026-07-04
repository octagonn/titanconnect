import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { showAlert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors, { INK, palette } from '@/constants/colors';
import { useResponsiveLayout } from '@/lib/responsive';
import { useAuth } from '@/contexts/AuthContext';
import HardShadow from '@/components/ui/HardShadow';

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
      showAlert('Email missing', 'Please go back and enter your email again.');
      return;
    }

    setIsResending(true);
    try {
      await resendVerification(email);
      showAlert('Verification email sent', `We’ve sent a new verification email to ${email}.`);
    } catch (error) {
      console.error('Error resending verification email:', error);
      showAlert('Failed to resend email', 'Please try again in a moment.');
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
        colors={[palette.navy, palette.blue, palette.skyBlue]}
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

          <View style={styles.infoCardWrap}>
            <HardShadow offset={6} radius={20} />
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Mail size={20} color={INK} strokeWidth={2.5} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email address</Text>
                <Text style={styles.infoText}>{email || 'No email provided'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.primaryButtonWrap}>
            {!isResending && <HardShadow offset={5} radius={16} />}
            <TouchableOpacity
              style={[styles.primaryButton, isResending && styles.buttonDisabled]}
              onPress={handleResend}
              disabled={isResending}
              activeOpacity={0.85}
            >
              <RefreshCw size={18} color={INK} style={styles.buttonIcon} strokeWidth={2.5} />
              <Text style={styles.primaryButtonText}>
                {isResending ? 'Resending…' : 'Resend verification email'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackToSignIn}
            activeOpacity={0.85}
          >
            <ArrowLeft size={18} color="#ffffff" style={styles.buttonIcon} strokeWidth={2.5} />
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
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.orange,
    borderWidth: 3,
    borderColor: INK,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: '600' as const,
    paddingHorizontal: 20,
  },
  infoCardWrap: {
    position: 'relative',
    width: '100%',
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    width: '100%',
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: palette.skyBlue,
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
    fontWeight: '800' as const,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '800' as const,
  },
  primaryButtonWrap: {
    position: 'relative',
    width: '100%',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: INK,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: INK,
    fontSize: 16,
    fontWeight: '900' as const,
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
    fontWeight: '800' as const,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
});
