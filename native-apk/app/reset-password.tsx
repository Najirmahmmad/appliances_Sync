import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { useResponsive } from '../src/hooks/useResponsive';
import ScreenContainer from '../src/components/ui/ScreenContainer';
import Card from '../src/components/ui/Card';
import Typography from '../src/components/ui/Typography';
import Input from '../src/components/ui/Input';
import Button from '../src/components/ui/Button';
import api from '../src/config/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const { colors, spacing, radius, isDark } = useTheme();
  const { isDesktop, isTablet } = useResponsive();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', { token, newPassword: password });
      if (res.data.success) {
        Alert.alert("Success", "Your password has been successfully reset. You can now log in.", [
          { text: "Go to Login", onPress: () => router.replace('/login') }
        ]);
      } else {
        setError(res.data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
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
              
              <View>
                <Typography variant="screenTitle">Set New Password</Typography>
                <Typography variant="secondary" style={{ marginTop: spacing.xs }}>
                  Enter your new password below.
                </Typography>
              </View>

              {error ? (
                <View style={[styles.errorCard, { backgroundColor: '#fee2e2', borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }]}>
                  <Ionicons name="warning-outline" size={20} color={colors.error} />
                  <Typography variant="body" color={colors.error} style={{ flex: 1, fontWeight: '500' }}>{error}</Typography>
                </View>
              ) : null}

              <Card elevated style={{ gap: spacing.lg }}>
                <View>
                  <Input
                    label="New Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Enter new password"
                    icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Input
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Confirm new password"
                  icon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.textSecondary} />}
                />

                <Button
                  title="Reset Password"
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
    height: 550,
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
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 38,
    padding: 4,
  }
});
