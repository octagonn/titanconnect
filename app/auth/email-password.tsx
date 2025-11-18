import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsiveLayout } from '@/lib/responsive';

type Params = {
  email?: string;
  role?: 'student' | 'faculty';
};

export default function EmailPasswordAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { isSmallHeight, insets } = useResponsiveLayout();
  const {
    signInWithEmailAndPassword,
    signUpWithEmailAndPassword,
  } = useAuth();

  const initialEmail = useMemo(
    () => (typeof params.email === 'string' ? params.email : ''),
    [params.email]
  );

  const role = useMemo<'student' | 'faculty'>(() => {
    if (params.role === 'faculty') return 'faculty';
    // Derive role from email domain if role param is missing
    if (typeof params.email === 'string' && params.email.toLowerCase().endsWith('@fullerton.edu')) {
      return 'faculty';
    }
    return 'student';
  }, [params.role, params.email]);

  const [email] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleContinue = async () => {
    if (!email) {
      Alert.alert('Email required', 'Please go back and enter your email.');
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Password too short', 'Please enter a password with at least 8 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1) Try to sign in first
      try {
        const result = await signInWithEmailAndPassword(email, password);

        if (result.success) {
          // Email is verified; the root layout + auth context will navigate appropriately
          return;
        }

        if (result.needsVerification) {
          router.push({
            pathname: '/verify-email',
            params: { email, mode: 'unverified' },
          });
          return;
        }
      } catch (error) {
        // Any sign-in error (invalid credentials, user not found, etc.)
        // will fall through to sign-up logic below.
        console.log('Sign-in failed, attempting sign-up instead:', error);
      }

      // 2) If sign-in failed (e.g. new user), try to sign up
      const signupResult = await signUpWithEmailAndPassword(email, password, role);

      if (signupResult.success) {
        router.push({
          pathname: '/verify-email',
          params: { email, mode: 'check' },
        });
        return;
      }

      if (signupResult.needsVerification) {
        router.push({
          pathname: '/verify-email',
          params: { email, mode: 'unverified' },
        });
        return;
      }

      // If we get here, something unexpected happened
      Alert.alert('Something went wrong', 'Please try again or come back later.');
    } catch (error) {
      console.error('Error in email/password auth flow:', error);
      Alert.alert('Something went wrong', 'Please try again or come back later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View
        style={[
          styles.content,
          isSmallHeight && styles.contentSmall,
          { paddingBottom: 24 + insets.bottom },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.heading}>
            {role === 'faculty' ? 'Faculty Sign In' : 'Sign In or Create Account'}
          </Text>
          <Text style={styles.subheading}>
            Enter a password to {role === 'faculty' ? 'access your faculty account.' : 'sign in or create your TitanConnect account.'}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainerDisabled}>
              <Text style={styles.emailText}>{email}</Text>
            </View>
            <Text style={styles.helperText}>
              We use your CSUF or Fullerton email to verify your identity.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a secure password"
              placeholderTextColor={Colors.light.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />
            <Text style={styles.helperText}>
              At least 8 characters. You’ll use this password next time you sign in.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (!password || isSubmitting) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!password || isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Please wait…' : 'Continue'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            If this email is new, we’ll create an account and send a verification email. If it already
            exists, we’ll sign you in after verification.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'center',
  },
  contentSmall: {
    paddingTop: 16,
    justifyContent: 'flex-start',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 6,
  },
  inputContainerDisabled: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emailText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  input: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.light.text,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  buttonDisabled: {
    backgroundColor: Colors.light.border,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  footerText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});


