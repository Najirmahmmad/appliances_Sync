import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { DrawerContentScrollView } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { SIDEBAR_ITEMS, getFilteredMenuItems, MenuItem } from '../../src/config/SidebarConfig';

export default function CustomDrawerContent(props: any) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({});

  const userRole = user?.role || 'Operator';
  const menuItems = getFilteredMenuItems(SIDEBAR_ITEMS, userRole);

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleNavigate = (path: string) => {
    props.navigation.closeDrawer();
    setTimeout(() => {
      router.push(path as any);
    }, 0);
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContainer}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : userRole.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.name || user?.username || 'ERP User'}</Text>
        <Text style={styles.profileRole}>{userRole.toUpperCase()} ACCOUNT</Text>
      </View>

      {/* Menu items */}
      <ScrollView style={styles.menuList}>
        {menuItems.map((item: MenuItem, idx: number) => {
          if (item.submenu) {
            const isOpen = openSubmenus[item.title];
            return (
              <View key={idx} style={styles.groupContainer}>
                <TouchableOpacity onPress={() => toggleSubmenu(item.title)} style={styles.menuItemRow}>
                  <View style={styles.leftRow}>
                    <Ionicons name={item.icon as any} size={22} color="#0284c7" />
                    <Text style={styles.menuTitle}>{item.title}</Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.submenuContainer}>
                    {item.submenu.map((sub: MenuItem, subIdx: number) => (
                      <TouchableOpacity
                        key={subIdx}
                        onPress={() => handleNavigate(sub.path)}
                        style={styles.submenuItemRow}
                      >
                        <Ionicons name={sub.icon as any} size={18} color="#64748b" />
                        <Text style={styles.submenuTitle}>{sub.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          }

          return (
            <TouchableOpacity key={idx} onPress={() => handleNavigate(item.path)} style={styles.menuItemRow}>
              <View style={styles.leftRow}>
                <Ionicons name={item.icon as any} size={22} color="#0284c7" />
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Logout Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => {
            props.navigation.closeDrawer();
            logout();
          }}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#ffffff' },
  profileHeader: {
    padding: 20,
    backgroundColor: '#0f172a',
    borderBottomRightRadius: 30,
    marginBottom: 10,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 20 },
  profileName: { color: '#ffffff', fontWeight: '700', fontSize: 17 },
  profileRole: { color: '#38bdf8', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  menuList: { flex: 1, paddingHorizontal: 8 },
  groupContainer: { marginBottom: 4 },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
  },
  leftRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  submenuContainer: { paddingLeft: 34, gap: 4, paddingVertical: 4 },
  submenuItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  submenuTitle: { fontSize: 14, color: '#475569', fontWeight: '500' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
