import { formatDisplayDate } from '../../src/utils/dateUtils';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Typography from '../../src/components/ui/Typography';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import DatePicker from '../../src/components/ui/DatePicker';
import { useFocusEffect } from 'expo-router';
import { ReportFilterBar, FilterField } from '../../src/components/report/ReportFilterBar';
import { useTheme } from '../../src/theme/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import api from '../../src/config/api';
import Header from '../../src/components/ui/Header';
import DataTable from '../../src/components/ui/DataTable';
import { exportToExcel, exportToPDF } from '../../src/utils/exportUtils';

export default function PurchaseRegisterReportScreen() {
  const { colors, spacing, radius } = useTheme();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Filter States
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  useFocusEffect(
    useCallback(() => {
      const today = new Date().toLocaleDateString('en-CA');
      setStartDate(today);
      setEndDate(today);
    }, [])
  );

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { startDate, endDate };
      const response = await api.get('/reports/purchase-register', { params });
      setData(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch Purchase Register Report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.net_amt) || 0), 0);

  const handlePrint = () => {
    const head = [['Date', 'Bill No', 'Party Name', 'Item', 'Qty', 'Rate', 'Tax', 'Amount']];
    const body = data.map(item => [
      formatDisplayDate(item.vouch_date),
      `${item.book_code}-${item.vouch_no}`,
      item.party_name,
      item.item_name,
      parseFloat(item.qty || 0),
      parseFloat(item.rate || 0),
      (parseFloat(item.tax_amt) || 0).toFixed(2),
      (parseFloat(item.net_amt) || 0).toFixed(2)
    ]);
    const foot = [['', '', '', '', '', '', 'Total:', totalAmount.toFixed(2)]];
    
    exportToPDF('Purchase Register Report', `From: ${startDate} To: ${endDate}`, head, body, foot);
  };

  const handleExcelExport = () => {
    const exportData = data.map(item => ({
      'Date': formatDisplayDate(item.vouch_date),
      'Bill No': `${item.book_code}-${item.vouch_no}`,
      'Party Name': item.party_name,
      'Item': item.item_name,
      'Qty': parseFloat(item.qty || 0),
      'Rate': parseFloat(item.rate || 0),
      'Tax': parseFloat(item.tax_amt) || 0,
      'Amount': parseFloat(item.net_amt) || 0
    }));

    exportData.push({
      'Date': 'Total',
      'Bill No': '',
      'Party Name': '',
      'Item': '',
      'Qty': '',
      'Rate': '',
      'Tax': '',
      'Amount': totalAmount
    } as any);

    exportToExcel(exportData, 'Purchase Register', `Purchase_Register_${startDate}_to_${endDate}.xlsx`);
  };

  const columns = useMemo(
    () => [
      { header: 'Date', render: (row: any) => <Typography>{row.vouch_date ? formatDisplayDate(row.vouch_date) : ''}</Typography> },
      { header: 'Bill No', render: (row: any) => <Typography style={{ fontWeight: '600' }} color={colors.info}>{`${row.book_code}-${row.vouch_no}`}</Typography> },
      { header: 'Party Name', field: 'party_name' },
      { header: 'Item Name', field: 'item_name' },
      { header: 'Qty', field: 'qty' },
      { header: 'Rate', field: 'rate' },
      { header: 'Tax', render: (row: any) => <Typography>{parseFloat(row.tax_amt || 0).toFixed(2)}</Typography> },
      { header: 'Net Amount', render: (row: any) => <Typography style={{ fontWeight: '700' }}>{parseFloat(row.net_amount || row.net_amt || 0).toFixed(2)}</Typography> },
    ],
    [colors]
  );

  return (
    <ScreenContainer>
      <Header 
        title="Purchase Register" 
        subtitle="View detailed purchase item report" 
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
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Button title="Excel" variant="secondary" icon={<Ionicons name="list-outline" size={18} color={colors.success} />} onPress={handleExcelExport} />
          <Button title="PDF" variant="secondary" icon={<Ionicons name="download-outline" size={18} color={colors.info} />} onPress={handlePrint} />
        </View>
      </ReportFilterBar>

      {/* Summary Cards */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.md, marginBottom: spacing.md }}>
        <Card style={{ flex: 1, backgroundColor: colors.warning, padding: spacing.md }}>
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
    </ScreenContainer>
  );
}
