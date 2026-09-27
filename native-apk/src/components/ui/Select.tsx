import React from 'react';
import { View, Platform, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
            backgroundColor: '#f8fafc',
            borderColor: '#e2e8f0',
            borderRadius: 8,
            paddingHorizontal: spacing.md,
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
              fontWeight: '500',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              paddingRight: 24,
            }}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ backgroundColor: '#ffffff', color: colors.textPrimary }}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <Text style={{ flex: 1, paddingVertical: 12, color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>
            {options.find((o) => o.value === value)?.label || 'Select...'}
          </Text>
        )}
        
        {/* Custom Chevron Icon Overlay */}
        <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </View>
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
