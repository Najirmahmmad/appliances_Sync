import { formatDisplayDate } from '../../src/utils/dateUtils';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
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

export default function SaleSummaryReportScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isMobile } = useResponsive();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Filter States
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('All');
  const [createdBy, setCreatedBy] = useState('All');
  
  const [users, setUsers] = useState<any[]>([]);

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

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { startDate, endDate, payment_mode: paymentMode, created_by: createdBy };
      const response = await api.get('/reports/sale-summary', { params });
      setData(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch Sale Summary Report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, paymentMode, createdBy]);

  const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.net_amount) || 0), 0);

  const handlePrint = () => {
    const head = [['Date', 'Bill No', 'Party Name', 'GST No', 'Payment', 'Amount', 'Created By']];
    const body = data.map(item => [
      formatDisplayDate(item.vouch_date),
      `${item.book_code}-${item.vouch_no}`,
      item.party_name,
      item.party_gst || '-',
      item.payment_mode || 'Cash',
      (parseFloat(item.net_amount) || 0).toFixed(2),
      item.created_by_name || '-'
    ]);
    const foot = [['', '', '', '', 'Total:', totalAmount.toFixed(2), '']];
    
    exportToPDF('Sale Summary Report', `From: ${startDate} To: ${endDate}`, head, body, foot);
  };

  const handleExcelExport = () => {
    const exportData = data.map(item => ({
      'Date': formatDisplayDate(item.vouch_date),
      'Bill No': `${item.book_code}-${item.vouch_no}`,
      'Party Name': item.party_name,
      'GST No': item.party_gst || '-',
      'Payment Mode': item.payment_mode || 'Cash',
      'Amount': parseFloat(item.net_amount) || 0,
      'Created By': item.created_by_name || '-'
    }));

    exportData.push({
      'Date': 'Total',
      'Bill No': '',
      'Party Name': '',
      'GST No': '',
      'Payment Mode': '',
      'Amount': totalAmount,
      'Created By': ''
    });

    exportToExcel(exportData, 'Sale Summary', `Sale_Summary_${startDate}_to_${endDate}.xlsx`);
  };

  const columns = useMemo(
    () => [
      { header: 'Date', render: (row: any) => <Typography>{row.vouch_date ? formatDisplayDate(row.vouch_date) : ''}</Typography> },
      { header: 'Bill No', render: (row: any) => <Typography style={{ fontWeight: '600' }} color={colors.info}>{`${row.book_code}-${row.vouch_no}`}</Typography> },
      { header: 'Party Name', field: 'party_name' },
      { header: 'GST No', render: (row: any) => <Typography>{row.party_gst || '-'}</Typography> },
      { header: 'Payment', render: (row: any) => (
          <View style={{ backgroundColor: (row.payment_mode || 'Cash') === 'Cash' ? colors.success + '20' : colors.info + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start' }}>
            <Typography variant="caption" color={(row.payment_mode || 'Cash') === 'Cash' ? colors.success : colors.info} style={{ fontWeight: '600' }}>
              {row.payment_mode || 'Cash'}
            </Typography>
          </View>
        ) 
      },
      { header: 'Amount', render: (row: any) => <Typography style={{ fontWeight: '700' }}>₹{parseFloat(row.net_amount || 0).toFixed(2)}</Typography> },
      { header: 'Created By', field: 'created_by_name' },
    ],
    [colors]
  );

  return (
    <ScreenContainer>
      <Header 
        title="Sale Summary" 
        subtitle="View sale summary details" 
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
        <FilterField label="Payment Mode">
          <Select
            value={paymentMode}
            onChange={setPaymentMode}
            icon={<Ionicons name="card-outline" size={18} color={colors.textSecondary} />}
            options={[
              { label: 'All', value: 'All' },
              { label: 'Cash', value: 'Cash' },
              { label: 'Online', value: 'Online' },
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
          alignItems: 'flex-end',
          marginHorizontal: spacing.md,
          marginBottom: spacing.lg,
          borderRadius: radius.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
             <Typography variant="h3" color={colors.textSecondary} style={{ fontWeight: '600' }}>
               Total Amount:
             </Typography>
             <Typography color={colors.success} style={{ fontWeight: '800', fontSize: 28 }}>
               ₹{totalAmount.toFixed(2)}
             </Typography>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}
