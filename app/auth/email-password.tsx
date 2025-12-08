import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
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
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = useCallback(async () => {
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
      if (mode === 'signin') {
        const result = await signInWithEmailAndPassword(email, password);

        if (result.success) {
          // Root layout + auth context will navigate appropriately
          return;
        }

        if (result.needsVerification) {
          router.push({
            pathname: '/verify-email',
            params: { email, mode: 'unverified' },
          });
          return;
        }

        if (result.invalidCredentials) {
          Alert.alert('Incorrect email or password', 'Double-check your credentials and try again.');
          return;
        }

        Alert.alert('Sign in failed', 'Check your email/password or verify your email.');
        return;
      }

      // Signup flow with graceful fallback if account already exists
      const preflight = await signInWithEmailAndPassword(email, password);
      if (preflight.success) {
        // Account already exists; treat as sign-in
        return;
      }
      if (preflight.needsVerification) {
        router.push({
          pathname: '/verify-email',
          params: { email, mode: 'unverified' },
        });
        return;
      }

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

      Alert.alert('Something went wrong', 'Please try again or come back later.');
    } catch (error) {
      console.error('Error in email/password auth flow:', error);

      const message = typeof error === 'object' && error && 'message' in error
        ? String((error as Error).message).toLowerCase()
        : '';

      if (
        mode === 'signin' &&
        (message.includes('invalid login') ||
          message.includes('invalid email or password') ||
          message.includes('invalid credentials') ||
          message.includes('invalid password'))
      ) {
        Alert.alert('Incorrect email or password', 'Double-check your credentials and try again.');
        return;
      }

      Alert.alert('Something went wrong', 'Please try again or come back later.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, mode, role, router, signInWithEmailAndPassword, signUpWithEmailAndPassword]);

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
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.subheading}>
            {mode === 'signup'
              ? 'Set a password to finish creating your TitanConnect account.'
              : 'Sign in with your email and password to continue.'}
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
              placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
              placeholderTextColor={Colors.light.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />
            <Text style={styles.helperText}>
              At least 8 characters. {mode === 'signup'
                ? 'You’ll use this password next time you sign in.'
                : 'Use the password you created when signing up.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (!password || isSubmitting) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!password || isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              isSubmitting && styles.secondaryButtonDisabled,
            ]}
            onPress={() => setMode((prev) => (prev === 'signup' ? 'signin' : 'signup'))}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>
              {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            {mode === 'signup'
              ? 'We’ll send a verification email to finish creating your account.'
              : 'Need help? Make sure your email is verified before signing in.'}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  switchText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  switchButton: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '700' as const,
    marginLeft: 6,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.light.primary,
  },
});


