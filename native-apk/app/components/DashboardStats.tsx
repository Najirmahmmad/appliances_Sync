import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

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
}: StatData) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 5,
    }}
    className="bg-white p-6 rounded-[35px] flex-1 h-[170px] border border-gray-50"
  >
    <View className="flex-1 justify-between">
      {/* Icon Section */}
      <View
        className={`w-12 h-12 rounded-2xl items-center justify-center ${colorClass}`}
      >
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>

      {/* Text Section */}
      <View className="mt-4">
        <Text className="text-slate-900 text-3xl font-black tracking-tighter">
          {count}
        </Text>
        <Text className="text-slate-500 text-[13px] font-semibold mt-0.5">
          {title}
        </Text>
      </View>

      {/* Trend Section */}
      {trend && (
        <View className="flex-row items-center mt-2">
          <Text className="text-emerald-500 text-[11px] font-bold">
            {trend}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

export default function DashboardStats({ data }: { data: StatData[] }) {
  return (
    <View className="flex-row px-5 w-full justify-between">
      {data.map((item, index) => (
        <View key={index} className={`flex-1 ${index === 0 ? "mr-3" : "ml-3"}`}>
          <StatCard {...item} />
        </View>
      ))}
    </View>
  );
}
