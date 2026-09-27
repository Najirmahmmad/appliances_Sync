import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
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

const TAX_RATES = [0, 5, 12, 18, 28];
const UNITS = ['Pcs', 'Set', 'Nos', 'Kg', 'Ltr', 'Mtr', 'Box', 'Pack'];

export default function ItemMasterScreen() {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || '';
  const { colors, spacing, radius } = useTheme();

  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAMC, setFilterAMC] = useState('All');
  const [filterAccessories, setFilterAccessories] = useState('All');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState('50');
  const [totalRecords, setTotalRecords] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState<any>({
    item_code: '',
    item_name: '',
    dept_code: '',
    sale_rate: '',
    commission: '0',
    tax_rate: 18,
    unit: 'Pcs',
    hsn_code: '',
    status: 'Active',
    opening_stock: '',
    current_stock: '',
    isAMC: 'No',
    isAccessories: 'No',
    LeadTimeDays: '0',
    rack_no: '',
  });

  const fetchItems = async (currentPage = page, currentLimit = limit) => {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        page: currentPage,
        limit: currentLimit,
      };
      if (searchTerm) params.search = searchTerm;
      if (filterDept !== 'All') params.dept_code = filterDept;
      if (filterStatus !== 'All') params.status = filterStatus;
      if (filterAMC !== 'All') params.isAMC = filterAMC;
      if (filterAccessories !== 'All') params.isAccessories = filterAccessories;

      const response = await api.get('/items', { params });
      setItems(response.data.data || []);
      if (response.data.pagination) {
        setTotalRecords(response.data.pagination.total);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments', { params: { status: 'Active' } });
      setDepartments(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchItems(1, limit);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filterDept, filterStatus, filterAMC, filterAccessories]);

  const resetForm = () => {
    setFormData({
      item_code: '',
      item_name: '',
      dept_code: '',
      sale_rate: '',
      commission: '0',
      tax_rate: 18,
      unit: 'Pcs',
      hsn_code: '',
      status: 'Active',
      opening_stock: '',
      current_stock: '',
      isAMC: 'No',
      isAccessories: 'No',
      LeadTimeDays: '0',
      rack_no: '',
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
      item_code: item.item_code,
      item_name: item.item_name,
      dept_code: item.dept_code || '',
      sale_rate: String(item.sale_rate || ''),
      commission: String(item.commission || 0),
      tax_rate: parseFloat(item.tax_rate) || 0,
      unit: item.unit || 'Pcs',
      hsn_code: item.hsn_code || '',
      status: item.status,
      current_stock: String(item.current_stock || 0),
      isAMC: item.isAMC || 'No',
      isAccessories: item.isAccessories || 'No',
      LeadTimeDays: String(item.LeadTimeDays || 0),
      rack_no: item.rack_no || '',
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        sale_rate: parseFloat(formData.sale_rate) || 0,
        commission: parseFloat(formData.commission) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        LeadTimeDays: parseInt(formData.LeadTimeDays, 10) || 0,
      };

      if (isEditing) {
        await api.put(`/items/${formData.item_code}`, payload);
        setSuccess('Item updated successfully');
      } else {
        await api.post('/items', payload);
        setSuccess('Item created successfully');
      }

      resetForm();
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (code: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/items/${code}`);
            setSuccess('Item deleted successfully');
            fetchItems();
          } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const handleToggleStatus = async (code: string) => {
    try {
      const response = await api.patch(`/items/${code}/toggle-status`, {});
      setSuccess(response.data.message);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const columns = useMemo(
    () => [
      { header: 'Item Code', field: 'item_code' },
      {
        header: 'Name',
        render: (row: any) => (
          <View>
            <Typography style={{ fontWeight: '500' }}>{row.item_name}</Typography>
            {row.hsn_code ? (
              <Typography variant="caption" color={colors.textSecondary}>
                HSN: {row.hsn_code}
              </Typography>
            ) : null}
          </View>
        ),
      },
      {
        header: 'Sale Rate',
        render: (row: any) => <Typography style={{ fontWeight: '700' }}>₹{parseFloat(row.sale_rate || 0).toFixed(2)}</Typography>,
      },
      {
        header: 'Comm.',
        render: (row: any) => <Typography>₹{parseFloat(row.commission || 0).toFixed(2)}</Typography>,
      },
      {
        header: 'Stock',
        render: (row: any) => (
          <Typography color={parseFloat(row.current_stock || 0) < 5 ? colors.error : colors.textPrimary} style={{ fontWeight: '700' }}>
            {row.current_stock || 0} {row.unit}
          </Typography>
        ),
      },
      {
        header: 'AMC',
        render: (row: any) => (
          <Badge label={row.isAMC === 'Yes' ? 'Yes' : 'No'} variant={row.isAMC === 'Yes' ? 'success' : 'default'} />
        ),
      },
      {
        header: 'Accessories',
        render: (row: any) => (
          <Badge label={row.isAccessories === 'Yes' ? 'Yes' : 'No'} variant={row.isAccessories === 'Yes' ? 'success' : 'default'} />
        ),
      },
      {
        header: 'Status',
        render: (row: any) => (
          <TouchableOpacity onPress={() => handleToggleStatus(row.item_code)}>
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
              <TouchableOpacity onPress={() => handleDelete(row.item_code)}>
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
      <Header title="Add/Acc Item Master" subtitle="Manage products and stock" showBack />

      {/* Search & Add */}
      <Card style={{ margin: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, maxWidth: 400 }}>
        <Input
          placeholder="Search Item Code or Name..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          icon={<Ionicons name="search-outline" size={20} color={colors.textSecondary} />}
        />
      </View>
        
        {/* Type Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => { setFilterAMC('All'); setFilterAccessories('All'); }}
            style={[
              styles.chip,
              { borderRadius: radius.sm, borderColor: colors.border },
              (filterAMC === 'All' && filterAccessories === 'All') && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
          >
            <Typography color={(filterAMC === 'All' && filterAccessories === 'All') ? colors.white : colors.textPrimary} style={{ fontWeight: (filterAMC === 'All' && filterAccessories === 'All') ? '700' : '500' }}>
              All Items
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setFilterAMC('Yes'); setFilterAccessories('All'); }}
            style={[
              styles.chip,
              { borderRadius: radius.sm, borderColor: colors.border },
              (filterAMC === 'Yes') && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
          >
            <Typography color={(filterAMC === 'Yes') ? colors.white : colors.textPrimary} style={{ fontWeight: (filterAMC === 'Yes') ? '700' : '500' }}>
              AMC Items
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setFilterAMC('All'); setFilterAccessories('Yes'); }}
            style={[
              styles.chip,
              { borderRadius: radius.sm, borderColor: colors.border },
              (filterAccessories === 'Yes') && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
          >
            <Typography color={(filterAccessories === 'Yes') ? colors.white : colors.textPrimary} style={{ fontWeight: (filterAccessories === 'Yes') ? '700' : '500' }}>
              Accessories
            </Typography>
          </TouchableOpacity>
        </ScrollView>

        <Button 
          title="Add Item" 
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
        data={items}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          setPage(1);
          fetchItems(1, limit);
        }}
        keyExtractor={(item) => String(item.item_code)}
        serverPagination={true}
        currentPage={page}
        pageSize={limit}
        totalRecords={totalRecords}
        onPageChange={(newPage) => {
          setPage(newPage);
          fetchItems(newPage, limit);
        }}
        onPageSizeChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
          fetchItems(1, newLimit);
        }}
      />

      {/* Form Modal */}
      <FormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        title={isEditing ? 'Edit Item' : 'Add New Item'}
        onSubmit={handleSubmit}
        loading={formLoading}
        submitLabel={isEditing ? 'Update Item' : 'Create Item'}
      >
        <Input
          label="Item Code *"
          value={formData.item_code}
          onChangeText={(text) => setFormData({ ...formData, item_code: text.toUpperCase() })}
          editable={!isEditing}
          placeholder="e.g. IFB-WM001"
        />
        <Input
          label="Item Name *"
          value={formData.item_name}
          onChangeText={(text) => setFormData({ ...formData, item_name: text })}
          placeholder="Item Description"
        />
        <Input
          label="Sale Rate (₹) *"
          value={formData.sale_rate}
          onChangeText={(text) => setFormData({ ...formData, sale_rate: text })}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Input
          label="Commission (%)"
          value={formData.commission}
          onChangeText={(text) => setFormData({ ...formData, commission: text })}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        
        <View style={{ gap: spacing.xs }}>
          <Typography variant="body" style={{ fontWeight: '600' }}>Tax Rate (GST)</Typography>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {TAX_RATES.map((rate) => (
              <TouchableOpacity
                key={rate}
                onPress={() => setFormData({ ...formData, tax_rate: rate })}
                style={[
                  styles.chip,
                  { borderRadius: radius.sm, borderColor: colors.border },
                  formData.tax_rate === rate && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
              >
                <Typography color={formData.tax_rate === rate ? colors.white : colors.textPrimary} style={{ fontWeight: formData.tax_rate === rate ? '700' : '500' }}>
                  {rate}%
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Typography variant="body" style={{ fontWeight: '600' }}>Unit</Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => setFormData({ ...formData, unit: u })}
                style={[
                  styles.chip,
                  { borderRadius: radius.sm, borderColor: colors.border },
                  formData.unit === u && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
              >
                <Typography color={formData.unit === u ? colors.white : colors.textPrimary} style={{ fontWeight: formData.unit === u ? '700' : '500' }}>
                  {u}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Input
          label={isEditing ? 'Current Stock' : 'Opening Stock'}
          value={isEditing ? formData.current_stock : formData.opening_stock}
          onChangeText={(text) => setFormData({ ...formData, [isEditing ? 'current_stock' : 'opening_stock']: text })}
          keyboardType="number-pad"
          placeholder="0"
        />
        <Input
          label="HSN Code"
          value={formData.hsn_code}
          onChangeText={(text) => setFormData({ ...formData, hsn_code: text })}
          placeholder="HSN Code"
        />
        <Input
          label="Rack No"
          value={formData.rack_no}
          onChangeText={(text) => setFormData({ ...formData, rack_no: text })}
          placeholder="Rack Location"
        />

        <View style={{ gap: spacing.xs }}>
          <Typography variant="body" style={{ fontWeight: '600' }}>AMC Item?</Typography>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['Yes', 'No'].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => setFormData({ ...formData, isAMC: val })}
                style={[
                  styles.chip,
                  { borderRadius: radius.sm, borderColor: colors.border },
                  formData.isAMC === val && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
              >
                <Typography color={formData.isAMC === val ? colors.white : colors.textPrimary} style={{ fontWeight: formData.isAMC === val ? '700' : '500' }}>
                  {val}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Typography variant="body" style={{ fontWeight: '600' }}>Accessories Item?</Typography>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['Yes', 'No'].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => setFormData({ ...formData, isAccessories: val })}
                style={[
                  styles.chip,
                  { borderRadius: radius.sm, borderColor: colors.border },
                  formData.isAccessories === val && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
              >
                <Typography color={formData.isAccessories === val ? colors.white : colors.textPrimary} style={{ fontWeight: formData.isAccessories === val ? '700' : '500' }}>
                  {val}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
