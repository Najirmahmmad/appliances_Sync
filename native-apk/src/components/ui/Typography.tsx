import React from 'react';
import { Text, TextStyle, TextProps, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface TypographyProps extends TextProps {
  variant?: 'screenTitle' | 'sectionTitle' | 'cardTitle' | 'body' | 'bodyLg' | 'secondary' | 'caption' | 'h2' | 'button' | 'buttonSm';
  color?: string; // allow override
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export default function Typography({
  variant = 'body',
  color,
  align = 'auto',
  style,
  children,
  ...props
}: TypographyProps) {
  const { colors, typography } = useTheme();

  const getVariantStyle = () => {
    return typography[variant];
  };

  const textColor = color || (variant === 'secondary' || variant === 'caption' ? colors.textSecondary : colors.textPrimary);

  return (
    <Text
      style={[
        getVariantStyle(),
        { color: textColor, textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
