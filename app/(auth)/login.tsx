import { View, YStack, Text, Input, Button, XStack } from 'tamagui';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async () => {
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
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        setError('Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file and restart the app.');
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        // Handle specific error cases
        if (authError.message.includes('Invalid login credentials') || authError.message.includes('Invalid')) {
          setError('Invalid email or password');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Please check your email and confirm your account');
        } else if (authError.message.includes('network') || authError.message.includes('Network') || authError.message.includes('fetch')) {
          setError('Network error. Please check your internet connection and ensure your Supabase URL is correct.');
        } else if (authError.message.includes('Invalid API key') || authError.message.includes('JWT')) {
          setError('Invalid Supabase configuration. Please check your EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
        } else {
          setError(authError.message || 'Login failed. Please try again.');
        }
        console.error('Login error:', authError);
        return;
      }

      if (data.user) {
        // Check if user_prefs exists, create if not
        await ensureUserPrefs(data.user.id);
        // Onboarding check will happen in _layout.tsx
        router.replace('/');
      }
    } catch (err) {
      console.error('Login exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      
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

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'ai-assistant://reset-password',
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage('Password reset email sent! Please check your inbox.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const ensureUserPrefs = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_prefs')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found, create it
      await createUserPrefs(userId);
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
            Welcome Back
          </Text>
          <Text fontSize="$4" color="$placeholderColor" textAlign="center" marginBottom="$4">
            Sign in to continue
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
            autoComplete="password"
            backgroundColor="$backgroundHover"
            borderColor="$borderColor"
            borderWidth={1}
            color="$color"
            placeholderTextColor="$placeholderColor"
            editable={!loading}
            onSubmitEditing={handleLogin}
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
          onPress={handleLogin}
          disabled={loading || !email.trim() || !password}
          opacity={loading || !email.trim() || !password ? 0.5 : 1}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
        
        <Button
          size="$3"
          variant="outlined"
          onPress={handlePasswordReset}
          disabled={loading}
          borderColor="$borderColor"
          backgroundColor="transparent"
        >
          <Text color="$color" fontSize="$3">Forgot Password?</Text>
        </Button>
        
        <XStack gap="$2" justifyContent="center" alignItems="center" marginTop="$2">
          <Text fontSize="$3" color="$placeholderColor">
            Don't have an account?
          </Text>
          <Link href="/(auth)/signup" asChild>
            <Button
              size="$3"
              variant="outlined"
              borderColor="$borderColor"
              backgroundColor="transparent"
              paddingHorizontal="$2"
            >
              <Text color="$color" fontSize="$3" fontWeight="600">Sign Up</Text>
            </Button>
          </Link>
        </XStack>
      </YStack>
    </View>
    </TouchableWithoutFeedback>
  );
}

