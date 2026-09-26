import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
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
import Select from '../../src/components/ui/Select';
import DatePicker from '../../src/components/ui/DatePicker';
import ItemDropdown from '../../src/components/ui/ItemDropdown';
import Typography from '../../src/components/ui/Typography';
import BarcodeScanner from '../../src/components/ui/BarcodeScanner';

export default function SaleAMCFormScreen() {
  const router = useRouter();
  const { bookCode, vouchNo } = useLocalSearchParams();
  const isEditing = Boolean(vouchNo);

  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const { isMobile } = useResponsive();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemsMaster, setItemsMaster] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({ party_name: '', party_phone: '' });

  const initialHeaderData = {
    book_code: 'SAMC',
    vouch_no: '',
    vouch_date: new Date().toISOString().slice(0, 10),
    payment_mode: 'Cash',
    party_name: '',
    party_phone: '',
    party_email: '',
    party_gst: '',
    party_address: '',
    technician_name: '',
    remarks: '',
  };

  const [headerData, setHeaderData] = useState<any>(initialHeaderData);

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [qty, setQty] = useState('1');
  const [rate, setRate] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [modelNo, setModelNo] = useState('');

  // Barcode Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [activeScanField, setActiveScanField] = useState<'serialNo' | 'modelNo' | null>(null);

  const fetchItemsMaster = async () => {
    try {
      const response = await api.get('/items', { params: { status: 'Active' } });
      setItemsMaster(response.data.data || []);
    } catch (err) {
      console.error('Failed to load items master', err);
    }
  };

  const fetchSaleInvoice = async () => {
    if (!bookCode || !vouchNo) return;
    setLoading(true);
    try {
      const response = await api.get(`/sales/${bookCode}/${vouchNo}`);
      const { header, items } = response.data.data;
      setHeaderData(header);
      setCartItems(items || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsMaster();
  }, []);

  useEffect(() => {
    if (isEditing) {
      fetchSaleInvoice();
    } else {
      // Reset form state for new transaction
      setHeaderData({
        ...initialHeaderData,
        vouch_date: new Date().toLocaleDateString('en-CA'),
      });
      setCartItems([]);
      setSelectedItemCode('');
      setQty('1');
      setRate('');
      setSerialNo('');
      setModelNo('');
      setError('');
    }
  }, [bookCode, vouchNo]);

  const amcItems = useMemo(() => {
    return itemsMaster.filter((item) => item.isAMC === 'Yes');
  }, [itemsMaster]);

  const handleSelectItem = (item: any) => {
    setSelectedItemCode(item.item_code);
    setRate(String(item.sale_rate || 0));
    if (item.model_no) setModelNo(item.model_no);
  };

  const handleAddItemToCart = () => {
    const selectedItem = itemsMaster.find((i) => i.item_code === selectedItemCode);
    if (!selectedItem) {
      Alert.alert('Selection Error', 'Please select a valid item first.');
      return;
    }

    const itemQty = parseFloat(qty) || 1;
    const itemRate = rate.trim() !== "" && !isNaN(parseFloat(rate)) ? parseFloat(rate) : (parseFloat(selectedItem.sale_rate) || 0);
    const taxRate = parseFloat(selectedItem.tax_rate) || 18;
    const netAmt = itemQty * itemRate;
    const taxAmt = (netAmt * taxRate) / (100 + taxRate);
    const basicAmt = netAmt - taxAmt;

    const newItem = {
      item_code: selectedItem.item_code,
      item_name: selectedItem.item_name,
      hsn_code: selectedItem.hsn_code || '',
      qty: itemQty,
      unit: selectedItem.unit || 'Pcs',
      rate: itemRate,
      basic_amt: basicAmt,
      tax_rate: taxRate,
      tax_amt: taxAmt,
      net_amt: netAmt,
      serial_no: serialNo,
      model_no: modelNo,
    };

    setCartItems([...cartItems, newItem]);
    setSelectedItemCode('');
    setQty('1');
    setRate('');
    setSerialNo('');
    setModelNo('');
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const totals = cartItems.reduce(
    (acc, curr) => {
      acc.qty += parseFloat(curr.qty) || 0;
      acc.basic += parseFloat(curr.basic_amt) || 0;
      acc.tax += parseFloat(curr.tax_amt) || 0;
      acc.net += parseFloat(curr.net_amt) || 0;
      return acc;
    },
    { qty: 0, basic: 0, tax: 0, net: 0 }
  );

  const handleSaveInvoice = async () => {
    let hasError = false;
    let errors = { party_name: '', party_phone: '' };
    if (!headerData.party_name.trim()) {
      errors.party_name = 'Customer Name is required';
      hasError = true;
    }
    if (!headerData.party_phone.trim()) {
      errors.party_phone = 'Phone number is required';
      hasError = true;
    }
    setFormErrors(errors);
    if (hasError) return;
    if (cartItems.length === 0) {
      Alert.alert('Validation Error', 'Cart is empty. Please add at least 1 item.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const sanitizedDate = headerData.vouch_date ? String(headerData.vouch_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
      const payload = {
        header: {
          ...headerData,
          vouch_date: sanitizedDate,
          total_qty: totals.qty,
          total_basic: totals.basic,
          total_tax: totals.tax,
          net_amount: totals.net,
            technician_name: user?.name || user?.username || '',
        },
        items: cartItems,
      };

      if (isEditing) {
        await api.put(`/sales/${bookCode}/${vouchNo}`, payload);
        Alert.alert('Success', 'AMC Invoice updated successfully!');
      router.replace('/transaction/sale-amc-list');
      } else {
        await api.post('/sales', payload);
        Alert.alert('Success', 'AMC Invoice created successfully!');
      router.replace('/transaction/sale-amc-list');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <Header title="Sales AMC Invoice" showBack />
        <View style={[styles.loadingContainer, { padding: spacing.xxxl }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Typography color={colors.textSecondary} style={{ marginTop: spacing.md }}>Loading invoice details...</Typography>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title={isEditing ? 'Edit Sales AMC Invoice' : 'New Sales AMC Invoice'} showBack />

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 50 }}>
        {error ? <Typography color={colors.error} style={{ fontWeight: '500' }}>{error}</Typography> : null}

        {/* Invoice Details Card */}
        <Card style={{ gap: spacing.md }}>
          <Typography variant="cardTitle" style={{ color: colors.primary, textTransform: 'uppercase' }}>INVOICE DETAILS</Typography>
          
          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <DatePicker
                label="VOUCHER DATE *"
                value={headerData.vouch_date}
                onChange={(date) => setHeaderData({ ...headerData, vouch_date: date })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Select
                label="PAYMENT MODE"
                value={headerData.payment_mode}
                onChange={(value) => setHeaderData({ ...headerData, payment_mode: value })}
                options={[
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Card', value: 'Card' },
                  { label: 'UPI', value: 'UPI' },
                  { label: 'Bank Transfer', value: 'Bank Transfer' },
                ]}
                icon={<Ionicons name="card-outline" size={20} color={colors.textSecondary} />}
              />
            </View>
          </View>
        </Card>

        {/* Customer Information Card */}
        <Card style={{ gap: spacing.md }}>
          <Typography variant="cardTitle" style={{ textTransform: 'uppercase' }}>CUSTOMER DETAILS</Typography>

          <Input
            label="Party / Customer Name *"
            error={formErrors.party_name}
            value={headerData.party_name}
            onChangeText={(text) => {
              setHeaderData({ ...headerData, party_name: text });
              if (text.trim()) setFormErrors(prev => ({ ...prev, party_name: '' }));
            }}
            placeholder="e.g. John Doe"
          />

          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Phone *"
                error={formErrors.party_phone}
                value={headerData.party_phone}
                onChangeText={(text) => {
                  setHeaderData({ ...headerData, party_phone: text });
                  if (text.trim()) setFormErrors(prev => ({ ...prev, party_phone: '' }));
                }}
                keyboardType="phone-pad"
                placeholder="10-digit number"
              />
            </View>
            
          </View>

          <Input
            label="Address"
            value={headerData.party_address}
            onChangeText={(text) => setHeaderData({ ...headerData, party_address: text })}
            multiline
            placeholder="Full address"
            style={{ height: 60 }}
          />
        </Card>

        {/* Add Items Card */}
        <Card style={{ gap: spacing.md }}>
          <Typography variant="cardTitle">Add Items to Cart</Typography>

          <ItemDropdown 
            items={amcItems} 
            onSelect={handleSelectItem} 
            label="Select Item from Master"
            placeholder="Tap to search and select an AMC item..." 
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
                label="Rate (₹)"
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
                placeholder="Rate"
              />
            </View>
          </View>

          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: spacing.md, marginTop: spacing.sm }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Serial No."
                  value={serialNo}
                  onChangeText={setSerialNo}
                  placeholder="Scan or type"
                />
              </View>
              <TouchableOpacity 
                style={{ padding: 10, marginTop: 24, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}
                onPress={() => {
                  setActiveScanField('serialNo');
                  setShowScanner(true);
                }}
              >
                <Ionicons name="barcode-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Model No."
                  value={modelNo}
                  onChangeText={setModelNo}
                  placeholder="Scan or type"
                />
              </View>
              <TouchableOpacity 
                style={{ padding: 10, marginTop: 24, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}
                onPress={() => {
                  setActiveScanField('modelNo');
                  setShowScanner(true);
                }}
              >
                <Ionicons name="barcode-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <Button 
            title="Add Item to Invoice" 
            onPress={handleAddItemToCart}
            icon={<Ionicons name="cart-outline" size={20} color={colors.white} />}
          />
        </Card>

        {/* Cart Items List */}
        <Card style={{ gap: spacing.md }}>
          <Typography variant="cardTitle">Invoice Items ({cartItems.length})</Typography>

          {cartItems.length === 0 ? (
            <Typography variant="secondary" align="center" style={{ paddingVertical: spacing.md }}>No items added to invoice yet.</Typography>
          ) : (
            cartItems.map((item, idx) => (
              <View key={idx} style={[styles.cartItemRow, { borderBottomColor: colors.border, paddingVertical: spacing.sm }]}>
                <View style={{ flex: 1 }}>
                  <Typography style={{ fontWeight: '600' }}>{item.item_name}</Typography>
                  <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                    {item.qty} {item.unit} × ₹{item.rate} | Tax ({item.tax_rate || item.tax_perc}%): ₹{parseFloat(item.tax_amt).toFixed(2)}
                  </Typography>
                  {(item.serial_no || item.model_no) ? (
                    <Typography variant="caption" color={colors.primary} style={{ marginTop: 2, fontWeight: '500' }}>
                      {item.serial_no ? `S/N: ${item.serial_no}` : ''} {(item.serial_no && item.model_no) ? '| ' : ''}{item.model_no ? `Model: ${item.model_no}` : ''}
                    </Typography>
                  ) : null}
                </View>
                <Typography color={colors.success} style={{ fontWeight: '700' }}>₹{parseFloat(item.net_amt).toFixed(2)}</Typography>
                <TouchableOpacity onPress={() => handleRemoveItem(idx)} style={{ marginLeft: spacing.md }}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Grand Totals */}
          <View style={[styles.totalsContainer, { borderTopColor: colors.border, paddingTop: spacing.md }]}>
            <View style={styles.totalRow}>
              <Typography variant="secondary">Sub Total:</Typography>
              <Typography style={{ fontWeight: '600' }}>₹{totals.basic.toFixed(2)}</Typography>
            </View>
            <View style={styles.totalRow}>
              <Typography variant="secondary">Tax Amount (GST):</Typography>
              <Typography style={{ fontWeight: '600' }}>₹{totals.tax.toFixed(2)}</Typography>
            </View>
            <View style={[styles.grandTotalRow, { borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
              <Typography variant="bodyLg" style={{ fontWeight: '700' }}>Net Total Amount:</Typography>
              <Typography variant="sectionTitle" color={colors.success} style={{ fontWeight: '800' }}>₹{totals.net.toFixed(2)}</Typography>
            </View>
          </View>
        </Card>

        {/* Save Button */}
        <Button
          title={isEditing ? 'Update Invoice' : 'Save Invoice'}
          onPress={handleSaveInvoice}
          loading={saving}
          variant="primary"
          icon={!saving ? <Ionicons name="save-outline" size={20} color={colors.white} /> : undefined}
          style={{ backgroundColor: colors.success, paddingVertical: spacing.lg }}
        />
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <BarcodeScanner
          onScan={(data) => {
            if (activeScanField === 'serialNo') setSerialNo(data);
            if (activeScanField === 'modelNo') setModelNo(data);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
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
  totalsContainer: {
    borderTopWidth: 1,
    gap: 6,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotalRow: { borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
});
