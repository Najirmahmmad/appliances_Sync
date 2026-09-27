import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/config/api";

type User = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'Admin' | 'Operator' | 'Technician';
  status: 'Active' | 'Inactive';
  tenant_id: number;
  company_name?: string;
};

type Tenant = { id: number; company_name: string; };

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/super-admin/users?search=${search}&role=${roleFilter}`);
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const toggleRoleFilter = () => {
    const roles = ['All', 'Admin', 'Operator', 'Technician'];
    const nextIndex = (roles.indexOf(roleFilter) + 1) % roles.length;
    setRoleFilter(roles[nextIndex]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Master Users</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search by name, email, phone..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.roleFilterButton}
          onPress={toggleRoleFilter}
        >
          <Text style={styles.roleFilterText}>Role: {roleFilter}</Text>
        </TouchableOpacity>
      </View>

      {/* Table / List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ color: '#64748b' }}>No users found.</Text>
          </View>
        ) : (
          users.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userDetails}>{item.email || 'No email'} • {item.phone || 'No phone'}</Text>
                </View>
                <View style={[
                  styles.roleBadge,
                  item.role === 'Admin' ? styles.roleBadgeAdmin : item.role === 'Operator' ? styles.roleBadgeOperator : styles.roleBadgeTechnician
                ]}>
                  <Text style={[
                    styles.roleBadgeText,
                    item.role === 'Admin' ? styles.roleTextAdmin : item.role === 'Operator' ? styles.roleTextOperator : styles.roleTextTechnician
                  ]}>
                    {item.role}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.companyInfo}>
                  <Ionicons name="business-outline" size={16} color="#64748b" />
                  <Text style={styles.companyText}>
                    {item.company_name || 'System / Unassigned'}
                  </Text>
                </View>
                <View style={styles.statusInfo}>
                  <View style={[styles.statusDot, { backgroundColor: item.status === 'Active' ? '#22c55e' : '#f43f5e' }]} />
                  <Text style={[styles.statusText, { color: item.status === 'Active' ? '#16a34a' : '#e11d48' }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  filterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 8,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    color: '#334155',
    outlineStyle: 'none',
  },
  roleFilterButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
  },
  roleFilterText: {
    color: '#334155',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  userDetails: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleBadgeAdmin: { backgroundColor: '#f3e8ff' },
  roleBadgeOperator: { backgroundColor: '#dbeafe' },
  roleBadgeTechnician: { backgroundColor: '#ffedd5' },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleTextAdmin: { color: '#7e22ce' },
  roleTextOperator: { color: '#1d4ed8' },
  roleTextTechnician: { color: '#c2410c' },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 6,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  }
});
