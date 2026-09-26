import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import Typography from './Typography';
import { Column } from './DataTable';
import Select from './Select';
import { TouchableOpacity, Text } from 'react-native';

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
  const { isMobile } = useResponsive();
  
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState('50');

  const currentPage = serverPagination ? (externalPage || 1) : internalPage;
  const pageSize = serverPagination ? (externalPageSize || '50') : internalPageSize;

  const numPageSize = parseInt(pageSize, 10);
  const totalRecordsCount = serverPagination ? (externalTotalRecords || 0) : (data ? data.length : 0);
  const totalPages = Math.ceil(totalRecordsCount / numPageSize);
  const currentData = serverPagination ? (data || []) : (data || []).slice((currentPage - 1) * numPageSize, currentPage * numPageSize);
  const startIndex = totalRecordsCount === 0 ? 0 : (currentPage - 1) * numPageSize + 1;
  const endIndex = Math.min(currentPage * numPageSize, totalRecordsCount);

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
      setInternalPage(1); 
    }
  };

  const pageSizeOptions = [
    { label: '10 / page', value: '10' },
    { label: '20 / page', value: '20' },
    { label: '50 / page', value: '50' },
    { label: '100 / page', value: '100' },
  ];

  const renderPaginationFooter = () => {
    if (!data || data.length === 0) return null;
    return (
      <View style={{
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
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radius.md,
      }}>
        <View style={{ justifyContent: 'center' }}>
          <Typography variant="caption" color={colors.textSecondary}>
            Showing {startIndex} to {endIndex} of {totalRecordsCount} records
          </Typography>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 120 }}>
            <Select 
              value={pageSize}
              options={pageSizeOptions}
              onChange={handlePageSizeChange}
            />
          </View>
          
          <TouchableOpacity
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 6, borderColor: colors.border, opacity: currentPage === 1 ? 0.5 : 1 }}
            onPress={handlePrev}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Typography variant="caption" color={colors.textPrimary} style={{ fontWeight: '600' }}>
            Page {currentPage} of {totalPages}
          </Typography>

          <TouchableOpacity
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 6, borderColor: colors.border, opacity: currentPage === totalPages ? 0.5 : 1 }}
            onPress={handleNext}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading && (!data || data.length === 0)) {
    return (
      <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Typography variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
          Loading data...
        </Typography>
      </View>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!data || data.length === 0) {
    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          margin: spacing.lg,
          padding: 40,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
        <Typography
          variant="body"
          color={colors.textSecondary}
          style={{ marginTop: spacing.md, textAlign: 'center' }}
        >
          {emptyMessage}
        </Typography>
      </View>
    );
  }

  // ── Mobile Web: Card layout ───────────────────────────────────────────────────
  if (isMobile) {
    return (
      <View style={{ flex: 1 }}>
      <FlatList
        data={currentData}
        keyExtractor={keyExtractor}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48, gap: spacing.md }}
        renderItem={({ item, index }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingBottom: spacing.xs,
                marginBottom: spacing.xs,
              }}
            >
              <Typography variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                #{((currentPage - 1) * numPageSize) + index + 1}
              </Typography>
            </View>
            {columns.map((col, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 28,
                }}
              >
                <Typography
                  variant="secondary"
                  color={colors.textSecondary}
                  style={{ width: '38%', fontWeight: '600' }}
                >
                  {col.header}:
                </Typography>
                <View style={{ width: '60%', alignItems: 'flex-end' }}>
                  {col.render ? (
                    col.render(item)
                  ) : (
                    <Typography variant="body" color={colors.textPrimary}>
                      {String((item as any)[col.field as string] ?? '')}
                    </Typography>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      />
      {renderPaginationFooter()}
      </View>
    );
  }

  // ── Desktop / Tablet Web: Proper table layout ────────────────────────────────
  // Uses React Native Web's overflow: 'auto' for proper CSS scroll behavior
  return (
    <View style={{ flex: 1, margin: spacing.md }}>
      {/* Outer scroll container — horizontal scroll for very wide tables */}
      <View
        style={{
          flex: 1,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          backgroundColor: colors.surface,
        }}
      >
        {/* ── Header Row ─────────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.background,
            borderBottomWidth: 2,
            borderBottomColor: colors.primary + '40',
            paddingHorizontal: spacing.lg,
            paddingVertical: 14,
          }}
        >
          {columns.map((col, idx) => (
            <View key={idx} style={{ flex: 1, minWidth: 80 }}>
              <Typography
                variant="caption"
                color={colors.textSecondary}
                style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 }}
              >
                {col.header}
              </Typography>
            </View>
          ))}
        </View>

        {/* ── Scrollable Body ────────────────────────────────────────────────── */}
        {/* 
          React Native Web supports CSS overflow on View natively.
          This is the correct way to get a proper scrollable table body on web
          without the nested-ScrollView collapse bug.
        */}
        <View
          style={{
            flex: 1,
            // React Native Web supports CSS overflow: auto natively
            overflow: 'auto' as any,
            maxHeight: '70vh' as any,
          } as any}
        >
          {currentData.map((item, rowIndex) => (
            <View
              key={keyExtractor(item, rowIndex)}
              style={{
                flexDirection: 'row',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md + 2,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor:
                  rowIndex % 2 === 0 ? colors.surface : colors.background,
                alignItems: 'center',
              } as any}
            >
              {columns.map((col, colIdx) => (
                <View key={colIdx} style={{ flex: 1, minWidth: 80, paddingRight: spacing.sm }}>
                  {col.render ? (
                    col.render(item)
                  ) : (
                    <Typography variant="body" color={colors.textPrimary} numberOfLines={2}>
                      {String((item as any)[col.field as string] ?? '—')}
                    </Typography>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* ── Footer: Pagination ──────────────────────────────────────────────── */}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          {renderPaginationFooter()}
        </View>
      </View>
    </View>
  );
}
