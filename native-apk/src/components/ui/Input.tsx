import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  containerStyle,
  icon,
  editable = true,
  style,
  ...props
}: InputProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Typography variant="body" style={{ marginBottom: spacing.xs, fontWeight: '600' }}>
          {label}
        </Typography>
      ) : null}
      
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: editable ? colors.surface : colors.background,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          {...props}
          style={[
            styles.input,
            { color: editable ? colors.textPrimary : colors.textSecondary },
            props.multiline && { textAlignVertical: 'top' },
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          editable={editable}
        />
      </View>
      
      {error ? (
        <Typography variant="caption" color={colors.error} style={{ marginTop: spacing.xs }}>
          {error}
        </Typography>
      ) : null}
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
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingVertical: 10,
  },
});
