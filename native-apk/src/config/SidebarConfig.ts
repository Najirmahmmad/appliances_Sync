export interface MenuItem {
  title: string;
  path: string;
  icon: string;
  roles: string[];
  submenu?: MenuItem[];
}

export const SIDEBAR_ITEMS: MenuItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: 'grid-outline',
    roles: ['admin', 'operator', 'technician']
  },
  {
    title: 'Master',
    path: '/master',
    icon: 'cube-outline',
    roles: ['admin', 'operator'],
    submenu: [
      { title: 'User Master', path: '/master/user', icon: 'people-outline', roles: ['admin'] },
      { title: 'Department Master', path: '/master/department', icon: 'business-outline', roles: ['admin', 'operator'] },
      { title: 'Add/Acc Master', path: '/master/item', icon: 'pricetag-outline', roles: ['admin', 'operator'] }
    ]
  },
  {
    title: 'Transaction',
    path: '/transaction',
    icon: 'cart-outline',
    roles: ['admin', 'operator', 'technician'],
    submenu: [
      { title: 'Sale', path: '/transaction/sale', icon: 'receipt-outline', roles: ['admin', 'technician'] },
      { title: 'Sale List', path: '/transaction/sale-list', icon: 'document-text-outline', roles: ['admin', 'technician'] },
      { title: 'Sales AMC Invoice', path: '/transaction/sale-amc', icon: 'ribbon-outline', roles: ['admin', 'technician'] },
      { title: 'Sales AMC Invoice List', path: '/transaction/sale-amc-list', icon: 'documents-outline', roles: ['admin', 'technician'] },
      { title: 'Sale Return', path: '/transaction/sale-return', icon: 'arrow-undo-outline', roles: ['admin', 'technician'] },
      { title: 'Sale Return List', path: '/transaction/sale-return-list', icon: 'list-outline', roles: ['admin', 'technician'] },
      { title: 'Purchase', path: '/transaction/purchase', icon: 'bag-handle-outline', roles: ['admin', 'operator'] },
      { title: 'Purchase List', path: '/transaction/purchase-list', icon: 'clipboard-outline', roles: ['admin', 'operator'] },
      { title: 'Purchase Return', path: '/transaction/purchase-return', icon: 'return-down-back-outline', roles: ['admin', 'operator'] },
      { title: 'Purchase Return List', path: '/transaction/purchase-return-list', icon: 'list-circle-outline', roles: ['admin', 'operator'] },
      { title: 'Stock Transfer', path: '/transaction/stock-transfer', icon: 'swap-horizontal-outline', roles: ['admin', 'operator'] },
      { title: 'Stock Transfer List', path: '/transaction/stock-transfer-list', icon: 'swap-vertical-outline', roles: ['admin', 'operator'] },
      { title: 'Stock Transfer Return', path: '/transaction/stock-transfer-return', icon: 'repeat-outline', roles: ['admin', 'operator'] },
      { title: 'Stock Transfer Return List', path: '/transaction/stock-transfer-return-list', icon: 'reorder-four-outline', roles: ['admin', 'operator'] }
    ]
  },
  {
    title: 'Report',
    path: '/report',
    icon: 'bar-chart-outline',
    roles: ['admin', 'operator', 'technician'],
    submenu: [
      { title: 'Sale Summary', path: '/report/sale-summary', icon: 'stats-chart-outline', roles: ['admin'] },
      { title: 'Sale Register', path: '/report/sale-register', icon: 'journal-outline', roles: ['admin'] },
      { title: 'Purchase Summary', path: '/report/purchase-summary', icon: 'pie-chart-outline', roles: ['admin'] },
      { title: 'Purchase Register', path: '/report/purchase-register', icon: 'book-outline', roles: ['admin'] },
      { title: 'Stock Transfer Report', path: '/report/stock-transfer', icon: 'analytics-outline', roles: ['admin', 'operator', 'technician'] },
      { title: 'Stock Transfer Return Report', path: '/report/stock-transfer-return', icon: 'sync-outline', roles: ['admin', 'operator', 'technician'] },
      { title: 'Current Stock Report', path: '/report/current-stock', icon: 'layers-outline', roles: ['admin', 'operator', 'technician'] },
      { title: 'Commission Report', path: '/report/commission', icon: 'cash-outline', roles: ['admin', 'technician'] }
    ]
  },
  {
    title: 'Reminder',
    path: '/reminder',
    icon: 'notifications-outline',
    roles: ['admin', 'operator', 'technician'],
    submenu: [
      { title: 'Lead Report', path: '/reminder/lead-report', icon: 'alarm-outline', roles: ['admin', 'operator', 'technician'] }
    ]
  },
  {
    title: 'Utility',
    path: '/utility',
    icon: 'settings-outline',
    roles: ['admin', 'operator', 'technician'],
    submenu: [
      { title: 'Company Master', path: '/utility/company-master', icon: 'briefcase-outline', roles: ['admin'] },
      { title: 'Change Password', path: '/utility/change-password', icon: 'lock-closed-outline', roles: ['admin', 'operator', 'technician'] }
    ]
  }
];

export const getFilteredMenuItems = (items: MenuItem[], userRole: string): MenuItem[] => {
  const roleLower = userRole?.toLowerCase() || '';
  return items.reduce((acc: MenuItem[], item) => {
    const hasRole = item.roles.map(r => r.toLowerCase()).includes(roleLower);
    if (hasRole) {
      if (item.submenu) {
        const filteredSubmenu = item.submenu.filter(sub =>
          sub.roles.map(r => r.toLowerCase()).includes(roleLower)
        );
        if (filteredSubmenu.length > 0) {
          acc.push({ ...item, submenu: filteredSubmenu });
        }
      } else {
        acc.push(item);
      }
    }
    return acc;
  }, []);
};
