import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IndianRupee, ShoppingBag, TrendingUp, Award, RefreshCw, FileText, Package, ArrowRight, Receipt } from 'lucide-react';
import StatCard from './StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getToken } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const TechnicianDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    commissionData: [],
    salesBreakdown: [],
    stats: {
      totalCommission: 0,
      totalQuantity: 0,
      totalProducts: 0,
      avgCommission: 0,
      bestDay: '-',
      maxComm: 0
    }
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${API_URL}/dashboard/technician`, {
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const { commissionData, salesBreakdown, stats } = data;

  // Shortcut cards configuration
  const shortcutCards = [
    {
      title: 'Sale Invoice',
      description: 'Create new sale invoice',
      icon: Receipt,
      color: 'blue',
      path: '/transaction/sale',
      gradient: 'from-blue-500 to-blue-600'
    },
    // {
    //   title: 'Sale Report',
    //   description: 'View sales report',
    //   icon: FileText,
    //   color: 'green',
    //   path: '/report/sale-register',
    //   gradient: 'from-green-500 to-green-600'
    // },
    {
      title: 'Commission Report',
      description: 'View your commissions',
      icon: IndianRupee,
      color: 'purple',
      path: '/report/commission',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Current Stock',
      description: 'View your bag stock',
      icon: Package,
      color: 'orange',
      path: '/report/current-stock',
      gradient: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {shortcutCards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.path)}
            className="group relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 text-left hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            {/* Gradient accent */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.gradient}`} />
            
            <div className="flex items-start justify-between">
              <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg`}>
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="mt-3 sm:mt-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">{card.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{card.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Last 7 Days Commission"
          value={`₹${stats.totalCommission.toLocaleString()}`}
          subtitle="Total earned this week"
          icon={IndianRupee}
          color="green"
          trend="neutral"
        />
        <StatCard
          title="Total Products Sold"
          value={stats.totalQuantity}
          subtitle={`${stats.totalProducts} different products`}
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="Avg Daily Commission"
          value={`₹${stats.avgCommission.toLocaleString()}`}
          subtitle="Per day average"
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Best Day"
          value={stats.bestDay}
          subtitle={`₹${stats.maxComm.toLocaleString()} earned`}
          icon={Award}
          color="yellow"
        />
      </div>

      {/* Commission Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Last 7 Days Commission</h3>
        <div className="h-64 sm:h-72 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={commissionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`₹${value.toLocaleString()}`, 'Commission']}
              />
              <Bar
                dataKey="commission"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Commission Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Commission Breakdown by Product</h3>
          <p className="text-sm text-gray-500 mt-1">Your sales performance for the last 7 days</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-5 text-sm font-medium text-gray-500">Product</th>
                <th className="text-center py-3 px-5 text-sm font-medium text-gray-500">Qty Sold</th>
                <th className="text-center py-3 px-5 text-sm font-medium text-gray-500 hidden sm:table-cell">Per Unit</th>
                <th className="text-right py-3 px-5 text-sm font-medium text-gray-500">Total Commission</th>
              </tr>
            </thead>
            <tbody>
              {salesBreakdown.length > 0 ? (
                salesBreakdown.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-4 px-5">
                      <p className="font-medium text-gray-800 text-sm">{item.product}</p>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.quantity} units
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center hidden sm:table-cell">
                      <span className="text-sm text-gray-600">₹{parseFloat(item.unitCommission).toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <span className="text-lg font-bold text-green-600">₹{parseFloat(item.totalCommission).toLocaleString()}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="text-center py-4 text-gray-500">No sales in the last 7 days</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-green-50">
                <td className="py-4 px-5 font-semibold text-gray-800">Total</td>
                <td className="py-4 px-5 text-center">
                  <span className="font-bold text-gray-800">{stats.totalQuantity} units</span>
                </td>
                <td className="py-4 px-5 hidden sm:table-cell"></td>
                <td className="py-4 px-5 text-right">
                  <span className="text-xl font-bold text-green-600">₹{stats.totalCommission.toLocaleString()}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
