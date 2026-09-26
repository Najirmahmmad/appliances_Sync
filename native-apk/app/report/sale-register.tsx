import { formatDisplayDate } from '../../src/utils/dateUtils';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Typography from '../../src/components/ui/Typography';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import Select from '../../src/components/ui/Select';
import DatePicker from '../../src/components/ui/DatePicker';
import { useFocusEffect } from 'expo-router';
import { ReportFilterBar, FilterField } from '../../src/components/report/ReportFilterBar';
import { useTheme } from '../../src/theme/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import api from '../../src/config/api';
import Header from '../../src/components/ui/Header';
import DataTable from '../../src/components/ui/DataTable';
import { exportToExcel, exportToPDF } from '../../src/utils/exportUtils';

const isFreeRecord = (item: any) => {
  return (parseFloat(item.rate) || 0) === 0 && 
         (parseFloat(item.tax_amt) || 0) === 0 && 
         (parseFloat(item.net_amt) || 0) === 0;
};

export default function SaleRegisterReportScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isMobile } = useResponsive();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Filter States
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [createdBy, setCreatedBy] = useState('All');
  const [itemCode, setItemCode] = useState('');
  
  const [users, setUsers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const today = new Date().toLocaleDateString('en-CA');
      setStartDate(today);
      setEndDate(today);
    }, [])
  );

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users', { params: { status: 'Active' } });
      setUsers(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/items', { params: { active_only: 'true' } });
      setItems(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { startDate, endDate, created_by: createdBy };
      if (itemCode) params.item_code = itemCode;

      const response = await api.get('/reports/sale-register', { params });
      setData(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch Sale Register Report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, itemCode, createdBy]);

  const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.net_amt) || 0), 0);
  const totalFreeQty = data.reduce((sum, item) => sum + (isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0), 0);
  const totalQty = data.reduce((sum, item) => sum + (!isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0), 0);
  const totalTax = data.reduce((sum, item) => sum + (parseFloat(item.tax_amt) || 0), 0);

  const handlePrint = () => {
    const head = [['Date', 'Bill No', 'Created By', 'Party Name', 'Item', 'Free Qty', 'Qty', 'Rate', 'Tax', 'Amount']];
    const body = data.map(item => [
      formatDisplayDate(item.vouch_date),
      `${item.book_code}-${item.vouch_no}`,
      item.created_by_name || '-',
      item.party_name,
      item.item_name,
      isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0,
      !isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0,
      parseFloat(item.rate || 0),
      (parseFloat(item.tax_amt) || 0).toFixed(2),
      (parseFloat(item.net_amt) || 0).toFixed(2)
    ]);
    const foot = [['Total', '', '', '', '', totalFreeQty.toString(), totalQty.toString(), '', totalTax.toFixed(2), totalAmount.toFixed(2)]];
    
    exportToPDF('Sale Register Report', `From: ${startDate} To: ${endDate}`, head, body, foot);
  };

  const handleExcelExport = () => {
    const exportData = data.map(item => ({
      'Date': formatDisplayDate(item.vouch_date),
      'Bill No': `${item.book_code}-${item.vouch_no}`,
      'Created By': item.created_by_name || '-',
      'Party Name': item.party_name,
      'Item': item.item_name,
      'Free Qty': isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0,
      'Qty': !isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0,
      'Rate': parseFloat(item.rate) || 0,
      'Tax': parseFloat(item.tax_amt) || 0,
      'Amount': parseFloat(item.net_amt) || 0
    }));

    exportData.push({
      'Date': 'Total',
      'Bill No': '',
      'Created By': '',
      'Party Name': '',
      'Item': '',
      'Free Qty': totalFreeQty,
      'Qty': totalQty,
      'Rate': '',
      'Tax': totalTax,
      'Amount': totalAmount
    } as any);

    exportToExcel(exportData, 'Sale Register', `Sale_Register_${startDate}_to_${endDate}.xlsx`);
  };

  const columns = useMemo(
    () => [
      { header: 'Date', render: (row: any) => <Typography>{row.vouch_date ? formatDisplayDate(row.vouch_date) : ''}</Typography> },
      { header: 'Bill No', render: (row: any) => <Typography style={{ fontWeight: '600' }} color={colors.info}>{`${row.book_code}-${row.vouch_no}`}</Typography> },
      { header: 'Created By', field: 'created_by_name' },
      { header: 'Party Name', field: 'party_name' },
      { header: 'Item Name', field: 'item_name' },
      { header: 'Free Qty', render: (row: any) => <Typography color={colors.warning} style={{ fontWeight: '700' }}>{isFreeRecord(row) ? row.qty : '-'}</Typography> },
      { header: 'Qty', render: (row: any) => <Typography>{!isFreeRecord(row) ? row.qty : '-'}</Typography> },
      { header: 'Rate', field: 'rate' },
      { header: 'Tax', render: (row: any) => <Typography>{parseFloat(row.tax_amt || 0).toFixed(2)}</Typography> },
      { header: 'Net Amount', render: (row: any) => <Typography style={{ fontWeight: '700' }}>{parseFloat(row.net_amount || row.net_amt || 0).toFixed(2)}</Typography> },
    ],
    [colors]
  );

  return (
    <ScreenContainer>
      <Header 
        title="Sale Register" 
        subtitle="View detailed sale item report" 
        showBack 
      />

      <ReportFilterBar>
        <FilterField label="From Date">
          <DatePicker 
            value={startDate} 
            onChange={setStartDate} 
          />
        </FilterField>
        <FilterField label="To Date">
          <DatePicker 
            value={endDate} 
            onChange={setEndDate} 
          />
        </FilterField>
        <FilterField label="Item">
          <Select
            value={itemCode}
            onChange={setItemCode}
            icon={<Ionicons name="cube-outline" size={18} color={colors.textSecondary} />}
            options={[
              { label: 'All Items', value: '' },
              ...items.map(i => ({ label: i.item_name, value: i.item_code }))
            ]}
          />
        </FilterField>
        <FilterField label="Created By">
          <Select
            value={createdBy}
            onChange={setCreatedBy}
            icon={<Ionicons name="person-outline" size={18} color={colors.textSecondary} />}
            options={[
              { label: 'All Users', value: 'All' },
              ...users.map(u => ({ label: u.name, value: u.id }))
            ]}
          />
        </FilterField>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Button title="Excel" variant="secondary" icon={<Ionicons name="list-outline" size={18} color={colors.success} />} onPress={handleExcelExport} />
          <Button title="PDF" variant="secondary" icon={<Ionicons name="download-outline" size={18} color={colors.info} />} onPress={handlePrint} />
        </View>
      </ReportFilterBar>

      {/* Summary Cards */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.md, marginBottom: spacing.md }}>
        <Card style={{ flex: 1, backgroundColor: colors.success, padding: spacing.md }}>
          <Typography variant="caption" color={colors.white}>Total Free Qty</Typography>
          <Typography variant="h2" color={colors.white} style={{ marginTop: spacing.xs }}>{totalFreeQty}</Typography>
        </Card>
        <Card style={{ flex: 1, backgroundColor: colors.primary, padding: spacing.md }}>
          <Typography variant="caption" color={colors.white}>Total Qty</Typography>
          <Typography variant="h2" color={colors.white} style={{ marginTop: spacing.xs }}>{totalQty}</Typography>
        </Card>
        <Card style={{ flex: 1, backgroundColor: colors.info, padding: spacing.md }}>
          <Typography variant="caption" color={colors.white}>Total Tax</Typography>
          <Typography variant="h2" color={colors.white} style={{ marginTop: spacing.xs }}>₹{totalTax.toFixed(2)}</Typography>
        </Card>
        <Card style={{ flex: 1, backgroundColor: colors.success, padding: spacing.md }}>
          <Typography variant="caption" color={colors.white}>Total Amount</Typography>
          <Typography variant="h2" color={colors.white} style={{ marginTop: spacing.xs }}>₹{totalAmount.toFixed(2)}</Typography>
        </Card>
      </View>

      {error ? <Typography color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{error}</Typography> : null}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); fetchReport(); }}
        keyExtractor={(item, idx) => `${item.book_code}-${item.vouch_no}-${idx}`}
      />

      {/* Bottom Side Total Amount */}
      {!loading && data.length > 0 && (
        <View style={{ 
          padding: spacing.lg, 
          backgroundColor: colors.surface, 
          borderTopWidth: 1, 
          borderTopColor: colors.border, 
          marginHorizontal: spacing.md,
          marginBottom: spacing.lg,
          borderRadius: radius.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: spacing.md
        }}>
          <View style={{ alignItems: isMobile ? 'flex-start' : 'center' }}>
             <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Free Qty</Typography>
             <Typography color={colors.warning} style={{ fontWeight: '800', fontSize: 24 }}>{totalFreeQty}</Typography>
          </View>
          <View style={{ alignItems: isMobile ? 'flex-start' : 'center' }}>
             <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Qty</Typography>
             <Typography color={colors.primary} style={{ fontWeight: '800', fontSize: 24 }}>{totalQty}</Typography>
          </View>
          <View style={{ alignItems: isMobile ? 'flex-start' : 'center' }}>
             <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Tax</Typography>
             <Typography color={colors.info} style={{ fontWeight: '800', fontSize: 24 }}>₹{totalTax.toFixed(2)}</Typography>
          </View>
          <View style={{ alignItems: isMobile ? 'flex-start' : 'flex-end' }}>
             <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Net Amount</Typography>
             <Typography color={colors.success} style={{ fontWeight: '800', fontSize: 28 }}>₹{totalAmount.toFixed(2)}</Typography>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}
