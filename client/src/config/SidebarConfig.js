import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  FileText,
  Settings,
  Users,
  UserCog,
  Building2,
  Package,
  Receipt,
  RotateCcw,
  Truck,
  ArrowLeftRight,
  ClipboardList,
  BookOpen,
  Lock,
  Bell
} from 'lucide-react';

// Role-based menu configuration
// Admin: All access
// Operator: Master + Stock Transfer + Report
// Technician: Sale + Sale Return + Report

export const SIDEBAR_ITEMS = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'operator', 'technician']
  },
  {
    title: 'Master',
    icon: Database,
    roles: ['admin', 'operator'],
    submenu: [
      { title: 'User Master', path: '/master/user', icon: UserCog, roles: ['admin'] },
      { title: 'Department Master', path: '/master/department', icon: Building2, roles: ['admin', 'operator'] },
      { title: 'Add/Acc Master', path: '/master/item', icon: Package, roles: ['admin', 'operator'] }
    ]
  },
  {
    title: 'Transaction',
    icon: ShoppingCart,
    roles: ['admin', 'operator', 'technician'],
    submenu: [
      { title: 'Sale', path: '/transaction/sale', icon: Receipt, roles: ['admin', 'technician'] },
      { title: 'Sale List', path: '/transaction/sale-list', icon: FileText, roles: ['admin', 'technician'] },
      { title: 'Sales AMC Invoice', path: '/transaction/sale-amc', icon: Receipt, roles: ['admin', 'technician'] },
      { title: 'Sales AMC Invoice List', path: '/transaction/sale-amc-list', icon: FileText, roles: ['admin', 'technician'] },
      { title: 'Sale Return', path: '/transaction/sale-return', icon: RotateCcw, roles: ['admin', 'technician'] },
      { title: 'Sale Return List', path: '/transaction/sale-return-list', icon: FileText, roles: ['admin', 'technician'] },
      { title: 'Purchase', path: '/transaction/purchase', icon: Truck, roles: ['admin', 'operator'] },
      { title: 'Purchase List', path: '/transaction/purchase-list', icon: FileText, roles: ['admin', 'operator'] },
      { title: 'Purchase Return', path: '/transaction/purchase-return', icon: RotateCcw, roles: ['admin', 'operator'] },
      { title: 'Purchase Return List', path: '/transaction/purchase-return-list', icon: FileText, roles: ['admin', 'operator'] },
      { title: 'Stock Transfer', path: '/transaction/stock-transfer', icon: ArrowLeftRight, roles: ['admin', 'operator'] },
      { title: 'Stock Transfer List', path: '/transaction/stock-transfer-list', icon: FileText, roles: ['admin', 'operator'] },
      { title: 'Stock Transfer Return', path: '/transaction/stock-transfer-return', icon: RotateCcw, roles: ['admin', 'operator'] },
      { title: 'Stock Transfer Return List', path: '/transaction/stock-transfer-return-list', icon: FileText, roles: ['admin', 'operator'] }
    ]
  },
  {
    title: 'Report',
    icon: FileText,
    roles: ['admin', 'operator', 'technician'],
    submenu: [
      { title: 'Sale Summary', path: '/report/sale-summary', icon: ClipboardList, roles: ['admin'] },
      { title: 'Sale Register', path: '/report/sale-register', icon: BookOpen, roles: ['admin'] },
      { title: 'Purchase Summary', path: '/report/purchase-summary', icon: ClipboardList, roles: ['admin'] },
      { title: 'Purchase Register', path: '/report/purchase-register', icon: BookOpen, roles: ['admin'] },
      { title: 'Stock Transfer Report', path: '/report/stock-transfer', icon: FileText, roles: ['admin', 'operator', 'technician'] },
      { title: 'Stock Transfer Return Report', path: '/report/stock-transfer-return', icon: RotateCcw, roles: ['admin', 'operator', 'technician'] },
      { title: 'Current Stock Report', path: '/report/current-stock', icon: Package, roles: ['admin', 'operator', 'technician'] },
      { title: 'Commission Report', path: '/report/commission', icon: FileText, roles: ['admin', 'technician'] }
    ]
  },
  {
    title: 'Reminder',
    icon: Bell,
    roles: ['admin', 'operator', 'technician'],
    submenu: [
      { title: 'Lead Report', path: '/reminder/lead-report', icon: ClipboardList, roles: ['admin', 'operator', 'technician'] }
    ]
  },
  {
    title: 'Utility',
    icon: Settings,
    roles: ['admin', 'operator', 'technician'],
    submenu: [
      { title: 'Company Master', path: '/utility/company-master', icon: Building2, roles: ['admin'] },
      { title: 'Change Password', path: '/utility/change-password', icon: Lock, roles: ['admin', 'operator', 'technician'] }
    ]
  }
];

// Helper function to filter menu items based on user role
export const getFilteredMenuItems = (items, userRole) => {
  return items.reduce((acc, item) => {
    // Check if user has access to this item
    if (item.roles.includes(userRole)) {
      if (item.submenu) {
        // Filter submenu items
        const filteredSubmenu = item.submenu.filter(subItem => subItem.roles.includes(userRole));
        // Only include parent if it has accessible children
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
