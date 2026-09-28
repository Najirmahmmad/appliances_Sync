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
import { viewOrSharePdf, shareViaWhatsApp } from '../../src/utils/platformActions';

export default function SaleAMCListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || '';
  const { colors, spacing } = useTheme();

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState('50');
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchSales = async (currentPage = page, currentLimit = limit) => {
    setLoading(true);
    setError('');
    try {
      const params: any = { 
        book_code: 'SAM',
        page: currentPage,
        limit: currentLimit
      };
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/sales/headers', { params });
      setSales(response.data.data || []);
      if (response.data.pagination) {
        setTotalRecords(response.data.pagination.total);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch sales list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSales();
    }, [])
  );

  const handleDelete = (bookCode: string, vouchNo: number) => {
    Alert.alert('Delete AMC Invoice', `Are you sure you want to delete AMC invoice ${bookCode}-${vouchNo}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/sales/${bookCode}/${vouchNo}`);
            setSuccess('AMC Invoice deleted successfully');
            fetchSales();
          } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete sale');
          }
        },
      },
    ]);
  };

  const handlePrintSale = async (sale: any) => {
    try {
      const response = await api.get(`/sales/${sale.book_code}/${sale.vouch_no}`);
      const { header, items, company } = response.data.data;
      
      const doc = generateSaleInvoicePDF(header, items, company);
      const fileName = `Invoice_${header.book_code}-${header.vouch_no}.pdf`;
      await viewOrSharePdf(doc, fileName);
    } catch (err) {
      console.error('Print API error', err);
      Alert.alert('Error', 'Failed to generate invoice');
    }
  };

  const handleWhatsAppShare = async (sale: any) => {
    try {
      const response = await api.get(`/sales/${sale.book_code}/${sale.vouch_no}`);
      const { header, items, company } = response.data.data;
      
      const doc = generateSaleInvoicePDF(header, items, company);
      const pdfBase64 = doc.output('datauristring');
      const fileName = `Invoice_${header.book_code}-${header.vouch_no}.pdf`;
      
      const uploadResponse = await api.post(`/upload/invoice`, {
        pdfBase64,
        fileName
      });
      const pdfUrl = uploadResponse.data.url;
      
      const rawPhone = header.party_phone || '';
      let cleanPhone = rawPhone.replace(/\D/g, '');
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      
      const message = `Dear ${header.party_name},\n\nPlease find attached the invoice (${header.book_code}-${header.vouch_no}) for your recent purchase. You can download or view it here: ${pdfUrl}\n\nThank you for your business!`;
      
      await shareViaWhatsApp(cleanPhone, message);
    } catch (err) {
      console.error('WhatsApp Share Error', err);
      Alert.alert('Error', 'Failed to share on WhatsApp');
    }
  };

  const columns = useMemo(
    () => [
      {
        header: 'Invoice No',
        render: (row: any) => <Typography color={colors.info} style={{ fontWeight: '700' }}>{`${row.book_code}-${row.vouch_no}`}</Typography>,
      },
      {
        header: 'Date',
        render: (row: any) => (
          <Typography variant="body" color={colors.textPrimary}>
            {formatDisplayDate(row.vouch_dt || row.vouch_date)}
          </Typography>
        ),
      },
      { header: 'Customer', field: 'party_name' },
      {
        header: 'Volume',
        field: 'total_qty',
      },
      {
        header: 'Net Amount',
        render: (row: any) => <Typography color={colors.success} style={{ fontWeight: '700' }}>₹{parseFloat(row.net_amount || 0).toFixed(2)}</Typography>,
      },
      { header: 'Payment Mode', field: 'payment_mode' },
      { header: 'Created By', field: 'created_by_name' },
      {
        header: 'Actions',
        render: (row: any) => (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {userRole === 'admin' && (
              <TouchableOpacity onPress={() => router.push({ pathname: '/transaction/sale-amc', params: { bookCode: row.book_code, vouchNo: row.vouch_no } })}>
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
              <TouchableOpacity onPress={() => handleDelete(row.book_code, row.vouch_no)}>
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
      <Header title="Sales AMC List" subtitle="View & manage AMC invoices" showBack />

      <Card style={{ margin: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, maxWidth: 400 }}>
        <Input
          placeholder="Search Party, Phone, Invoice No..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={fetchSales}
          icon={<Ionicons name="search-outline" size={20} color={colors.textSecondary} />}
        />
      </View>
        <Button 
          title="New AMC Invoice" 
          onPress={() => router.push('/transaction/sale-amc')} 
          icon={<Ionicons name="add" size={20} color={colors.white} />} 
        />
      </Card>

      {error ? <Typography color={colors.error} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{error}</Typography> : null}
      {success ? <Typography color={colors.success} style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, fontWeight: '500' }}>{success}</Typography> : null}

      <DataTable
        columns={columns}
        data={sales}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchSales(1, limit);
        }}
        keyExtractor={(item, idx) => `${item.book_code}-${item.vouch_no}-${idx}`}
        serverPagination={true}
        currentPage={page}
        pageSize={limit}
        totalRecords={totalRecords}
        onPageChange={(newPage) => {
          setPage(newPage);
          fetchSales(newPage, limit);
        }}
        onPageSizeChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
          fetchSales(1, newLimit);
        }}
      />
    </ScreenContainer>
  );
}
