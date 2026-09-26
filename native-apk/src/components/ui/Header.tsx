import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';
import { useResponsive } from '../../hooks/useResponsive';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, showBack = false }) => {
  const router = useRouter();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { colors, spacing, isDark, setMode } = useTheme();
  const { isDesktop } = useResponsive();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.replace('/dashboard')} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : !isDesktop ? (
          <TouchableOpacity onPress={() => (navigation as any).openDrawer()} style={styles.iconBtn}>
            <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <View style={[styles.titleContainer, { marginLeft: spacing.md }]}>
          <Typography variant="sectionTitle" numberOfLines={1}>{title}</Typography>
          {subtitle ? <Typography variant="caption" color={colors.textSecondary} numberOfLines={1}>{subtitle}</Typography> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => setMode(isDark ? 'light' : 'dark')} style={[styles.iconBtn, { marginRight: spacing.sm }]}>
          <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  titleContainer: {
    flex: 1,
  },
});

export default Header;
