import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { showAlert } from '@/lib/alert';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsiveLayout } from '@/lib/responsive';

type Params = {
  email?: string;
  role?: 'student' | 'faculty';
  mode?: 'signin' | 'signup';
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
  // Welcome screen looks the email up and tells us which mode fits; default
  // to sign-up if that param is missing (e.g. direct navigation).
  const [mode, setMode] = useState<'signup' | 'signin'>(
    params.mode === 'signin' ? 'signin' : 'signup'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = useCallback(async () => {
    if (!email) {
      showAlert('Email required', 'Please go back and enter your email.');
      return;
    }
    if (!password || password.length < 8) {
      showAlert('Password too short', 'Please enter a password with at least 8 characters.');
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
          showAlert('Incorrect email or password', 'Double-check your credentials and try again.');
          return;
        }

        showAlert('Sign in failed', 'Check your email/password or verify your email.');
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

      showAlert('Something went wrong', 'Please try again or come back later.');
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
        showAlert('Incorrect email or password', 'Double-check your credentials and try again.');
        return;
      }

      showAlert('Something went wrong', 'Please try again or come back later.');
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
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
                placeholderTextColor={Colors.light.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.passwordToggle}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                testID="toggle-password-visibility"
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.light.textSecondary} />
                ) : (
                  <Eye size={20} color={Colors.light.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.light.text,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
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


