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
        <View>
          <Text style={styles.headerTitle}>Tenants</Text>
          <Text style={styles.headerSubtitle}>Manage system tenants and databases.</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Search & Add */}
        <View style={styles.controlsContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              placeholder="Search by name or db..."
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Tenant</Text>
          </TouchableOpacity>
        </View>

        {/* Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>COMPANY NAME</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>DATABASE</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>STATUS</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>ACTIONS</Text>
          </View>

          <ScrollView style={styles.tableBody} contentContainerStyle={{ paddingBottom: 40 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#4338ca" style={{ marginTop: 40 }} />
            ) : tenants.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ color: '#64748b' }}>No tenants found.</Text>
              </View>
            ) : (
              tenants.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: '600', color: '#1e293b' }]}>
                    {item.company_name}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2, color: '#475569' }]}>
                    {item.db_name}
                  </Text>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={[
                      styles.statusBadge, 
                      item.status === 'Active' ? styles.statusBadgeActive : styles.statusBadgeInactive
                    ]}>
                      <Text style={[
                        styles.statusBadgeText, 
                        item.status === 'Active' ? styles.statusTextActive : styles.statusTextInactive
                      ]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 16 }]}>
                    <TouchableOpacity onPress={() => openEditModal(item)}>
                      <Ionicons name="create-outline" size={22} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? "Edit Tenant" : "Add New Tenant"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company Name <Text style={{color: '#ef4444'}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Acme Corp"
                  value={formData.company_name}
                  onChangeText={(t) => setFormData({ ...formData, company_name: t })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Database Name <Text style={{color: '#ef4444'}}>*</Text></Text>
                <TextInput
                  style={[styles.input, isEditing && styles.inputDisabled]}
                  placeholder="e.g. acme_db"
                  value={formData.db_name}
                  onChangeText={(t) => setFormData({ ...formData, db_name: t })}
                  editable={!isEditing} 
                />
              </View>

              <View style={styles.inputGroup}>
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
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSave} 
                disabled={saving} 
                style={styles.saveButton}
              >
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>{isEditing ? "Update" : "Create Tenant"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 32,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
    width: '100%',
  },
  searchBox: {
    flex: 1,
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 12,
    color: '#334155',
    outlineStyle: 'none',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#4338ca',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 44,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  statusBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeInactive: {
    backgroundColor: '#ffe4e6',
  },
  statusTextActive: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextInactive: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalBody: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    outlineStyle: 'none',
  },
  inputDisabled: {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
  },
  statusToggleContainer: {
    flexDirection: 'row',
  },
  statusToggleLeft: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
  },
  statusToggleRight: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 0,
  },
  statusToggleActiveBg: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  statusToggleActiveBgRose: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderLeftWidth: 1,
  },
  statusToggleInactiveBg: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
  },
  statusToggleActiveText: {
    color: '#4338ca',
    fontWeight: '600',
  },
  statusToggleActiveTextRose: {
    color: '#e11d48',
    fontWeight: '600',
  },
  statusToggleInactiveText: {
    color: '#64748b',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4338ca',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  }
});
