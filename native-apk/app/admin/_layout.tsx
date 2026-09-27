import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Platform, StyleSheet } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, isDark, mode, setMode } = useTheme();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('superAdminToken');
      if (token === 'NAJIR_LOGGED_IN') {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (username === 'NAJIR' && password === 'NAJIR') {
      await AsyncStorage.setItem('superAdminToken', 'NAJIR_LOGGED_IN');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid ID or Password');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('superAdminToken');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // --- LOGIN SCREEN (If not authenticated) ---
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.loginCard}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={32} color="white" />
            </View>
            <Text style={styles.title}>Super Admin</Text>
            <Text style={styles.subtitle}>Enter your credentials to access the SaaS management panel</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={20} color="#e11d48" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>ID</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter ID"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={{ marginBottom: 32 }}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity onPress={handleLogin} style={styles.button}>
            <Text style={styles.buttonText}>Access Panel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- ADMIN LAYOUT WITH SIDEBAR (If authenticated) ---
  const menuItems = [
    { name: 'Dashboard', path: '/admin/adminHome', icon: 'grid-outline' as const },
    { name: 'Tenants', path: '/admin/tenants', icon: 'business-outline' as const },
    { name: 'Master Users', path: '/admin/users', icon: 'people-outline' as const },
  ];

  const toggleTheme = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, flexDirection: Platform.OS === 'web' && Dimensions.get('window').width > 768 ? 'row' : 'column' }}>
        
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarIcon}>
              <Ionicons name="shield" size={20} color="white" />
            </View>
            <View>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '900' }}>Super Admin</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>SaaS Management</Text>
            </View>
          </View>

          <View style={styles.menuContainer}>
            {menuItems.map((item) => {
              const isActive = pathname === item.path || (pathname === '/admin' && item.path === '/admin/adminHome');
              return (
                <TouchableOpacity
                  key={item.path}
                  onPress={() => router.push(item.path as any)}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                >
                  <Ionicons name={item.icon} size={20} color={isActive ? 'white' : '#94a3b8'} />
                  <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.logoutContainer}>
            {/* Theme Toggle */}
            <TouchableOpacity onPress={toggleTheme} style={[styles.menuItem, { marginBottom: 12 }]}>
              <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={20} color="#94a3b8" />
              <Text style={{ marginLeft: 12, fontWeight: 'bold', color: '#94a3b8' }}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.menuItem}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={{ marginLeft: 12, fontWeight: 'bold', color: '#ef4444' }}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={{ flex: 1, backgroundColor: colors.background }}>
           <Slot />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginCard: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  iconContainer: {
    backgroundColor: '#2563eb',
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#fff1f2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  errorText: {
    color: '#e11d48',
    marginLeft: 8,
    fontWeight: '500',
  },
  label: {
    color: '#334155',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: '#0f172a',
    outlineStyle: 'none',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sidebar: {
    width: Platform.OS === 'web' && Dimensions.get('window').width > 768 ? 260 : '100%',
    backgroundColor: '#0f172a',
    minHeight: Platform.OS === 'web' && Dimensions.get('window').width > 768 ? '100vh' : 'auto',
  },
  sidebarHeader: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sidebarIcon: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContainer: {
    padding: 16,
    gap: 8,
    flexDirection: Platform.OS === 'web' && Dimensions.get('window').width > 768 ? 'column' : 'row',
    flexWrap: 'wrap',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: '#2563eb',
  },
  menuText: {
    marginLeft: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  menuTextActive: {
    color: 'white',
  },
  logoutContainer: {
    marginTop: 'auto',
    padding: 16,
  }
});
