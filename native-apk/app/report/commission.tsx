import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Typography from '../../src/components/ui/Typography';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
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
import { formatDisplayDate } from '../../src/utils/dateUtils';

export default function CommissionReportScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isMobile } = useResponsive();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Filter States
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [technicianId, setTechnicianId] = useState('All');
  
  const [technicians, setTechnicians] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const today = new Date().toLocaleDateString('en-CA');
      setStartDate(today);
      setEndDate(today);
    }, [])
  );

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/users', { params: { status: 'Active', role: 'Technician' } });
      setTechnicians(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch technicians:', err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { startDate, endDate };
      if (technicianId && technicianId !== 'All') params.technicianId = technicianId;

      const response = await api.get('/reports/commission', { params });
      setData(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch Commission Report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, technicianId]);

  const totalCommission = data.reduce((sum, item) => sum + (parseFloat(item.tot_commission || item.commission_amount || 0)), 0);

  const handlePrint = () => {
    const head = [['Date', 'Bill No', 'Technician', 'Item Name', 'Commission']];
    const body = data.map(item => [
      formatDisplayDate(item.vouch_date),
      `${item.book_code}-${item.vouch_no}`,
      item.technician_name || '-',
      item.item_name,
      parseFloat(item.tot_commission || item.commission_amount || 0).toFixed(2)
    ]);
    const foot = [['Total', '', '', '', totalCommission.toFixed(2)]];
    
    exportToPDF('Commission Report', `From: ${startDate} To: ${endDate}`, head, body, foot);
  };

  const handleExcelExport = () => {
    const exportData = data.map(item => ({
      'Date': formatDisplayDate(item.vouch_date),
      'Bill No': `${item.book_code}-${item.vouch_no}`,
      'Technician': item.technician_name || '-',
      'Item Name': item.item_name,
      'Commission': parseFloat(item.tot_commission || item.commission_amount || 0).toFixed(2)
    }));

    exportData.push({
      'Date': 'Total',
      'Bill No': '',
      'Technician': '',
      'Item Name': '',
      'Commission': totalCommission.toFixed(2)
    } as any);

    exportToExcel(exportData, 'Commission_Report', `Commission_${startDate}_to_${endDate}.xlsx`);
  };

  const columns = useMemo(
    () => [
      { header: 'Date', render: (row: any) => <Typography>{row.vouch_date ? formatDisplayDate(row.vouch_date) : ''}</Typography> },
      { header: 'Bill No', render: (row: any) => <Typography style={{ fontWeight: '600' }} color={colors.info}>{`${row.book_code}-${row.vouch_no}`}</Typography> },
      { header: 'Technician', field: 'technician_name' },
      { header: 'Item Name', field: 'item_name' },
      { header: 'Commission', render: (row: any) => <Typography style={{ fontWeight: '700' }}>₹{parseFloat(row.tot_commission || row.commission_amount || 0).toFixed(2)}</Typography> },
    ],
    [colors]
  );

  return (
    <ScreenContainer>
      <Header 
        title="Commission Report" 
        subtitle="View commission earnings details" 
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
        <FilterField label="Technician">
          <Select
            value={technicianId}
            onChange={setTechnicianId}
            icon={<Ionicons name="person-outline" size={18} color={colors.textSecondary} />}
            options={[
              { label: 'All Technicians', value: 'All' },
              ...technicians.map(t => ({ label: t.name, value: t.id }))
            ]}
          />
        </FilterField>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Button title="Excel" variant="secondary" icon={<Ionicons name="list-outline" size={18} color={colors.success} />} onPress={handleExcelExport} />
          <Button title="PDF" variant="secondary" icon={<Ionicons name="download-outline" size={18} color={colors.info} />} onPress={handlePrint} />
        </View>
      </ReportFilterBar>

      {error ? <Typography color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{error}</Typography> : null}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); fetchReport(); }}
        keyExtractor={(item, idx) => `${item.book_code}-${item.vouch_no}-${idx}`}
      />

      {/* Bottom Side Total Commission */}
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
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: spacing.md
        }}>
          <View style={{ alignItems: 'flex-end' }}>
             <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Commission</Typography>
             <Typography color={colors.success} style={{ fontWeight: '800', fontSize: 28 }}>₹{totalCommission.toFixed(2)}</Typography>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({});
