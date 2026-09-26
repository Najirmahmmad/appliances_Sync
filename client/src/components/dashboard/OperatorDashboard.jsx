import { Package, Search, Filter, RefreshCw, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const OperatorDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stockSummary: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
    stockItems: [],
    todaysTransfers: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${API_URL}/dashboard/operator`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const { stockSummary, stockItems, todaysTransfers } = data;

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.model && item.model.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      'in-stock': 'bg-green-100 text-green-800',
      'low-stock': 'bg-yellow-100 text-yellow-800',
      'out-of-stock': 'bg-red-100 text-red-800',
    };
    const labels = {
      'in-stock': 'In Stock',
      'low-stock': 'Low Stock',
      'out-of-stock': 'Out of Stock',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]} whitespace-nowrap`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stockSummary.total}</p>
              <p className="text-xs text-gray-500">Total Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{stockSummary.inStock}</p>
              <p className="text-xs text-gray-500">In Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stockSummary.lowStock}</p>
              <p className="text-xs text-gray-500">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Package className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{stockSummary.outOfStock}</p>
              <p className="text-xs text-gray-500">Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Stock Transfers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Today's Stock Transfers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 sm:px-5 text-sm font-medium text-gray-500">Technician</th>
                <th className="text-left py-3 px-4 sm:px-5 text-sm font-medium text-gray-500">Item Name</th>
                <th className="text-left py-3 px-4 sm:px-5 text-sm font-medium text-gray-500">Item Code</th>
                <th className="text-center py-3 px-4 sm:px-5 text-sm font-medium text-gray-500">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {todaysTransfers.length > 0 ? (
                todaysTransfers.map((tx, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-4 px-4 sm:px-5 text-sm font-medium text-gray-800">{tx.technician}</td>
                    <td className="py-4 px-4 sm:px-5 text-sm text-gray-600">{tx.item_name}</td>
                    <td className="py-4 px-4 sm:px-5 text-sm text-gray-500">{tx.item_code}</td>
                    <td className="py-4 px-4 sm:px-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tx.qty}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-gray-500">
                    No stock transfers today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-5 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Item Stock Overview</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 transition-all"
                />
              </div>
              {/* Filter */}
              <div className="relative w-full sm:w-auto">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white w-full sm:w-auto transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="in-stock">In Stock</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] sm:min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 sm:px-5 text-sm font-medium text-gray-500">Product</th>
                <th className="text-left py-3 px-4 sm:px-5 text-sm font-medium text-gray-500 hidden sm:table-cell">Category</th>
                <th className="text-center py-3 px-4 sm:px-5 text-sm font-medium text-gray-500">Stock</th>
                <th className="text-center py-3 px-4 sm:px-5 text-sm font-medium text-gray-500 hidden md:table-cell">Min Stock</th>
                <th className="text-center py-3 px-4 sm:px-5 text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4 px-4 sm:px-5">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.model || '-'}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 sm:px-5 hidden sm:table-cell">
                    <span className="text-sm text-gray-600">{item.category || '-'}</span>
                  </td>
                  <td className="py-4 px-4 sm:px-5 text-center">
                    <span className={`text-lg font-bold ${item.stock === 0 ? 'text-red-600' : item.stock <= item.minStock ? 'text-yellow-600' : 'text-gray-800'}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="py-4 px-4 sm:px-5 text-center hidden md:table-cell">
                    <span className="text-sm text-gray-500">{item.minStock}</span>
                  </td>
                  <td className="py-4 px-4 sm:px-5 text-center">
                    {getStatusBadge(item.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No items found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatorDashboard;
