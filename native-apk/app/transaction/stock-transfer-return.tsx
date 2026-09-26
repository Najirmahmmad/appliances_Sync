import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/config/api';
import Header from '../../src/components/ui/Header';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import DatePicker from '../../src/components/ui/DatePicker';
import ItemDropdown from '../../src/components/ui/ItemDropdown';
import Typography from '../../src/components/ui/Typography';

export default function StockTransferReturnScreen() {
  const router = useRouter();
  const { bookCode, vouchNo } = useLocalSearchParams();
  const isEditing = Boolean(vouchNo);

  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const { isMobile } = useResponsive();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemsMaster, setItemsMaster] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [error, setError] = useState('');

  const initialHeaderData = {
    book_code: 'STR',
    vouch_date: new Date().toISOString().slice(0, 10),
    technician_id: '',
    remarks: '',
  };

  const [headerData, setHeaderData] = useState<any>(initialHeaderData);

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [qty, setQty] = useState('1');
  const [serialNo, setSerialNo] = useState('');

  const fetchItemsMaster = async () => {
    try {
      const response = await api.get('/items', { params: { status: 'Active' } });
      setItemsMaster(response.data.data || []);
    } catch (err) {
      console.error('Failed to load items', err);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/users', { params: { role: 'Technician', status: 'Active' } });
      const techs = response.data.data.filter((u: any) => u.role === 'Technician' && u.status === 'Active');
      setTechnicians(techs || []);
    } catch (err) {
      console.error('Failed to load technicians', err);
    }
  };

  const fetchTransfer = async () => {
    if (!bookCode || !vouchNo) return;
    setLoading(true);
    try {
      const response = await api.get(`/stock/${bookCode}/${vouchNo}`);
      const { header, items } = response.data.data;
      setHeaderData({
        ...header,
        vouch_date: header.vouch_date ? String(header.vouch_date).slice(0, 10) : new Date().toISOString().slice(0, 10)
      });
      setCartItems(items || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsMaster();
    fetchTechnicians();
  }, []);

  useEffect(() => {
    if (isEditing) {
      fetchTransfer();
    } else {
      // Reset form state for new transaction
      setHeaderData({
        ...initialHeaderData,
        vouch_date: new Date().toLocaleDateString('en-CA'),
      });
      setCartItems([]);
      setSelectedItemCode('');
      setQty('1');
      setSerialNo('');
      setError('');
    }
  }, [bookCode, vouchNo]);

  const handleSelectItem = (item: any) => {
    setSelectedItemCode(item.item_code);
  };

  const handleSelectTechnician = (techId: string) => {
    setHeaderData({ ...headerData, technician_id: techId });
  };

  const handleAddItemToCart = () => {
    const selectedItem = itemsMaster.find((i) => i.item_code === selectedItemCode);
    if (!selectedItem) {
      Alert.alert('Selection Error', 'Please select a valid item first.');
      return;
    }

    const itemQty = parseFloat(qty) || 1;
    if (itemQty <= 0) {
      Alert.alert('Validation Error', 'Quantity must be greater than 0.');
      return;
    }

    const newItem = {
      item_code: selectedItem.item_code,
      item_name: selectedItem.item_name,
      qty: itemQty,
      serial_numbers: serialNo,
    };

    setCartItems([...cartItems, newItem]);
    setSelectedItemCode('');
    setQty('1');
    setSerialNo('');
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!headerData.technician_id) {
      Alert.alert('Validation Error', 'Please select a technician.');
      return;
    }
    if (cartItems.length === 0) {
      Alert.alert('Validation Error', 'List is empty. Please add at least 1 item.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        header: headerData,
        items: cartItems.map(i => ({
            item_code: i.item_code,
            qty: i.qty,
            serial_numbers: i.serial_numbers
        })),
      };

      if (isEditing) {
        await api.put(`/stock/${bookCode}/${vouchNo}`, payload);
        Alert.alert('Success', 'Stock transfer return updated successfully!');
      router.replace('/transaction/stock-transfer-return-list');
      } else {
        await api.post('/stock/transfer', payload);
        Alert.alert('Success', 'Stock transfer return created successfully!');
      router.replace('/transaction/stock-transfer-return-list');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save transfer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <Header title="Stock Transfer Return" showBack />
        <View style={[styles.loadingContainer, { padding: spacing.xxxl }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Typography color={colors.textSecondary} style={{ marginTop: spacing.md }}>Loading details...</Typography>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title={isEditing ? 'Edit Stock Transfer Return' : 'New Stock Transfer Return'} showBack />

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 50 }}>
        {error ? <Typography color={colors.error} style={{ fontWeight: '500' }}>{error}</Typography> : null}

        <Card style={{ gap: spacing.md }}>
          <Typography variant="cardTitle" style={{ color: colors.primary, textTransform: 'uppercase' }}>TRANSFER DETAILS</Typography>
          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <DatePicker
                label="VOUCHER DATE *"
                value={headerData.vouch_date}
                onChange={(date) => setHeaderData({ ...headerData, vouch_date: date })}
              />
            </View>
          </View>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Typography variant="cardTitle" style={{ textTransform: 'uppercase' }}>TECHNICIAN DETAILS</Typography>

          <View style={{ gap: spacing.xs }}>
            <Typography variant="body" style={{ fontWeight: '600' }}>Technician *</Typography>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.xs }}>
              {technicians.map((tech) => (
                <TouchableOpacity
                  key={tech.id}
                  onPress={() => handleSelectTechnician(tech.id)}
                  style={[
                    styles.itemChip,
                    { borderRadius: radius.sm, borderColor: colors.border },
                    headerData.technician_id === tech.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                >
                  <Typography color={headerData.technician_id === tech.id ? colors.white : colors.textPrimary}>
                    {tech.name}
                  </Typography>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Input
            label="Remarks"
            value={headerData.remarks}
            onChangeText={(text) => setHeaderData({ ...headerData, remarks: text })}
            multiline
            placeholder="Optional notes"
            style={{ height: 60 }}
          />
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Typography variant="cardTitle">Add Items</Typography>

          <ItemDropdown 
            items={itemsMaster} 
            onSelect={handleSelectItem} 
            label="Select Item"
            placeholder="Tap to search and select an item..." 
          />

          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Qty"
                value={qty}
                onChangeText={setQty}
                keyboardType="decimal-pad"
                placeholder="1"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Serial Nos"
                value={serialNo}
                onChangeText={setSerialNo}
                placeholder="e.g. SN123"
              />
            </View>
          </View>

          <Button 
            title="Add Item" 
            onPress={handleAddItemToCart}
            icon={<Ionicons name="add-circle-outline" size={20} color={colors.white} />}
          />
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Typography variant="cardTitle">Items List ({cartItems.length})</Typography>

          {cartItems.length === 0 ? (
            <Typography variant="secondary" align="center" style={{ paddingVertical: spacing.md }}>No items added yet.</Typography>
          ) : (
            cartItems.map((item, idx) => (
              <View key={idx} style={[styles.cartItemRow, { borderBottomColor: colors.border, paddingVertical: spacing.sm }]}>
                <View style={{ flex: 1 }}>
                  <Typography style={{ fontWeight: '600' }}>{item.item_name}</Typography>
                  <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                    Qty: {item.qty} {item.serial_numbers ? `| SN: ${item.serial_numbers}` : ''}
                  </Typography>
                </View>
                <TouchableOpacity onPress={() => handleRemoveItem(idx)} style={{ marginLeft: spacing.md }}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        <Button
          title={isEditing ? 'Update Transfer Return' : 'Save Transfer Return'}
          onPress={handleSave}
          loading={saving}
          variant="primary"
          icon={!saving ? <Ionicons name="save-outline" size={20} color={colors.white} /> : undefined}
          style={{ backgroundColor: colors.success, paddingVertical: spacing.lg }}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { alignItems: 'center' },
  
  itemChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
});
