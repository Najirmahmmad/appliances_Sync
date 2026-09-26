import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Typography from '../../src/components/ui/Typography';
import Card from '../../src/components/ui/Card';
import { useTheme } from '../../src/theme/ThemeContext';
import api from '../../src/config/api';
import Header from '../../src/components/ui/Header';
import DataTable from '../../src/components/ui/DataTable';

export default function CurrentStockReportScreen() {
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchCurrentStock = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/reports/current-stock');
      setData(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch current stock report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCurrentStock();
  }, []);

  const totalQty = data.reduce((sum, item) => sum + parseFloat(item.current_qty || 0), 0);

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

      <Card style={{ margin: spacing.md, backgroundColor: colors.primary, alignItems: 'center', padding: spacing.lg }}>
        <Typography color={colors.white} variant="secondary">Total Stock Items Quantity</Typography>
        <Typography color={colors.white} variant="h2" style={{ marginTop: spacing.xs }}>{totalQty.toFixed(2)}</Typography>
      </Card>

      {error ? <Typography color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{error}</Typography> : null}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); fetchCurrentStock(); }}
        keyExtractor={(item, idx) => `${item.item_code}-${idx}`}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  summaryCard: {
    backgroundColor: '#0284c7',
    padding: 16,
    margin: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: { color: '#e0f2fe', fontSize: 13, fontWeight: '500' },
  summaryVal: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  errorMsg: { color: '#dc2626', paddingHorizontal: 16, marginBottom: 8, fontWeight: '500' },
  stockText: { fontWeight: '700', color: '#16a34a' },
  outOfStock: { color: '#dc2626' },
});
