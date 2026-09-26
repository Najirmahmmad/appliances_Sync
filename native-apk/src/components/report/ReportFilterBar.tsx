import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import Typography from '../ui/Typography';
import Card from '../ui/Card';

interface ReportFilterBarProps {
  children: React.ReactNode;
}

export function ReportFilterBar({ children }: ReportFilterBarProps) {
  const { isMobile } = useResponsive();
  const { colors, spacing } = useTheme();

  if (isMobile) {
    return (
      <View style={{ marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.md }}>
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <Card style={{ margin: spacing.md, padding: spacing.md, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-end' }}>
        {children}
      </View>
    </Card>
  );
}

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  width?: number;
}

export function FilterField({ label, children, width = 200 }: FilterFieldProps) {
  const { colors, spacing } = useTheme();
  const { isMobile } = useResponsive();
  
  return (
    <View style={{ width: isMobile ? 160 : width, marginBottom: isMobile ? 0 : 0 }}>
      <Typography variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.xs, fontWeight: '600' }}>
        {label}
      </Typography>
      {children}
    </View>
  );
}
