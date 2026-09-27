import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/theme/ThemeContext';
import { useResponsive } from '../src/hooks/useResponsive';
import ScreenContainer from '../src/components/ui/ScreenContainer';
import Card from '../src/components/ui/Card';
import Typography from '../src/components/ui/Typography';
import Input from '../src/components/ui/Input';
import Button from '../src/components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { login, user } = useAuth();
  const { colors, spacing, radius, isDark } = useTheme();
  const { isDesktop, isTablet } = useResponsive();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        router.replace('/dashboard');
      } else {
        setError(result.message || 'Login failed');
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
          
          {/* Desktop Left Side Branding (Hidden on Mobile) */}
          {isLargeScreen && (
            <View style={[styles.brandingSide, { backgroundColor: colors.primary, borderTopLeftRadius: radius.xl, borderBottomLeftRadius: radius.xl }]}>
              <View style={[styles.logoBadge, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.xl, marginBottom: spacing.md }]}>
                <Typography variant="screenTitle" color={colors.white}>IFB</Typography>
              </View>
              <Typography variant="screenTitle" color={colors.white} style={{ fontSize: 32 }}>Welcome Back</Typography>
              <Typography variant="bodyLg" color={colors.white} style={{ marginTop: spacing.md, opacity: 0.9 }}>
                Manage your enterprise seamlessly across Web and Mobile with the IFB Sync ERP.
              </Typography>
            </View>
          )}

          {/* Login Form Side */}
          <View style={[styles.formSide, { backgroundColor: isDark ? colors.surface : '#ffffff', padding: isLargeScreen ? spacing.xxxl : spacing.xl }]}>
            <View style={[styles.content, { gap: spacing.xl, maxWidth: 400, width: '100%', alignSelf: 'center' }]}>
              {/* Header & Logo for Mobile */}
              {!isLargeScreen && (
                <View style={styles.header}>
                  <View style={[styles.logoBadge, { backgroundColor: colors.primary, borderRadius: radius.xl, marginBottom: spacing.md }]}>
                    <Typography variant="screenTitle" color={colors.white}>IFB</Typography>
                  </View>
                  <Typography variant="screenTitle">IFB Sync ERP</Typography>
                  <Typography variant="secondary" style={{ marginTop: spacing.xs }}>Sign in to your account</Typography>
                </View>
              )}

              {/* Header for Desktop */}
              {isLargeScreen && (
                <View>
                  <Typography variant="screenTitle">Sign In</Typography>
                  <Typography variant="secondary" style={{ marginTop: spacing.xs }}>Enter your credentials to continue</Typography>
                </View>
              )}

              {/* Error Banner */}
              {error ? (
                <View style={[styles.errorCard, { backgroundColor: '#fee2e2', borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }]}>
                  <Ionicons name="warning-outline" size={20} color={colors.error} />
                  <Typography variant="body" color={colors.error} style={{ flex: 1, fontWeight: '500' }}>{error}</Typography>
                </View>
              ) : null}

              {/* Form */}
              <Card elevated style={{ gap: spacing.lg }}>
                <Input
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  autoCapitalize="none"
                  icon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
                />

                <View>
                  <Input
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Enter password"
                    icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Button
                  title="Sign In"
                  onPress={handleSubmit}
                  loading={loading}
                  style={{ marginTop: spacing.sm }}
                />
              </Card>

              <View style={{ marginTop: spacing.lg, alignItems: 'center', gap: spacing.md }}>
                <TouchableOpacity 
                  onPress={() => router.push('/admin/adminHome')}
                  style={{ opacity: 0.5, padding: 8 }}
                >
                  <Ionicons name="headset-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <Typography variant="caption" color={colors.textSecondary} align="center">
                  © 2026 IFB Sync ERP. All rights reserved.
                </Typography>
              </View>
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
    maxWidth: 1000,
    width: '90%',
    height: 600,
    backgroundColor: 'transparent',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginVertical: 40,
  },
  brandingSide: {
    flex: 1,
    padding: 40,
    justifyContent: 'center',
  },
  formSide: {
    flex: 1,
    justifyContent: 'center',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  content: {},
  header: { alignItems: 'center' },
  logoBadge: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 38,
    padding: 4,
  },
});
