import React, { useState, useEffect, useMemo , useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDisplayDate } from '../../src/utils/dateUtils';
import api from '../../src/config/api';
import Header from '../../src/components/ui/Header';
import DataTable from '../../src/components/ui/DataTable';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import Typography from '../../src/components/ui/Typography';
import { generateSaleInvoicePDF } from '../../src/utils/generateInvoicePDF';

export default function StockReturnListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState('50');
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchTransfers = async (currentPage = page, currentLimit = limit) => {
    setLoading(true);
    setError('');
    try {
      const params: any = { 
        book_code: 'STR',
        page: currentPage,
        limit: currentLimit
      };
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/stock/transfers', { params });
      setTransfers(response.data.data || []);
      if (response.data.pagination) {
        setTotalRecords(response.data.pagination.total);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stock transfer return list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransfers();
    }, [])
  );

  const handleDelete = (bookCode: string, vouchNo: number) => {
    Alert.alert('Delete Stock Transfer Return', `Are you sure you want to delete return ${bookCode}-${vouchNo}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/stock/transfers/${bookCode}/${vouchNo}`);
            fetchTransfers();
          } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete transfer return');
          }
        },
      },
    ]);
  };

  const handlePrintSale = async (row: any) => {
    try {
      const response = await api.get(`/stock/transfers/${row.book_code}/${row.vouch_no}`);
      const { header, items, company } = response.data.data;
      
      if (Platform.OS === 'web') {
        const doc = generateSaleInvoicePDF(header, items, company);
        window.open(doc.output('bloburl'));
      } else {
        Alert.alert('Not Supported', 'PDF generation is currently supported on web only.');
      }
    } catch (err) {
      console.error('Print API error', err);
      Alert.alert('Error', 'Failed to generate invoice');
    }
  };

  const handleWhatsAppShare = async (row: any) => {
    try {
      const response = await api.get(`/stock/transfers/${row.book_code}/${row.vouch_no}`);
      const { header, items, company } = response.data.data;
      
      if (Platform.OS === 'web') {
        const doc = generateSaleInvoicePDF(header, items, company);
        const pdfBase64 = doc.output('datauristring');
        const fileName = `Return_${row.book_code}-${row.vouch_no}.pdf`;
        
        const uploadResponse = await api.post(`/upload/invoice`, {
          pdfBase64,
          fileName
        });
        const pdfUrl = uploadResponse.data.url;
        
        const rawPhone = header.party_phone || '';
        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
        
        const message = `Dear Sir/Madam,\n\nPlease find attached the stock transfer return (${row.book_code}-${row.vouch_no}). You can download or view it here: ${pdfUrl}`;
        
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      } else {
         Alert.alert('Not Supported', 'WhatsApp sharing with PDF is currently supported on web only.');
      }
    } catch (err) {
      console.error('WhatsApp Share Error', err);
      Alert.alert('Error', 'Failed to share on WhatsApp');
    }
  };

  const columns = useMemo(
    () => [
      { header: 'Transfer No', render: (row: any) => <Typography color={colors.info} style={{ fontWeight: '700' }}>{`${row.book_code || 'STR'}-${row.vouch_no}`}</Typography> },
      {
        header: 'Date',
        render: (row: any) => (
          <Typography variant="body" color={colors.textPrimary}>
            {formatDisplayDate(row.vouch_dt || row.vouch_date)}
          </Typography>
        ),
      },
      { header: 'From Dept', field: 'from_dept_name' },
      { header: 'To Dept', field: 'to_dept_name' },
      { header: 'Total Qty', field: 'total_qty' },
      {
        header: 'Actions',
        render: (row: any) => (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {userRole === 'admin' && (
              <TouchableOpacity onPress={() => router.push({ pathname: '/transaction/stock-transfer-return', params: { bookCode: row.book_code, vouchNo: row.vouch_no } })}>
                <Ionicons name="eye-outline" size={20} color={colors.info} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handlePrintSale(row)}>
              <Ionicons name="print-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleWhatsAppShare(row)}>
              <Ionicons name="logo-whatsapp" size={20} color={colors.success} />
            </TouchableOpacity>
            {user?.role?.toLowerCase() === 'admin' && (
              <TouchableOpacity onPress={() => handleDelete(row.book_code, row.vouch_no)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ),
      },
    ],
    [colors]
  );

  return (
    <ScreenContainer>
      <Header title="Stock Transfer Return List" subtitle="Track internal inventory returns" showBack />

      <Card style={{ margin: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, maxWidth: 400 }}>
        <Input
          placeholder="Search Return Voucher..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={() => fetchTransfers(1, limit)}
          icon={<Ionicons name="search-outline" size={20} color={colors.textSecondary} />}
        />
      </View>
        <Button 
          title="New Return Transfer" 
          onPress={() => router.push('/transaction/stock-transfer-return')} 
          icon={<Ionicons name="add" size={20} color={colors.white} />} 
        />
      </Card>

      {error ? <Typography color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{error}</Typography> : null}

      <DataTable
        columns={columns}
        data={transfers}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchTransfers(1, limit);
        }}
        keyExtractor={(item, idx) => `${item.book_code}-${item.vouch_no}-${idx}`}
        serverPagination={true}
        currentPage={page}
        pageSize={limit}
        totalRecords={totalRecords}
        onPageChange={(newPage) => {
          setPage(newPage);
          fetchTransfers(newPage, limit);
        }}
        onPageSizeChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
          fetchTransfers(1, newLimit);
        }}
      />
    </ScreenContainer>
  );
}
