import React from 'react';
import { View, Platform, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

export default function Select({ label, value, options, onChange, icon }: SelectProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Typography variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.xs, fontWeight: '600' }}>
          {label}
        </Typography>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.sm,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        
        {Platform.OS === 'web' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              flex: 1,
              height: '100%',
              minHeight: 40,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.textPrimary,
              fontSize: 14,
            }}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ backgroundColor: colors.surface, color: colors.textPrimary }}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <Text style={{ flex: 1, paddingVertical: 12, color: colors.textPrimary, fontSize: 14 }}>
            {options.find((o) => o.value === value)?.label || 'Select...'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 44,
  },
  iconContainer: {
    marginRight: 8,
  },
});
