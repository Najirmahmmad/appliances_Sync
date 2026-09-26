import { formatDisplayDate } from '../../src/utils/dateUtils';
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Typography from '../../src/components/ui/Typography';
import Card from '../../src/components/ui/Card';
import { useTheme } from '../../src/theme/ThemeContext';
import api from '../../src/config/api';
import Header from '../../src/components/ui/Header';
import DataTable from '../../src/components/ui/DataTable';

export default function StockTransferReturnReportScreen() {
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/reports/stock-transfer-return');
      setData(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch Stock Transfer Return Report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const totalQty = data.reduce((sum, item) => sum + parseFloat(item.current_qty || 0), 0);

      const columns = useMemo(
    () => [
      { header: 'Date', render: (row: any) => <Typography>{row.vouch_date ? formatDisplayDate(row.vouch_date) : ''}</Typography> },
      { header: 'Return No', render: (row: any) => <Typography>{`${row.book_code}-${row.vouch_no}`}</Typography> },
      { header: 'Item Name', field: 'item_name' },
      { header: 'Qty', field: 'qty' },
    ],
    []
  );

  return (
    <ScreenContainer>
      <Header title="Stock Transfer Return Report" subtitle="View report details" showBack />

      

      {error ? <Typography color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{error}</Typography> : null}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); fetchReport(); }}
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



