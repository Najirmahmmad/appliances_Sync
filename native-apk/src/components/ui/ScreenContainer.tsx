import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { StatusBar } from 'expo-status-bar';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safeArea?: boolean;
}

export default function ScreenContainer({ children, style, safeArea = true }: ScreenContainerProps) {
  const { colors, isDark } = useTheme();

  const Container = safeArea ? SafeAreaView : View;

  return (
    <Container style={[styles.container, { backgroundColor: colors.background }, style]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.innerWrapper}>
        {children}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  }
});
