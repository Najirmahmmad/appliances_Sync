import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/config/api';
import Header from '../../src/components/ui/Header';
import ScreenContainer from '../../src/components/ui/ScreenContainer';
import Typography from '../../src/components/ui/Typography';
import Card from '../../src/components/ui/Card';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, radius, isDark } = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const role = user?.role?.trim().toLowerCase() || 'operator';
      const endpoint = role === 'admin' ? '/dashboard/admin' : role === 'technician' ? '/dashboard/technician' : '/dashboard/operator';
      const response = await api.get(endpoint);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const isTechnician = user?.role?.toLowerCase() === 'technician';

  return (
    <ScreenContainer>
      <Header title={`${user?.role || 'ERP'} Dashboard`} subtitle={`Welcome back, ${user?.name || user?.username || 'User'}!`} />

      <ScrollView
        contentContainerStyle={[styles.container, { padding: spacing.md, paddingBottom: spacing.huge, gap: spacing.md }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} />}
      >
        {loading ? (
          <View style={[styles.loadingContainer, { padding: spacing.huge }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Typography variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
              Loading dashboard summary...
            </Typography>
          </View>
        ) : (
          <>
            {/* Technician Shortcuts */}
            {isTechnician && (
              <Card style={{ gap: spacing.md }}>
                <Typography variant="sectionTitle">Quick Shortcuts</Typography>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}>
                  
                  <TouchableOpacity 
                    style={[styles.shortcutCard, { borderColor: colors.border, backgroundColor: isDark ? colors.background : '#f8fafc', borderRadius: radius.md, padding: spacing.md, width: isMobile ? '48%' : (isDesktop ? '23%' : '48%'), borderWidth: 1 }]} 
                    onPress={() => router.push('/transaction/sale')}
                  >
                    <Ionicons name="cart-outline" size={24} color={colors.primary} />
                    <Typography variant="body" style={{ marginTop: spacing.sm, fontWeight: '600' }}>Sale</Typography>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.shortcutCard, { borderColor: colors.border, backgroundColor: isDark ? colors.background : '#f8fafc', borderRadius: radius.md, padding: spacing.md, width: isMobile ? '48%' : (isDesktop ? '23%' : '48%'), borderWidth: 1 }]} 
                    onPress={() => router.push('/transaction/sale-amc')}
                  >
                    <Ionicons name="shield-checkmark-outline" size={24} color={colors.info} />
                    <Typography variant="body" style={{ marginTop: spacing.sm, fontWeight: '600' }}>Sale AMC</Typography>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.shortcutCard, { borderColor: colors.border, backgroundColor: isDark ? colors.background : '#f8fafc', borderRadius: radius.md, padding: spacing.md, width: isMobile ? '48%' : (isDesktop ? '23%' : '48%'), borderWidth: 1 }]} 
                    onPress={() => router.push('/report/commission')}
                  >
                    <Ionicons name="cash-outline" size={24} color={colors.success} />
                    <Typography variant="body" style={{ marginTop: spacing.sm, fontWeight: '600' }}>Commission</Typography>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.shortcutCard, { borderColor: colors.border, backgroundColor: isDark ? colors.background : '#f8fafc', borderRadius: radius.md, padding: spacing.md, width: isMobile ? '48%' : (isDesktop ? '23%' : '48%'), borderWidth: 1 }]} 
                    onPress={() => router.push('/report/current-stock')}
                  >
                    <Ionicons name="cube-outline" size={24} color="#f59e0b" />
                    <Typography variant="body" style={{ marginTop: spacing.sm, fontWeight: '600' }}>Current Stock</Typography>
                  </TouchableOpacity>

                </View>
              </Card>
            )}

            {/* Stat Cards Grid */}
            <View style={[styles.statsGrid, { gap: spacing.md }]}>
              <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.info, width: isMobile ? '100%' : (isDesktop ? '23%' : '48%') }}>
                <View style={[styles.statIconBox, { backgroundColor: '#e0f2fe', borderRadius: radius.sm, marginBottom: spacing.sm }]}>
                  <Ionicons name="cube-outline" size={24} color={colors.info} />
                </View>
                <Typography variant="secondary">Total Stock Items</Typography>
                <Typography variant="screenTitle" style={{ marginTop: 2 }}>{stats.totalStocks ?? stats.totalStockItems ?? 0}</Typography>
              </Card>

              <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.success, width: isMobile ? '100%' : (isDesktop ? '23%' : '48%') }}>
                <View style={[styles.statIconBox, { backgroundColor: '#dcfce7', borderRadius: radius.sm, marginBottom: spacing.sm }]}>
                  <Ionicons name="cash-outline" size={24} color={colors.success} />
                </View>
                <Typography variant="secondary">Weekly Revenue</Typography>
                <Typography variant="screenTitle" style={{ marginTop: 2 }}>₹{(stats.totalRevenue ?? 0).toLocaleString()}</Typography>
              </Card>

              <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.primary, width: isMobile ? '100%' : (isDesktop ? '23%' : '48%') }}>
                <View style={[styles.statIconBox, { backgroundColor: '#e0e7ff', borderRadius: radius.sm, marginBottom: spacing.sm }]}>
                  <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
                </View>
                <Typography variant="secondary">Top Selling Item</Typography>
                <Typography variant="sectionTitle" style={{ marginTop: 2 }} numberOfLines={1}>{stats.highestSaleProduct?.name || '-'}</Typography>
                <Typography variant="caption" color={colors.textSecondary}>{stats.highestSaleProduct?.quantity || 0} units</Typography>
              </Card>

              <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.error, width: isMobile ? '100%' : (isDesktop ? '23%' : '48%') }}>
                <View style={[styles.statIconBox, { backgroundColor: '#fee2e2', borderRadius: radius.sm, marginBottom: spacing.sm }]}>
                  <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
                </View>
                <Typography variant="secondary">Low Stock Alert</Typography>
                <Typography variant="sectionTitle" style={{ marginTop: 2 }} numberOfLines={1}>{stats.minimumStockProduct?.name || '-'}</Typography>
                <Typography variant="caption" color={colors.textSecondary}>Qty: {stats.minimumStockProduct?.quantity || 0}</Typography>
              </Card>
            </View>

            {/* Top Products */}
            <Card style={{ gap: spacing.md }}>
              <Typography variant="sectionTitle">Top Selling Products</Typography>
              {charts.topProducts && charts.topProducts.length > 0 ? (
                charts.topProducts.map((prod: any, idx: number) => (
                  <View key={idx} style={[styles.listItem, { borderBottomColor: colors.border, paddingVertical: spacing.sm }]}>
                    <View style={styles.listTextCol}>
                      <Typography variant="body" style={{ fontWeight: '600' }}>{prod.name}</Typography>
                      <Typography variant="caption" color={colors.textSecondary}>{prod.model || 'No model'}</Typography>
                    </View>
                    <View style={styles.listValCol}>
                      <View style={[styles.listBadge, { backgroundColor: '#e0f2fe', borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                        <Typography variant="caption" color={colors.info} style={{ fontWeight: '600' }}>{prod.sold} sold</Typography>
                      </View>
                      <Typography variant="body" style={{ fontWeight: '700', marginTop: 2 }}>
                        ₹{parseFloat(prod.revenue || 0).toLocaleString()}
                      </Typography>
                    </View>
                  </View>
                ))
              ) : (
                <Typography variant="secondary" align="center" style={{ paddingVertical: spacing.md }}>
                  No product sales data recorded yet.
                </Typography>
              )}
            </Card>

            {/* Low Stock Section */}
            <Card style={{ gap: spacing.md }}>
              <Typography variant="sectionTitle">Low Stock Items</Typography>
              {charts.lowStockItems && charts.lowStockItems.length > 0 ? (
                charts.lowStockItems.map((item: any, idx: number) => (
                  <View key={idx} style={[styles.listItem, styles.lowStockBorder, { borderBottomColor: colors.border, borderLeftColor: colors.error, paddingVertical: spacing.sm, paddingLeft: spacing.sm }]}>
                    <Ionicons name="warning-outline" size={20} color={colors.error} />
                    <View style={[styles.listTextCol, { marginLeft: spacing.sm }]}>
                      <Typography variant="body" style={{ fontWeight: '600' }}>{item.name}</Typography>
                      <Typography variant="caption" color={colors.textSecondary}>Min required: {item.minStock}</Typography>
                    </View>
                    <Typography variant="body" color={colors.error} style={{ fontWeight: '700' }}>{item.stock} left</Typography>
                  </View>
                ))
              ) : (
                <Typography variant="secondary" align="center" style={{ paddingVertical: spacing.md }}>
                  No items currently below stock threshold.
                </Typography>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {},
  loadingContainer: { alignItems: 'center' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statIconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  listTextCol: { flex: 1 },
  listValCol: { alignItems: 'flex-end' },
  listBadge: {},
  lowStockBorder: { borderLeftWidth: 3 },
  shortcutCard: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});
