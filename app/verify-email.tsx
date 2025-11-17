import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, Check, Sparkles, ArrowRight } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timer = setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    return () => clearTimeout(timer);
  }, [scaleAnim, fadeAnim, pulseAnim]);

  const handleContinue = () => {
    router.push({
      pathname: '/setup-profile',
      params: { email },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isVerified ? ['#4CAF50', '#66BB6A', '#81C784'] : ['#00274C', '#003d73', '#0066CC']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {isVerifying ? (
              <Animated.View style={[styles.loadingContainer, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.loadingRing}>
                  <Sparkles size={48} color="#ffffff" strokeWidth={2.5} />
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                style={[
                  styles.iconCircle,
                  isVerified ? styles.iconCircleSuccess : styles.iconCircleError,
                  { transform: [{ scale: scaleAnim }], opacity: fadeAnim },
                ]}
              >
                <Check size={56} color="#ffffff" strokeWidth={3.5} />
              </Animated.View>
            )}
          </View>

          <Text style={styles.title}>
            {isVerifying ? 'Verifying Email' : isVerified ? 'All Set!' : 'Verification Failed'}
          </Text>

          <Text style={styles.subtitle}>
            {isVerifying
              ? 'We\'re checking your CSUF credentials'
              : isVerified
              ? 'Your email has been verified successfully'
              : 'Please try again'}
          </Text>

          {!isVerifying && (
            <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
              <View style={styles.infoIconContainer}>
                <Mail size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Verified Email</Text>
                <Text style={styles.infoText}>{email}</Text>
              </View>
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Check size={16} color={Colors.light.success} />
                </View>
              )}
            </Animated.View>
          )}

          {isVerified && (
            <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleContinue}
                testID="continue-button"
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Set Up Profile</Text>
                <ArrowRight size={20} color="#ffffff" style={styles.buttonIcon} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {!isVerifying && !isVerified && (
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
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
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 40,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  iconCircleError: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 40,
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
    marginBottom: 32,
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
  verifiedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  buttonText: {
    color: Colors.light.primary,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  buttonTextSecondary: {
    color: '#ffffff',
  },
  buttonIcon: {
    marginLeft: 8,
    color: Colors.light.primary,
  },
});
