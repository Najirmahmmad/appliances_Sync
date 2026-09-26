import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface DividerProps {
  style?: ViewStyle;
  orientation?: 'horizontal' | 'vertical';
}

export default function Divider({ style, orientation = 'horizontal' }: DividerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        { backgroundColor: colors.border },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
