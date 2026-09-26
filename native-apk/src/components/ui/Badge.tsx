import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  style?: ViewStyle;
}

export default function Badge({ label, variant = 'default', style }: BadgeProps) {
  const { colors, radius, spacing } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary': return { bg: colors.primary, text: colors.white };
      case 'success': return { bg: '#dcfce7', text: colors.success }; // Light green bg for contrast
      case 'warning': return { bg: '#fef3c7', text: colors.warning };
      case 'error': return { bg: '#fee2e2', text: colors.error };
      case 'info': return { bg: '#e0f2fe', text: colors.info };
      case 'default':
      default: return { bg: colors.border, text: colors.textSecondary };
    }
  };

  const badgeColors = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColors.bg,
          borderRadius: radius.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        },
        style,
      ]}
    >
      <Typography variant="caption" style={{ color: badgeColors.text, fontWeight: '600' }}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
