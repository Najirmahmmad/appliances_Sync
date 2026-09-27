import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { useResponsive } from '../src/hooks/useResponsive';
import ScreenContainer from '../src/components/ui/ScreenContainer';
import Card from '../src/components/ui/Card';
import Typography from '../src/components/ui/Typography';
import Input from '../src/components/ui/Input';
import Button from '../src/components/ui/Button';
import api from '../src/config/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, spacing, radius, isDark } = useTheme();
  const { isDesktop, isTablet } = useResponsive();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        // For development/testing without real email servers:
        Alert.alert(
          "Email Sent", 
          "If the email exists, a reset link was sent. (DEV MODE: Token is " + res.data.token + ")",
          [
            { text: "Go to Reset Page", onPress: () => router.push({ pathname: '/reset-password', params: { token: res.data.token } }) },
            { text: "OK", onPress: () => router.push('/login') }
          ]
        );
      } else {
        setError(res.data.message || 'Failed to request password reset');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLargeScreen = isDesktop || isTablet;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container]}
      >
        <View style={[styles.layoutWrapper, isLargeScreen && styles.desktopWrapper]}>
          <View style={[styles.formSide, { backgroundColor: isDark ? colors.surface : '#ffffff', padding: isLargeScreen ? spacing.xxxl : spacing.xl }]}>
            <View style={[styles.content, { gap: spacing.xl, maxWidth: 400, width: '100%', alignSelf: 'center' }]}>
              
              <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
                <Typography variant="body" color={colors.textSecondary} style={{ marginLeft: 8 }}>Back to Login</Typography>
              </TouchableOpacity>

              <View>
                <Typography variant="screenTitle">Forgot Password</Typography>
                <Typography variant="secondary" style={{ marginTop: spacing.xs }}>
                  Enter your registered email address and we'll send you a link to reset your password.
                </Typography>
              </View>

              {error ? (
                <View style={[styles.errorCard, { backgroundColor: '#fee2e2', borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }]}>
                  <Ionicons name="warning-outline" size={20} color={colors.error} />
                  <Typography variant="body" color={colors.error} style={{ flex: 1, fontWeight: '500' }}>{error}</Typography>
                </View>
              ) : null}

              <Card elevated style={{ gap: spacing.lg }}>
                <Input
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  icon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
                />

                <Button
                  title="Send Reset Link"
                  onPress={handleSubmit}
                  loading={loading}
                  style={{ marginTop: spacing.sm }}
                />
              </Card>

            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  layoutWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  desktopWrapper: {
    flexDirection: 'row',
    alignSelf: 'center',
    maxWidth: 500,
    width: '90%',
    height: 500,
    backgroundColor: 'transparent',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginVertical: 40,
  },
  formSide: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: 24,
  },
  content: {},
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
