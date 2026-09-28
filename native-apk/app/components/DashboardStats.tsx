import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useTheme } from "../../src/theme/ThemeContext";

interface StatData {
  title: string;
  count: string | number;
  icon: any;
  colorClass: string;
  iconColor: string;
  trend?: string;
  onPress?: () => void;
}

const StatCard = ({
  title,
  count,
  icon,
  colorClass,
  iconColor,
  trend,
  onPress,
}: StatData) => {
  const { colors, isDark } = useTheme();
  
  return (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
  >
    <View style={styles.cardInner}>
      {/* Icon Section */}
      <View style={[styles.iconContainer, getBgColor(colorClass, isDark)]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>

      {/* Text Section */}
      <View style={{ marginTop: 16 }}>
        <Text style={[styles.countText, { color: colors.textPrimary }]}>
          {count}
        </Text>
        <Text style={[styles.titleText, { color: colors.textSecondary }]}>
          {title}
        </Text>
      </View>

      {/* Trend Section */}
      {trend && (
        <View style={styles.trendContainer}>
          <Text style={styles.trendText}>
            {trend}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
)};

// Helper to resolve hardcoded tailwind color classes
const getBgColor = (colorClass: string, isDark: boolean) => {
  if (colorClass.includes('purple')) return { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff' };
  if (colorClass.includes('emerald')) return { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5' };
  if (colorClass.includes('blue')) return { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' };
  if (colorClass.includes('rose') || colorClass.includes('red')) return { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#ffe4e6' };
  return { backgroundColor: isDark ? '#334155' : '#f1f5f9' };
};

export default function DashboardStats({ data }: { data: StatData[] }) {
  return (
    <View style={styles.container}>
      {data.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  card: {
    padding: 24,
    borderRadius: 30,
    flex: 1,
    minWidth: 150,
    height: 170,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  cardInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trendText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  }
});
