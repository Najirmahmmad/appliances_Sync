import 'react-native-gesture-handler';
import '../src/utils/polyfills';
import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import CustomDrawerContent from './components/CustomDrawerContent';
import { StatusBar } from 'expo-status-bar';
import { useResponsive } from '../src/hooks/useResponsive';

import { useSegments, useRouter } from 'expo-router';

function RootDrawer() {
  const { colors, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const currentSegment = segments[0] as string | undefined;
  const isAuthGroup = !currentSegment || currentSegment === 'login';
  const isAdminGroup = currentSegment === 'admin';
  
  React.useEffect(() => {
    if (loading) return;
    
    // Bypass auth check for the super admin group
    if (isAdminGroup) return;
    
    if (!user && !isAuthGroup) {
      // Redirect to login if unauthenticated and trying to access a protected route
      router.replace('/login');
    } else if (user && isAuthGroup) {
      // Redirect to dashboard if logged in and trying to access login page
      router.replace('/dashboard');
    }
  }, [user, loading, segments]);

  const showDrawer = !!user && !isAuthGroup;
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerType: isDesktop && showDrawer ? 'permanent' : 'front',
          swipeEnabled: showDrawer,
          headerShown: false,
          drawerStyle: {
            width: showDrawer ? (isDesktop ? 280 : 300) : 0,
            backgroundColor: colors.surface,
          },
          sceneStyle: {
            backgroundColor: colors.background,
          }
        }}
      >
        <Drawer.Screen name="index" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="login" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="dashboard/index" options={{ title: 'Dashboard' }} />
        <Drawer.Screen name="master/user" options={{ title: 'User Master' }} />
        <Drawer.Screen name="master/department" options={{ title: 'Department Master' }} />
        <Drawer.Screen name="master/item" options={{ title: 'Add/Acc Master' }} />
        <Drawer.Screen name="transaction/sale" options={{ title: 'Sale Invoice' }} />
        <Drawer.Screen name="transaction/sale-list" options={{ title: 'Sale List' }} />
        <Drawer.Screen name="transaction/sale-amc" options={{ title: 'Sales AMC Invoice' }} />
        <Drawer.Screen name="transaction/sale-amc-list" options={{ title: 'Sales AMC List' }} />
        <Drawer.Screen name="transaction/sale-return" options={{ title: 'Sale Return' }} />
        <Drawer.Screen name="transaction/sale-return-list" options={{ title: 'Sale Return List' }} />
        <Drawer.Screen name="transaction/purchase" options={{ title: 'Purchase Invoice' }} />
        <Drawer.Screen name="transaction/purchase-list" options={{ title: 'Purchase List' }} />
        <Drawer.Screen name="transaction/purchase-return" options={{ title: 'Purchase Return' }} />
        <Drawer.Screen name="transaction/purchase-return-list" options={{ title: 'Purchase Return List' }} />
        <Drawer.Screen name="transaction/stock-transfer" options={{ title: 'Stock Transfer' }} />
        <Drawer.Screen name="transaction/stock-transfer-list" options={{ title: 'Stock Transfer List' }} />
        <Drawer.Screen name="transaction/stock-transfer-return" options={{ title: 'Stock Transfer Return' }} />
        <Drawer.Screen name="transaction/stock-transfer-return-list" options={{ title: 'Stock Transfer Return List' }} />
        <Drawer.Screen name="report/current-stock" options={{ title: 'Current Stock Report' }} />
        <Drawer.Screen name="report/sale-summary" options={{ title: 'Sale Summary Report' }} />
        <Drawer.Screen name="report/sale-register" options={{ title: 'Sale Register Report' }} />
        <Drawer.Screen name="report/purchase-summary" options={{ title: 'Purchase Summary Report' }} />
        <Drawer.Screen name="report/purchase-register" options={{ title: 'Purchase Register Report' }} />
        <Drawer.Screen name="report/stock-transfer" options={{ title: 'Stock Transfer Report' }} />
        <Drawer.Screen name="report/stock-transfer-return" options={{ title: 'Stock Transfer Return Report' }} />
        <Drawer.Screen name="report/commission" options={{ title: 'Commission Report' }} />
        <Drawer.Screen name="reminder/lead-report" options={{ title: 'Lead Report' }} />
        <Drawer.Screen name="utility/company-master" options={{ title: 'Company Master' }} />
        <Drawer.Screen name="utility/change-password" options={{ title: 'Change Password' }} />
      </Drawer>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootDrawer />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
