import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

export default function PurchaseListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || '';
  const { colors, spacing } = useTheme();

  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState('50');
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchPurchases = async (currentPage = page, currentLimit = limit) => {
    setLoading(true);
    setError('');
    try {
      const params: any = { 
        book_code: 'PU',
        page: currentPage,
        limit: currentLimit
      };
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/purchase/headers', { params });
      setPurchases(response.data.data || []);
      if (response.data.pagination) {
        setTotalRecords(response.data.pagination.total);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch purchase list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleDelete = (vouchNo: string) => {
    Alert.alert('Delete Purchase', `Are you sure you want to delete purchase invoice ${vouchNo}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/purchases/${vouchNo}`);
            fetchPurchases();
          } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete purchase');
          }
        },
      },
    ]);
  };

  const handlePrintSale = async (row: any) => {
    try {
      const response = await api.get(`/purchases/${row.vouch_no}`);
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
      const response = await api.get(`/purchases/${row.vouch_no}`);
      const { header, items, company } = response.data.data;
      
      if (Platform.OS === 'web') {
        const doc = generateSaleInvoicePDF(header, items, company);
        const pdfBase64 = doc.output('datauristring');
        const fileName = `Invoice_${header.vouch_no}.pdf`;
        
        const uploadResponse = await api.post(`/upload/invoice`, {
          pdfBase64,
          fileName
        });
        const pdfUrl = uploadResponse.data.url;
        
        const rawPhone = header.party_phone || '';
        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
        
        const message = `Dear ${header.party_name},\n\nPlease find attached the invoice (${header.vouch_no}) for your recent transaction. You can download or view it here: ${pdfUrl}\n\nThank you for your business!`;
        
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
      { header: 'Voucher No', render: (row: any) => <Typography color={colors.info} style={{ fontWeight: '700' }}>{`${row.book_code}-${row.vouch_no}`}</Typography> },
      {
        header: 'Date',
        render: (row: any) => (
          <Typography variant="body" color={colors.textPrimary}>
            {formatDisplayDate(row.vouch_dt || row.vouch_date)}
          </Typography>
        ),
      },
      { header: 'Supplier / Party', field: 'party_name' },
      { header: 'Net Amount', render: (row: any) => <Typography color={colors.success} style={{ fontWeight: '700' }}>₹{parseFloat(row.net_amount || 0).toFixed(2)}</Typography> },
      {
        header: 'Actions',
        render: (row: any) => (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {userRole === 'admin' && (
              <TouchableOpacity onPress={() => router.push({ pathname: '/transaction/purchase', params: { vouchNo: row.vouch_no } })}>
                <Ionicons name="eye-outline" size={20} color={colors.info} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handlePrintSale(row)}>
              <Ionicons name="print-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleWhatsAppShare(row)}>
              <Ionicons name="logo-whatsapp" size={20} color={colors.success} />
            </TouchableOpacity>
            {userRole === 'admin' && (
              <TouchableOpacity onPress={() => handleDelete(row.vouch_no)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ),
      },
    ],
    [userRole, colors, spacing]
  );

  return (
    <ScreenContainer>
      <Header title="Purchase Invoice List" subtitle="Manage inventory purchases" showBack />

      <Card style={{ margin: spacing.md, gap: spacing.md }}>
        <Input
          placeholder="Search Supplier, Invoice No..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={fetchPurchases}
          icon={<Ionicons name="search-outline" size={20} color={colors.textSecondary} />}
        />
        <Button 
          title="New Purchase" 
          onPress={() => router.push('/transaction/purchase')} 
          icon={<Ionicons name="add" size={20} color={colors.white} />} 
        />
      </Card>

      {error ? <Typography color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{error}</Typography> : null}

      <DataTable
        columns={columns}
        data={purchases}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchPurchases(1, limit);
        }}
        keyExtractor={(item, idx) => `${item.book_code}-${item.vouch_no}-${idx}`}
        serverPagination={true}
        currentPage={page}
        pageSize={limit}
        totalRecords={totalRecords}
        onPageChange={(newPage) => {
          setPage(newPage);
          fetchPurchases(newPage, limit);
        }}
        onPageSizeChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
          fetchPurchases(1, newLimit);
        }}
      />
    </ScreenContainer>
  );
}
