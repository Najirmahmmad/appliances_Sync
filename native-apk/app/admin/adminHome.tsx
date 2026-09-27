import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DashboardStats from "../components/DashboardStats";
import { clearAuthData } from "../utils/storage";
import { StyleSheet } from "react-native";

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
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Section */}
        <DashboardStats data={adminStats} />

        {/* Tracked Users List Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracked Users</Text>

          {/* User Tracking Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/admin/tracking")}
            style={styles.card}
          >
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#f1f5f9' }]}>
              <Ionicons name="location" size={24} color="#64748b" />
            </View>

            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Active Field User</Text>
              <Text style={styles.cardSubtitle}>View recorded movement path</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Tenants Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/admin/tenants")}
            style={styles.card}
          >
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="business" size={24} color="#3b82f6" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Tenant Management</Text>
              <Text style={styles.cardSubtitle}>Manage clients and databases</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Master Users Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/admin/users")}
            style={styles.card}
          >
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#faf5ff' }]}>
              <Ionicons name="people" size={24} color="#a855f7" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Master Users</Text>
              <Text style={styles.cardSubtitle}>View all users across tenants</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Professional Logout Button at the bottom of list */}
        <View style={styles.logoutSection}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 14,
  },
  logoutSection: {
    paddingHorizontal: 24,
    marginTop: 40,
  },
  logoutButton: {
    backgroundColor: '#fff1f2',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  logoutText: {
    color: '#e11d48',
    fontWeight: 'bold',
  }
});
