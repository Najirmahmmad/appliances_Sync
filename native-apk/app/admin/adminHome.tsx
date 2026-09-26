import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DashboardStats from "../components/DashboardStats";
import { clearAuthData } from "../utils/storage";

export default function AdminHome() {
  const router = useRouter();

  const adminStats = [
    {
      title: "Active Users",
      count: "1,240",
      icon: "people-outline",
      colorClass: "bg-purple-50",
      iconColor: "#A855F7",
      trend: "+12% Today",
    },
    {
      title: "Total Revenue",
      count: "$12.5k",
      icon: "card-outline",
      colorClass: "bg-emerald-50",
      iconColor: "#10B981",
      trend: "+5% m/m",
    },
  ];

  const handleLogout = async () => {
    await clearAuthData();
    router.replace("/components/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Section */}
        <DashboardStats data={adminStats} />

        {/* Tracked Users List Section */}
        <View className="px-6 mt-8">
          <Text className="text-xl font-black text-slate-900 mb-4 tracking-tight">
            Tracked Users
          </Text>

          {/* User Tracking Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/admin/tracking")}
            className="bg-white p-5 rounded-[30px] flex-row items-center shadow-sm border border-slate-100"
          >
            {/* Avatar Placeholder */}
            <View className="bg-slate-100 w-12 h-12 rounded-2xl items-center justify-center">
              <Ionicons name="person" size={24} color="#64748b" />
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-slate-900 text-lg font-bold">
                Active Field User
              </Text>
              <Text className="text-slate-500 text-sm">
                View recorded movement path
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Optional: Professional Logout Button at the bottom of list */}
        <View className="px-6 mt-10">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-rose-50 p-4 rounded-2xl items-center border border-rose-100"
          >
            <Text className="text-rose-600 font-bold">Logout Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
