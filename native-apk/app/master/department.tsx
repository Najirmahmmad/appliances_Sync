import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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
import { Alert } from 'react-native';

export default function DepartmentMasterScreen() {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || '';
  const { colors, spacing, radius } = useTheme();

  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    dept_code: '',
    dept_name: '',
    status: 'Active',
  });

  const fetchDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'All') params.status = filterStatus;

      const response = await api.get('/departments', { params });
      setDepartments(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [filterStatus]);

  const resetForm = () => {
    setFormData({
      dept_code: '',
      dept_name: '',
      status: 'Active',
    });
    setIsEditing(false);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setFormData({
      dept_code: item.dept_code,
      dept_name: item.dept_name,
      status: item.status,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormLoading(true);
    setError('');
    try {
      if (isEditing) {
        await api.put(`/departments/${formData.dept_code}`, formData);
        setSuccess('Department updated successfully');
      } else {
        await api.post('/departments', formData);
        setSuccess('Department created successfully');
      }

      resetForm();
      fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (code: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this department?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/departments/${code}`);
            setSuccess('Department deleted successfully');
            fetchDepartments();
          } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete department');
          }
        },
      },
    ]);
  };

  const handleToggleStatus = async (code: string) => {
    try {
      const response = await api.patch(`/departments/${code}/toggle-status`, {});
      setSuccess(response.data.message);
      fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const columns = useMemo(
    () => [
      { header: 'Dept Code', field: 'dept_code' },
      { header: 'Department Name', field: 'dept_name' },
      {
        header: 'Status',
        render: (row: any) => (
          <TouchableOpacity onPress={() => handleToggleStatus(row.dept_code)}>
            <Badge 
              label={row.status} 
              variant={row.status === 'Active' ? 'success' : 'error'} 
            />
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
              <TouchableOpacity onPress={() => handleDelete(row.dept_code)}>
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
      <Header title="Department Master" subtitle="Manage organization departments" showBack />

      {/* Filter Section */}
      <Card style={{ margin: spacing.md, gap: spacing.md }}>
        <Input
          placeholder="Search by Code or Name..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={fetchDepartments}
          icon={<Ionicons name="search-outline" size={20} color={colors.textSecondary} />}
        />
        <Button 
          title="Add Department" 
          onPress={handleAddNew} 
          icon={<Ionicons name="add" size={20} color={colors.white} />} 
        />
      </Card>

      {/* Messages */}
      {error ? <Typography color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{error}</Typography> : null}
      {success ? <Typography color={colors.success} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{success}</Typography> : null}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={departments}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchDepartments();
        }}
        keyExtractor={(item) => String(item.dept_code)}
      />

      {/* Form Modal */}
      <FormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        title={isEditing ? 'Edit Department' : 'Add New Department'}
        onSubmit={handleSubmit}
        loading={formLoading}
        submitLabel={isEditing ? 'Update Department' : 'Create Department'}
      >
        <Input
          label="Department Code *"
          value={formData.dept_code}
          onChangeText={(text) => setFormData({ ...formData, dept_code: text.toUpperCase() })}
          editable={!isEditing}
          placeholder="e.g. SALES"
          autoCapitalize="characters"
        />
        <Input
          label="Department Name *"
          value={formData.dept_name}
          onChangeText={(text) => setFormData({ ...formData, dept_name: text })}
          placeholder="e.g. Sales Department"
        />
      </FormModal>
    </ScreenContainer>
  );
}
