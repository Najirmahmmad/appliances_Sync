import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Typography from './Typography';
import Card from './Card';
import Select from './Select';

export interface Column<T> {
  header: string;
  field?: keyof T | string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  serverPagination?: boolean;
  currentPage?: number;
  pageSize?: string;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: string) => void;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  keyExtractor,
  emptyMessage = 'No records found.',
  onRefresh,
  refreshing = false,
  serverPagination = false,
  currentPage: externalPage,
  pageSize: externalPageSize,
  totalRecords: externalTotalRecords,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const { colors, spacing, radius } = useTheme();

  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState('50');

  const currentPage = serverPagination ? (externalPage || 1) : internalPage;
  const pageSize = serverPagination ? (externalPageSize || '50') : internalPageSize;

  if (loading && (!data || data.length === 0)) {
    return (
      <View style={[styles.loadingContainer, { padding: spacing.xxxl }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Typography variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
          Loading data...
        </Typography>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: colors.surface,
            margin: spacing.lg,
            borderRadius: radius.md,
            borderColor: colors.border,
            padding: spacing.huge,
          },
        ]}
      >
        <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
        <Typography variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md, textAlign: 'center' }}>
          {emptyMessage}
        </Typography>
      </View>
    );
  }

  const numPageSize = parseInt(pageSize, 10);
  const totalRecords = serverPagination ? (externalTotalRecords || 0) : data.length;
  const totalPages = Math.ceil(totalRecords / numPageSize);
  const currentData = serverPagination ? data : data.slice((currentPage - 1) * numPageSize, currentPage * numPageSize);
  const startIndex = totalRecords === 0 ? 0 : (currentPage - 1) * numPageSize + 1;
  const endIndex = Math.min(currentPage * numPageSize, totalRecords);

  const handlePrev = () => {
    if (currentPage > 1) {
      if (serverPagination && onPageChange) onPageChange(currentPage - 1);
      else setInternalPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      if (serverPagination && onPageChange) onPageChange(currentPage + 1);
      else setInternalPage(currentPage + 1);
    }
  };

  const handlePageSizeChange = (val: string) => {
    if (serverPagination && onPageSizeChange) {
      onPageSizeChange(val);
      if (onPageChange) onPageChange(1);
    } else {
      setInternalPageSize(val);
      setInternalPage(1); // Reset to page 1 on page size change
    }
  };

  const pageSizeOptions = [
    { label: '10 / page', value: '10' },
    { label: '20 / page', value: '20' },
    { label: '50 / page', value: '50' },
    { label: '100 / page', value: '100' },
  ];

  const renderPaginationFooter = () => (
    <View style={[styles.paginationContainer, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
      <View style={styles.paginationLeft}>
        <Typography variant="caption" color={colors.textSecondary} style={{ fontWeight: '500' }}>
          Showing {startIndex} to {endIndex} of {totalRecords} records
        </Typography>
      </View>
      <View style={styles.paginationRight}>
        <View style={{ width: 120 }}>
          <Select 
            value={pageSize} 
            onChange={handlePageSizeChange} 
            options={pageSizeOptions}
          />
        </View>
        <TouchableOpacity 
          style={[styles.pageButton, { borderColor: colors.border }, currentPage === 1 && { opacity: 0.5 }]} 
          onPress={handlePrev} 
          disabled={currentPage === 1}
        >
          <Typography color={colors.textSecondary}>Prev</Typography>
        </TouchableOpacity>
        <Typography variant="caption" color={colors.textSecondary} style={{ marginHorizontal: 8 }}>
          Page {currentPage} of {totalPages || 1}
        </Typography>
        <TouchableOpacity 
          style={[styles.pageButton, { borderColor: colors.border }, currentPage === totalPages && { opacity: 0.5 }]} 
          onPress={handleNext} 
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <Typography color={colors.textSecondary}>Next</Typography>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
    <FlatList
      data={currentData}
      keyExtractor={keyExtractor}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={[styles.listContainer, { padding: spacing.md, paddingBottom: spacing.md }]}
      renderItem={({ item, index }) => {
        const absoluteIndex = (currentPage - 1) * numPageSize + index;
        return (
          <Card style={{ marginBottom: spacing.md }} elevated={false}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border, paddingBottom: spacing.sm, marginBottom: spacing.sm }]}>
              <Typography variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                #{absoluteIndex + 1}
              </Typography>
            </View>
            <View style={[styles.cardBody, { gap: spacing.sm }]}>
              {columns.map((col, idx) => (
                <View key={idx} style={styles.rowItem}>
                  <Typography variant="secondary" color={colors.textSecondary} style={{ width: '38%', fontWeight: '600' }}>
                    {col.header}:
                  </Typography>
                  <View style={styles.valueContainer}>
                    {col.render ? (
                      col.render(item)
                    ) : (
                      <Typography variant="body" color={colors.textPrimary}>
                        {String(item[col.field as keyof T] ?? '')}
                      </Typography>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Card>
        );
      }}
    />
    {renderPaginationFooter()}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {},
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  cardBody: {},
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  valueContainer: {
    width: '60%',
    alignItems: 'flex-end',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  paginationLeft: {
    justifyContent: 'center',
  },
  paginationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: 'transparent',
  }
});
