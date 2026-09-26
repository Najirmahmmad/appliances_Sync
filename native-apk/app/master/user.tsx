import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/config/api';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Header from '../../src/components/ui/Header';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import DataTable from '../../src/components/ui/DataTable';
import FormModal from '../../src/components/ui/FormModal';
import Typography from '../../src/components/ui/Typography';
import Badge from '../../src/components/ui/Badge';

export default function UserMasterScreen() {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || '';
  const { colors, spacing, radius } = useTheme();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'Operator',
    status: 'Active',
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filterRole !== 'All') params.role = filterRole;
      if (filterStatus !== 'All') params.status = filterStatus;

      const response = await api.get('/users', { params });
      setUsers(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterRole, filterStatus]);

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'Operator',
      status: 'Active',
    });
    setIsEditing(false);
    setShowForm(false);
    setShowPassword(false);
    setError('');
    setSuccess('');
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setFormData({
      id: item.id,
      name: item.name,
      phone: item.phone || '',
      email: item.email || '',
      password: '',
      role: item.role,
      status: item.status,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormLoading(true);
    setError('');
    try {
      const payload: any = { ...formData };
      if (isEditing && !payload.password) {
        delete payload.password;
      }

      if (isEditing) {
        await api.put(`/users/${formData.id}`, payload);
        setSuccess('User updated successfully');
      } else {
        await api.post('/users', payload);
        setSuccess('User created successfully');
      }

      resetForm();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/users/${id}`);
            setSuccess('User deleted successfully');
            fetchUsers();
          } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete user');
          }
        },
      },
    ]);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await api.patch(`/users/${id}/toggle-status`, {});
      setSuccess(response.data.message);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const columns = useMemo(
    () => [
      { header: 'User ID', field: 'id' },
      { header: 'Name', field: 'name' },
      { header: 'Email', field: 'email' },
      { header: 'Phone', field: 'phone' },
      {
        header: 'Role',
        render: (row: any) => (
          <Badge label={row.role} variant={row.role === 'Admin' ? 'primary' : 'info'} />
        ),
      },
      {
        header: 'Status',
        render: (row: any) => (
          <TouchableOpacity onPress={() => handleToggleStatus(row.id)}>
            <Badge label={row.status} variant={row.status === 'Active' ? 'success' : 'error'} />
          </TouchableOpacity>
        ),
      },
      {
        header: 'Actions',
        render: (row: any) => (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity onPress={() => handleEdit(row)}>
              <Ionicons name="create-outline" size={20} color={colors.info} />
            </TouchableOpacity>
            {userRole === 'admin' && (
              <TouchableOpacity onPress={() => handleDelete(row.id)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ),
      },
    ],
    [userRole, colors, spacing]
  );

  return (
    <ScreenContainer>
      <Header title="User Master" subtitle="Manage system users & roles" showBack />

      {/* Filter Section */}
      <Card style={{ margin: spacing.md, gap: spacing.md }}>
        <Input
          placeholder="Search by ID, Name, Email..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={fetchUsers}
          icon={<Ionicons name="search-outline" size={20} color={colors.textSecondary} />}
        />

        {/* Role Filter */}
        <View style={{ gap: spacing.xs }}>
          <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Filter by Role</Typography>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {['All', 'Admin', 'Operator', 'Technician'].map((role) => (
              <TouchableOpacity
                key={role}
                onPress={() => { setFilterRole(role); }}
                style={[
                  styles.filterChip,
                  { borderColor: filterRole === role ? colors.primary : colors.border, borderRadius: radius.sm },
                  filterRole === role && { backgroundColor: colors.primary }
                ]}
              >
                <Typography
                  variant="caption"
                  color={filterRole === role ? colors.white : colors.textSecondary}
                  style={{ fontWeight: filterRole === role ? '700' : '500' }}
                >
                  {role}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status Filter */}
        <View style={{ gap: spacing.xs }}>
          <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Filter by Status</Typography>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['All', 'Active', 'Inactive'].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => { setFilterStatus(status); }}
                style={[
                  styles.filterChip,
                  {
                    borderColor: filterStatus === status
                      ? (status === 'Active' ? colors.success : status === 'Inactive' ? colors.error : colors.primary)
                      : colors.border,
                    borderRadius: radius.sm,
                  },
                  filterStatus === status && {
                    backgroundColor: status === 'Active' ? colors.success : status === 'Inactive' ? colors.error : colors.primary,
                  }
                ]}
              >
                <Typography
                  variant="caption"
                  color={filterStatus === status ? colors.white : colors.textSecondary}
                  style={{ fontWeight: filterStatus === status ? '700' : '500' }}
                >
                  {status === 'All' ? 'All Status' : status}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button 
          title="Add User" 
          onPress={handleAddNew} 
          icon={<Ionicons name="add" size={20} color={colors.white} />} 
        />
      </Card>

      {/* Notification Messages */}
      {error ? <Typography color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{error}</Typography> : null}
      {success ? <Typography color={colors.success} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{success}</Typography> : null}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchUsers();
        }}
        keyExtractor={(item) => String(item.id)}
      />

      {/* Form Modal */}
      <FormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        title={isEditing ? 'Edit User' : 'Add New User'}
        onSubmit={handleSubmit}
        loading={formLoading}
        submitLabel={isEditing ? 'Update User' : 'Create User'}
      >
        <Input
          label="User ID *"
          value={formData.id}
          onChangeText={(text) => setFormData({ ...formData, id: text })}
          editable={!isEditing}
          placeholder="e.g. EMP001"
        />
        <Input
          label="Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Full Name"
        />
        <Input
          label="Phone (10 digits)"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text.replace(/\D/g, '').slice(0, 10) })}
          keyboardType="number-pad"
          placeholder="Mobile number"
        />
        <Input
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="user@example.com"
        />
        
        <View style={{ gap: spacing.xs }}>
          <Typography variant="body" style={{ fontWeight: '600' }}>Role *</Typography>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['Admin', 'Operator', 'Technician'].map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setFormData({ ...formData, role: r })}
                style={[
                  styles.roleChip,
                  { borderRadius: radius.sm, borderColor: colors.border },
                  formData.role === r && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
              >
                <Typography 
                  variant="body" 
                  color={formData.role === r ? colors.white : colors.textPrimary}
                  style={{ fontWeight: formData.role === r ? '700' : '500' }}
                >
                  {r}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ position: 'relative' }}>
          <Input
            label={`Password ${!isEditing ? '*' : '(Leave empty if unchanged)'}`}
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry={!showPassword}
            placeholder="Password"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={[
              styles.eyeBtn,
              { top: isEditing ? 40 : 38 }
            ]}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  roleChip: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
});
