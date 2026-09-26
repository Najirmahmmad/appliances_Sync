import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Typography from '../../src/components/ui/Typography';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import Select from '../../src/components/ui/Select';
import { ReportFilterBar, FilterField } from '../../src/components/report/ReportFilterBar';
import { useTheme } from '../../src/theme/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import api from '../../src/config/api';
import Header from '../../src/components/ui/Header';
import DataTable from '../../src/components/ui/DataTable';
import { exportToExcel, exportToPDF } from '../../src/utils/exportUtils';
import { formatDisplayDate } from '../../src/utils/dateUtils';

export default function CurrentStockReportScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isMobile } = useResponsive();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Filter States
  const [technicianId, setTechnicianId] = useState('All');
  const [technicians, setTechnicians] = useState<any[]>([]);

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/users', { params: { status: 'Active', role: 'Technician' } });
      setTechnicians(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch technicians:', err);
    }
  };

  const fetchCurrentStock = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (technicianId && technicianId !== 'All') params.technicianId = technicianId;

      const response = await api.get('/reports/current-stock', { params });
      setData(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch current stock report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    fetchCurrentStock();
  }, [technicianId]);

  const totalQty = data.reduce((sum, item) => sum + parseFloat(item.current_qty || 0), 0);

  const handlePrint = () => {
    const head = [['Item Code', 'Item Name', 'Current Qty']];
    const body = data.map(item => [
      item.item_code,
      item.item_name,
      parseFloat(item.current_qty) || 0
    ]);
    const foot = [['Total', '', totalQty.toString()]];
    
    exportToPDF('Current Stock Report', `Location: ${technicianId === 'All' ? 'Main Warehouse' : technicians.find(t => t.id === technicianId)?.name || 'Technician'}`, head, body, foot);
  };

  const handleExcelExport = () => {
    const exportData = data.map(item => ({
      'Item Code': item.item_code,
      'Item Name': item.item_name,
      'Current Qty': parseFloat(item.current_qty) || 0
    }));

    exportData.push({
      'Item Code': 'Total',
      'Item Name': '',
      'Current Qty': totalQty
    });

    exportToExcel(exportData, 'Current_Stock', `Current_Stock_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const columns = useMemo(
    () => [
      { header: 'Item Code', field: 'item_code' },
      { header: 'Item Name', field: 'item_name' },
      {
        header: 'Current Stock',
        render: (row: any) => (
          <Typography style={[styles.stockText, parseFloat(row.current_qty) <= 0 && styles.outOfStock]}>
            {row.current_qty}
          </Typography>
        ),
      },
    ],
    []
  );

  return (
    <ScreenContainer>
      <Header title="Current Stock Report" subtitle="Real-time warehouse inventory levels" showBack />

      <ReportFilterBar>
        <FilterField label="Location / Technician">
          <Select
            value={technicianId}
            onChange={setTechnicianId}
            icon={<Ionicons name="person-outline" size={18} color={colors.textSecondary} />}
            options={[
              { label: 'Main Warehouse', value: 'All' },
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
        onRefresh={() => { setRefreshing(true); fetchCurrentStock(); }}
        keyExtractor={(item, idx) => `${item.item_code}-${idx}`}
      />

      {/* Bottom Side Total Qty */}
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
             <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Quantity</Typography>
             <Typography color={colors.primary} style={{ fontWeight: '800', fontSize: 28 }}>{totalQty.toFixed(2)}</Typography>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stockText: { fontWeight: '700', color: '#16a34a' },
  outOfStock: { color: '#dc2626' },
});
