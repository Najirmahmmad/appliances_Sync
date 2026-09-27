import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/config/api";

type Tenant = {
  id: number;
  company_name: string;
  db_name: string;
  status: 'Active' | 'Inactive';
  created_at: string;
};

export default function TenantsScreen() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ company_name: "", db_name: "", status: "Active" });
  const [saving, setSaving] = useState(false);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/super-admin/tenants?search=${search}&status=${statusFilter}`);
      if (res.data.success) {
        setTenants(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching tenants", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [search, statusFilter]);

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ company_name: "", db_name: "", status: "Active" });
    setModalVisible(true);
  };

  const openEditModal = (tenant: Tenant) => {
    setIsEditing(true);
    setCurrentId(tenant.id);
    setFormData({ company_name: tenant.company_name, db_name: tenant.db_name, status: tenant.status });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.company_name || !formData.db_name) {
      Alert.alert("Error", "Company Name and Database Name are required.");
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.put(`/super-admin/tenants/${currentId}`, formData);
      } else {
        await api.post(`/super-admin/tenants`, formData);
      }
      setModalVisible(false);
      fetchTenants();
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tenants</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add Tenant</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search by name or db..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.statusFilterButton}
          onPress={() => setStatusFilter(statusFilter === 'All' ? 'Active' : statusFilter === 'Active' ? 'Inactive' : 'All')}
        >
          <Text style={styles.statusFilterText}>Status: {statusFilter}</Text>
        </TouchableOpacity>
      </View>

      {/* Table / List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
        ) : tenants.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ color: '#64748b' }}>No tenants found.</Text>
          </View>
        ) : (
          tenants.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.company_name}</Text>
                <Text style={styles.listSubtitle}>DB: {item.db_name}</Text>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: item.status === 'Active' ? '#22c55e' : '#f43f5e' }]} />
                  <Text style={[styles.statusText, { color: item.status === 'Active' ? '#16a34a' : '#e11d48' }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editButton}>
                <Ionicons name="pencil" size={18} color="#475569" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? "Edit Tenant" : "New Tenant"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Acme Corp"
              value={formData.company_name}
              onChangeText={(t) => setFormData({ ...formData, company_name: t })}
            />

            <Text style={styles.label}>Database Name</Text>
            <TextInput
              style={[styles.input, isEditing && styles.inputDisabled]}
              placeholder="e.g. acme_db"
              value={formData.db_name}
              onChangeText={(t) => setFormData({ ...formData, db_name: t })}
              editable={!isEditing} 
            />

            <Text style={styles.label}>Status</Text>
            <View style={styles.statusToggleContainer}>
              <TouchableOpacity 
                style={[styles.statusToggleLeft, formData.status === 'Active' ? styles.statusToggleActiveBg : styles.statusToggleInactiveBg]}
                onPress={() => setFormData({ ...formData, status: 'Active' })}
              >
                <Text style={formData.status === 'Active' ? styles.statusToggleActiveText : styles.statusToggleInactiveText}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusToggleRight, formData.status === 'Inactive' ? styles.statusToggleActiveBgRose : styles.statusToggleInactiveBg]}
                onPress={() => setFormData({ ...formData, status: 'Inactive' })}
              >
                <Text style={formData.status === 'Inactive' ? styles.statusToggleActiveTextRose : styles.statusToggleInactiveText}>Inactive</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Tenant</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
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
  statusFilterButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
  },
  statusFilterText: {
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
  listItem: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  listSubtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  label: {
    color: '#334155',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    color: '#0f172a',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  statusToggleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  statusToggleLeft: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
  },
  statusToggleRight: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 0,
  },
  statusToggleActiveBg: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  statusToggleActiveBgRose: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderLeftWidth: 1,
  },
  statusToggleInactiveBg: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  statusToggleActiveText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  statusToggleActiveTextRose: {
    color: '#e11d48',
    fontWeight: 'bold',
  },
  statusToggleInactiveText: {
    color: '#64748b',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
