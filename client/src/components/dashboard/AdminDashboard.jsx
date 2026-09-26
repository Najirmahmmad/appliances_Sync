import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, TrendingUp, AlertTriangle, IndianRupee, RefreshCw } from 'lucide-react';
import StatCard from './StatCard';
import SalesChart from './SalesChart';
import { getToken } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    stats: {
      totalStocks: 0,
      totalRevenue: 0,
      highestSaleProduct: { name: '-', quantity: 0 },
      minimumStockProduct: { name: '-', quantity: 0 }
    },
    charts: {
      salesData: [],
      topProducts: [],
      lowStockItems: []
    }
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${API_URL}/dashboard/admin`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data");
        // Fallback or keep empty state
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const { stats, charts } = data;

  return (
    <div className="space-y-6">
      {/* Stats Cards - Optimized for mobile/tablet/desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Stock Items"
          value={stats.totalStocks.toLocaleString()}
          subtitle="Items in inventory"
          icon={Package}
          color="blue"
          trend="neutral"
        />
        <StatCard
          title="Weekly Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          subtitle="Last 7 days"
          icon={IndianRupee}
          color="green"
          trend="up"
        />
        <StatCard
          title="Top Selling Product"
          value={stats.highestSaleProduct.name}
          subtitle={`${stats.highestSaleProduct.quantity} units sold`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Low Stock Alert"
          value={stats.minimumStockProduct.name}
          subtitle={`Min Stock: ${stats.minimumStockProduct.quantity}`}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts and Tables Row - Stack on smaller screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="w-full overflow-hidden">
          <SalesChart data={charts.salesData} title="Last 7 Days Sales" />
        </div>

        {/* Top Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 w-full">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Selling Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Product</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 whitespace-nowrap">Sold</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 whitespace-nowrap">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {charts.topProducts.length > 0 ? (
                  charts.topProducts.map((product, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-gray-800 text-sm whitespace-nowrap">{product.name}</p>
                          <p className="text-xs text-gray-500 whitespace-nowrap">{product.model || '-'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                          {product.sold} units
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-gray-800 text-sm whitespace-nowrap">
                        ₹{parseFloat(product.revenue).toLocaleString()}
                      </td>
                    </tr>
                  ))) : (
                  <tr><td colSpan="3" className="text-center py-4 text-gray-500">No sales data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Stock Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Low Stock Items</h3>
        {charts.lowStockItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {charts.lowStockItems.map((item, index) => (
              <div key={index} className="border border-red-100 bg-red-50 rounded-lg p-4 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded whitespace-nowrap">
                    Low Stock
                  </span>
                </div>
                <h4 className="font-medium text-gray-800 text-sm truncate" title={item.name}>{item.name}</h4>
                <p className="text-xs text-gray-500 mb-2 truncate" title={item.model}>{item.model || 'No Model'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-red-600">{item.stock}</span>
                  <span className="text-xs text-gray-500">Min: {item.minStock}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No stock items are currently below the threshold.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
