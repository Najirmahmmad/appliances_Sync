import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StatusBar, Style } from '@capacitor/status-bar';
import SafeAreaView from './components/layout/SafeAreaView';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './components/dashboard/Dashboard';
import UserMaster from './pages/master/UserMaster';
import DepartmentMaster from './pages/master/DepartmentMaster';
import ItemMaster from './pages/master/ItemMaster';
import CompanyMaster from './pages/utility/CompanyMaster';
import ChangePassword from './pages/utility/ChangePassword';
import Sale from './pages/transaction/Sale';
import SaleList from './pages/transaction/SaleList';
import Saleamc from './pages/transaction/Saleamc';
import SaleamcList from './pages/transaction/SaleamcList';
import SaleReturn from './pages/transaction/SaleReturn';
import SaleReturnList from './pages/transaction/SaleReturnList';
import Purchase from './pages/transaction/Purchase';
import PurchaseList from './pages/transaction/PurchaseList';
import PurchaseReturn from './pages/transaction/PurchaseReturn';
import PurchaseReturnList from './pages/transaction/PurchaseReturnList';
import StockTransfer from './pages/transaction/StockTransfer'; // Import StockTransfer
import StockList from './pages/transaction/StockList'; // Import StockList
import CommissionReport from './pages/report/CommissionReport';

import SaleSummaryReport from './pages/report/SaleSummaryReport';
import SaleRegisterReport from './pages/report/SaleRegisterReport';
import StockTransferReport from './pages/report/StockTransferReport';

import PurchaseSummaryReport from './pages/report/PurchaseSummaryReport';
import PurchaseRegisterReport from './pages/report/PurchaseRegisterReport';
import CurrentStockReport from './pages/report/CurrentStockReport';
import ReminderLeadReport from './pages/reminder/ReminderLeadReport';

// RBAC Guard Component
const RoleGuard = ({ allowedRoles, children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Placeholder component for pages under development
const Placeholder = ({ title }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
    <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
    <p className="text-gray-500">This page is under development.</p>
  </div>
);

function App() {
  // Initialize Capacitor StatusBar
  useEffect(() => {
    const initStatusBar = async () => {
      try {
        // Overlay the webview to allow drawing underneath the status bar
        await StatusBar.setOverlaysWebView({ overlay: true });
        // Set style to Light (dark icons) or Dark (light icons) depending on app theme
        await StatusBar.setStyle({ style: Style.Dark });
      } catch (e) {
        // Will throw in standard browser environments, which is fine
        console.warn('Capacitor StatusBar not available', e);
      }
    };
    initStatusBar();
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} className="h-screen w-screen overflow-hidden bg-gray-50">
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Master Routes */}
              <Route path="/master/user" element={<UserMaster />} />
              <Route path="/master/department" element={<DepartmentMaster />} />
              <Route path="/master/item" element={<ItemMaster />} />

              {/* Transaction Routes */}
              <Route path="/transaction/sale" element={<Sale />} />
              <Route path="/transaction/sale/:bookCode/:vouchNo" element={<Sale />} />
              <Route path="/transaction/sale-list" element={<SaleList />} />
              <Route path="/transaction/sale-amc" element={<Saleamc />} />
              <Route path="/transaction/sale-amc/:bookCode/:vouchNo" element={<Saleamc />} />
              <Route path="/transaction/sale-amc-list" element={<SaleamcList />} />
              <Route path="/transaction/sale-return" element={<SaleReturn />} />
              <Route path="/transaction/sale-return/:bookCode/:vouchNo" element={<Sale />} />
              <Route path="/transaction/sale-return-list" element={<SaleReturnList />} />
              <Route path="/transaction/purchase" element={<Purchase />} />
              <Route path="/transaction/purchase-list" element={<PurchaseList />} />
              <Route path="/transaction/purchase/:vouchNo" element={<Purchase />} />
              <Route path="/transaction/purchase-return" element={<PurchaseReturn />} />
              <Route path="/transaction/purchase-return-list" element={<PurchaseReturnList />} />
              <Route path="/transaction/purchase-return/:vouchNo" element={<PurchaseReturn />} />
              <Route path="/transaction/stock-transfer" element={< StockTransfer type="ST" />} />
              <Route path="/transaction/stock-transfer/:bookCode/:vouchNo" element={<StockTransfer type="ST" />} />
              <Route path="/transaction/stock-transfer-list" element={<StockList type="ST" />} />
              {/* Stock Transfer Return */}
              <Route path="/transaction/stock-transfer-return" element={< StockTransfer type="STR" />} />
              <Route path="/transaction/stock-transfer-return/:bookCode/:vouchNo" element={<StockTransfer type="STR" />} />
              <Route path="/transaction/stock-transfer-return-list" element={<StockList type="STR" />} />


              {/* Report Routes */}
              <Route path="/report/sale-summary" element={<SaleSummaryReport />} />
              <Route path="/report/sale-register" element={<SaleRegisterReport />} />
              <Route path="/report/purchase-summary" element={<PurchaseSummaryReport />} />
              <Route path="/report/purchase-register" element={<PurchaseRegisterReport />} />
              <Route path="/report/stock-transfer" element={<StockTransferReport type="ST" />} />
              <Route path="/report/stock-transfer-return" element={<StockTransferReport type="STR" />} />
              <Route path="/report/current-stock" element={<CurrentStockReport />} />
              <Route path="/report/commission" element={<CommissionReport />} />

              {/* Reminder Routes */}
              <Route path="/reminder/lead-report" element={<ReminderLeadReport />} />

              {/* Utility Routes */}
              <Route path="/utility/change-password" element={<ChangePassword />} />
              <Route path="/utility/company-master" element={<CompanyMaster />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </SafeAreaView>
  );
}

export default App;
