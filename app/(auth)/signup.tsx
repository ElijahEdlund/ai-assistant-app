import { View, YStack, Text, Input, Button, XStack } from 'tamagui';
import { useState, useEffect } from 'react';
import { useRouter, Link } from 'expo-router';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
import { supabase, isSupabaseConfigured, debugSupabaseConfig } from '../../lib/supabase';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  // Debug configuration on mount (only in development)
  useEffect(() => {
    if (__DEV__) {
      debugSupabaseConfig();
    }
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    // At least 6 characters
    return password.length >= 6;
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Validation
    if (!email.trim()) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter a password');
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        setError('Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file and restart the app.');
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        // Handle specific error cases
        if (authError.message.includes('User already registered') || authError.message.includes('already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else if (authError.message.includes('Password') || authError.message.includes('password')) {
          setError('Password is too weak. Please choose a stronger password.');
        } else if (authError.message.includes('network') || authError.message.includes('Network') || authError.message.includes('fetch')) {
          setError('Network error. Please check your internet connection and ensure your Supabase URL is correct.');
        } else if (authError.message.includes('Invalid API key') || authError.message.includes('JWT')) {
          setError('Invalid Supabase configuration. Please check your EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
        } else {
          setError(authError.message || 'Sign up failed. Please try again.');
        }
        console.error('Sign up error:', authError);
        return;
      }

      if (data.user) {
        // Create user_prefs on first signup
        try {
          await createUserPrefs(data.user.id);
        } catch (prefsError) {
          console.error('Error creating user preferences:', prefsError);
          // Continue even if prefs creation fails
        }

        // Check if email confirmation is required
        if (data.session) {
          // User is automatically signed in (email confirmation disabled)
          setMessage('Account created successfully! Redirecting...');
          setTimeout(() => {
            // Onboarding check will happen in _layout.tsx
            router.replace('/');
          }, 1500);
        } else {
          // Email confirmation required
          setMessage('Please check your email to confirm your account before signing in.');
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 3000);
        }
      }
    } catch (err) {
      console.error('Sign up exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      
      // Provide more helpful error messages
      if (errorMessage.includes('network') || errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setError('Network request failed. Please check:\n1. Your internet connection\n2. Your Supabase URL is correct\n3. You have restarted the app after adding .env variables');
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_')) {
        setError('Cannot connect to Supabase. Please verify your EXPO_PUBLIC_SUPABASE_URL in your .env file and restart the app.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const createUserPrefs = async (userId: string) => {
    await supabase.from('user_prefs').insert({
      user_id: userId,
      biometric_enabled: false,
      timezone: 'America/New_York',
      push_token: null,
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View flex={1} backgroundColor="$background" justifyContent="center" padding="$4">
        <YStack gap="$4" maxWidth={400} width="100%" alignSelf="center">
          <Text fontSize="$9" fontWeight="bold" textAlign="center" marginBottom="$4">
            Create Account
          </Text>
          <Text fontSize="$4" color="$placeholderColor" textAlign="center" marginBottom="$4">
            Sign up to get started
          </Text>
          
          <Input
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            backgroundColor="$backgroundHover"
            borderColor="$borderColor"
            borderWidth={1}
            color="$color"
            placeholderTextColor="$placeholderColor"
            editable={!loading}
            focusStyle={{
              borderColor: "$borderColorFocus",
            }}
          />
          
          <Input
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            secureTextEntry
            autoComplete="password-new"
            backgroundColor="$backgroundHover"
            borderColor="$borderColor"
            borderWidth={1}
            color="$color"
            placeholderTextColor="$placeholderColor"
            editable={!loading}
            focusStyle={{
              borderColor: "$borderColorFocus",
            }}
          />
          
          <Input
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setError(null);
            }}
            secureTextEntry
            autoComplete="password-new"
            backgroundColor="$backgroundHover"
            borderColor="$borderColor"
            borderWidth={1}
            color="$color"
            placeholderTextColor="$placeholderColor"
            editable={!loading}
            onSubmitEditing={handleSignUp}
            focusStyle={{
              borderColor: "$borderColorFocus",
            }}
          />
        
        {error && (
          <YStack gap="$2" padding="$2">
            {error.split('\n').map((line, index) => (
              <Text key={index} color="red" fontSize="$3" textAlign="center">
                {line}
              </Text>
            ))}
          </YStack>
        )}
        
        {message && (
          <Text color="green" fontSize="$3" textAlign="center" padding="$2">
            {message}
          </Text>
        )}
        
        <Button
          size="$5"
          theme="active"
          onPress={handleSignUp}
          disabled={loading || !email.trim() || !password || !confirmPassword}
          opacity={loading || !email.trim() || !password || !confirmPassword ? 0.5 : 1}
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>
        
        <XStack gap="$2" justifyContent="center" alignItems="center" marginTop="$2">
          <Text fontSize="$3" color="$placeholderColor">
            Already have an account?
          </Text>
          <Link href="/(auth)/login" asChild>
            <Button
              size="$3"
              variant="outlined"
              borderColor="$borderColor"
              backgroundColor="transparent"
              paddingHorizontal="$2"
            >
              <Text color="$color" fontSize="$3" fontWeight="600">Sign In</Text>
            </Button>
          </Link>
        </XStack>
      </YStack>
    </View>
    </TouchableWithoutFeedback>
  );
}

