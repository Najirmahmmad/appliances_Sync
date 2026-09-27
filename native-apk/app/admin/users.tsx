import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/config/api";
import Select from "../../src/components/ui/Select";

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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tenantFilter, setTenantFilter] = useState("All");
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState("50");
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    tenant_id: '',
    role: 'Operator',
    status: 'Active'
  });

  const fetchTenants = async () => {
    try {
      const res = await api.get(`/super-admin/tenants`);
      if (res.data.success) {
        setTenants(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async (p = page) => {
    try {
      setLoading(true);
      const res = await api.get(`/super-admin/users?search=${search}&role=${roleFilter}&status=${statusFilter}&tenant_id=${tenantFilter}&page=${p}&limit=${limit}`);
      if (res.data.success) {
        setUsers(res.data.data);
        if (res.data.pagination) {
          setTotalRecords(res.data.pagination.total);
          setTotalPages(res.data.pagination.totalPages);
          setPage(res.data.pagination.page);
        }
      }
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    fetchUsers(1);
  }, [search, roleFilter, statusFilter, tenantFilter, limit]);

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({
      id: Date.now().toString(),
      name: '',
      phone: '',
      email: '',
      password: '',
      tenant_id: '',
      role: 'Operator',
      status: 'Active'
    });
    setModalVisible(true);
  };

  const openEditModal = (u: User) => {
    setIsEditing(true);
    setFormData({
      id: u.id,
      name: u.name,
      phone: u.phone || '',
      email: u.email || '',
      password: '', // blank on edit
      tenant_id: u.tenant_id ? String(u.tenant_id) : '',
      role: u.role,
      status: u.status
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.id || !formData.role || (!isEditing && !formData.password)) {
      Alert.alert("Error", "Please fill all required fields.");
      return;
    }
    
    setSaving(true);
    try {
      const payload = { ...formData, tenant_id: formData.tenant_id ? parseInt(formData.tenant_id) : null };
      if (isEditing) {
        await api.put(`/super-admin/users/${formData.id}`, payload);
      } else {
        await api.post(`/super-admin/users`, payload);
      }
      setModalVisible(false);
      fetchUsers(page);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if(window.confirm && window.confirm("Are you sure you want to delete this user?")) {
        api.delete(`/super-admin/users/${id}`).then(() => fetchUsers(page)).catch(() => alert("Failed"));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Master Users</Text>
          <Text style={styles.headerSubtitle}>Manage all users across tenants.</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              placeholder="Search by name, email, phone..."
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 140 }}>
              <Select
                value={tenantFilter}
                onChange={setTenantFilter}
                options={[
                  { label: 'All Tenants', value: 'All' },
                  ...tenants.map(t => ({ label: t.company_name, value: String(t.id) }))
                ]}
              />
            </View>
            <View style={{ width: 140 }}>
              <Select
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { label: 'All Roles', value: 'All' },
                  { label: 'Admin', value: 'Admin' },
                  { label: 'Operator', value: 'Operator' },
                  { label: 'Technician', value: 'Technician' },
                ]}
              />
            </View>
            <View style={{ width: 140 }}>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: 'All Status', value: 'All' },
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' },
                ]}
              />
            </View>
            <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add User</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>USER</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>CONTACT</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>COMPANY</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ROLE</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>STATUS</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>ACTIONS</Text>
          </View>

          <ScrollView style={styles.tableBody} contentContainerStyle={{ paddingBottom: 40 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#4338ca" style={{ marginTop: 40 }} />
            ) : users.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ color: '#64748b' }}>No users found.</Text>
              </View>
            ) : (
              users.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.tableCell, { fontWeight: '600', color: '#1e293b' }]}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.tableCell, { color: '#475569' }]}>{item.email || 'N/A'}</Text>
                    <Text style={[styles.tableCell, { color: '#64748b', fontSize: 13, marginTop: 2 }]}>{item.phone || 'N/A'}</Text>
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={[styles.tableCell, { color: '#475569' }]}>
                      {item.company_name || 'System'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
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
                  <View style={{ flex: 1 }}>
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
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                      <Ionicons name="trash-outline" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          
          <View style={styles.paginationFooter}>
             <Text style={{color: '#64748b'}}>Total Records: {totalRecords}</Text>
             <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
                <TouchableOpacity onPress={() => fetchUsers(page - 1)} disabled={page <= 1} style={[styles.pageBtn, page <= 1 && {opacity: 0.5}]}>
                   <Text>Prev</Text>
                </TouchableOpacity>
                <Text>Page {page} of {totalPages}</Text>
                <TouchableOpacity onPress={() => fetchUsers(page + 1)} disabled={page >= totalPages} style={[styles.pageBtn, page >= totalPages && {opacity: 0.5}]}>
                   <Text>Next</Text>
                </TouchableOpacity>
             </View>
          </View>
        </View>
      </View>

      {/* Form Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? "Edit User" : "Add New User"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ID <Text style={{color: '#ef4444'}}>*</Text></Text>
                <TextInput
                  style={[styles.input, isEditing && styles.inputDisabled]}
                  value={formData.id}
                  onChangeText={(t) => setFormData({ ...formData, id: t })}
                  editable={!isEditing}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name <Text style={{color: '#ef4444'}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(t) => setFormData({ ...formData, name: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(t) => setFormData({ ...formData, email: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(t) => setFormData({ ...formData, phone: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password {isEditing && "(Leave blank to keep current)"}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  secureTextEntry
                  onChangeText={(t) => setFormData({ ...formData, password: t })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tenant</Text>
                <Select
                  value={formData.tenant_id}
                  onChange={(v) => setFormData({ ...formData, tenant_id: v })}
                  options={[
                    { label: 'System (No Tenant)', value: '' },
                    ...tenants.map(t => ({ label: t.company_name, value: String(t.id) }))
                  ]}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role</Text>
                <Select
                  value={formData.role}
                  onChange={(v: any) => setFormData({ ...formData, role: v })}
                  options={[
                    { label: 'Admin', value: 'Admin' },
                    { label: 'Operator', value: 'Operator' },
                    { label: 'Technician', value: 'Technician' },
                  ]}
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
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>{isEditing ? "Update" : "Create"}</Text>}
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
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeAdmin: { backgroundColor: '#fef3c7' },
  roleBadgeOperator: { backgroundColor: '#e0e7ff' },
  roleBadgeTechnician: { backgroundColor: '#ffedd5' },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },
  roleTextAdmin: { color: '#d97706' },
  roleTextOperator: { color: '#4338ca' },
  roleTextTechnician: { color: '#ea580c' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeActive: { backgroundColor: '#dcfce7' },
  statusBadgeInactive: { backgroundColor: '#f1f5f9' },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  statusTextActive: { color: '#16a34a' },
  statusTextInactive: { color: '#64748b' },
  paginationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: 'white'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalBody: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: 'white',
    outlineStyle: 'none'
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  statusToggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusToggleLeft: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  statusToggleRight: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusToggleActiveBg: { backgroundColor: '#10b981' },
  statusToggleActiveBgRose: { backgroundColor: '#f43f5e' },
  statusToggleInactiveBg: { backgroundColor: '#f8fafc' },
  statusToggleActiveText: { color: 'white', fontWeight: '600' },
  statusToggleActiveTextRose: { color: 'white', fontWeight: '600' },
  statusToggleInactiveText: { color: '#64748b', fontWeight: '500' },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
