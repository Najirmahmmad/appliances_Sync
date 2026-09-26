import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Search, Edit2, Trash2, ArrowLeft,
  Package, ToggleLeft, ToggleRight, RefreshCw,
  Building2, Percent, IndianRupee, DollarSign,
  AlertCircle, CheckCircle, Shield
} from 'lucide-react';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import FormModal from '../../components/common/FormModal';
import { Button } from '../../components/ui/Button';
import { getUserRole } from '../../utils/auth.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const getToken = () => localStorage.getItem('token');

// Fixed dropdown options
const TAX_RATES = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' }
];

const UNITS = ['Pcs', 'Set', 'Nos', 'Kg', 'Ltr', 'Mtr', 'Box', 'Pack'];

const ItemMaster = () => {
  const navigate = useNavigate();
  const userRole = getUserRole()?.toLowerCase();
  // State
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAMC, setFilterAMC] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    dept_code: '',
    sale_rate: '',
    commission: 0,
    tax_rate: 18,
    unit: 'Pcs',
    hsn_code: '',
    status: 'Active',
    opening_stock: '',
    isAMC: 'No',
    LeadTimeDays: 0,
    rack_no: ''
  });

  // Fetch items
  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterDept !== 'All') params.append('dept_code', filterDept);
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (filterAMC !== 'All') params.append('isAMC', filterAMC);

      const response = await axios.get(`${API_URL}/items?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setItems(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  // Fetch active departments for dropdown
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_URL}/departments?status=Active`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setDepartments(response.data.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterDept, filterStatus, filterAMC]);

  // Reset form
  const resetForm = () => {
    setFormData({
      item_code: '',
      item_name: '',
      dept_code: '',
      sale_rate: '',
      commission: 0,
      tax_rate: 18,
      unit: 'Pcs',
      hsn_code: '',
      status: 'Active',
      opening_stock: '',
      isAMC: 'No',
      LeadTimeDays: 0,
      rack_no: ''
    });
    setIsEditing(false);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'sale_rate') {
      if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
        setFormData(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) }));
      }
    } else if (name === 'commission') {
      if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
        setFormData(prev => ({ ...prev, [name]: value === '' ? 0 : parseFloat(value) }));
      }
    } else if (name === 'opening_stock' || name === 'current_stock' || name === 'LeadTimeDays') {
      if (value === '' || !isNaN(parseFloat(value))) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle status toggle in form
  const handleStatusToggle = () => {
    setFormData(prev => ({
      ...prev,
      status: prev.status === 'Active' ? 'Inactive' : 'Active'
    }));
  };

  // Handle AMC toggle in form
  const handleAMCToggle = () => {
    setFormData(prev => ({
      ...prev,
      isAMC: prev.isAMC === 'Yes' ? 'No' : 'Yes'
    }));
  };

  // Open form for new item
  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  // Open form for editing
  const handleEdit = (item) => {
    setFormData({
      item_code: item.item_code,
      item_name: item.item_name,
      dept_code: item.dept_code || '',
      sale_rate: item.sale_rate || '',
      commission: item.commission || 0,
      tax_rate: parseFloat(item.tax_rate) || 0,
      unit: item.unit || 'Pcs',
      hsn_code: item.hsn_code || '',
      status: item.status,
      current_stock: item.current_stock,
      isAMC: item.isAMC || 'No',
      LeadTimeDays: item.LeadTimeDays || 0,
      rack_no: item.rack_no || ''
    });
    setIsEditing(true);
    setShowForm(true);
  };

  // Submit form (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccess('');

    // Client side validation (minimal, rely on backend mostly but basic checks good)
    if (!formData.item_code.trim()) { setError('Item Code is required'); setFormLoading(false); return; }
    if (!formData.item_name.trim()) { setError('Item Name is required'); setFormLoading(false); return; }
    if (formData.sale_rate === '') { setError('Sale Rate is required'); setFormLoading(false); return; }

    try {
      const payload = {
        ...formData,
        tax_rate: parseFloat(formData.tax_rate)
      };

      if (isEditing) {
        await axios.put(`${API_URL}/items/${formData.item_code}`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setSuccess('Item updated successfully');
      } else {
        await axios.post(`${API_URL}/items`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setSuccess('Item created successfully');
      }

      resetForm();
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete item
  const handleDelete = async (code) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/items/${code}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSuccess('Item deleted successfully');
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete item');
    }
  };

  // Toggle item status
  const handleToggleStatus = async (code) => {
    setError('');
    setSuccess('');
    try {
      const response = await axios.patch(`${API_URL}/items/${code}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSuccess(response.data.message);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Get tax rate badge color
  const getTaxBadgeColor = (rate) => {
    const taxRate = parseFloat(rate);
    if (taxRate === 0) return 'bg-gray-100 text-gray-700';
    if (taxRate === 5) return 'bg-green-100 text-green-700';
    if (taxRate === 12) return 'bg-blue-100 text-blue-700';
    if (taxRate === 18) return 'bg-amber-100 text-amber-700';
    if (taxRate === 28) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  // Define Columns
  const columns = useMemo(() => [
    {
      header: 'Code',
      field: 'item_code',
      className: 'font-mono text-blue-600 font-medium whitespace-nowrap',
      render: (row) => row.item_code
    },
    {
      header: 'Item Details',
      field: 'item_name',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-800">{row.item_name}</div>
          {row.hsn_code && <div className="text-xs text-gray-400">HSN: {row.hsn_code}</div>}
        </div>
      )
    },
    {
      header: 'Sale Rate',
      field: 'sale_rate',
      align: 'right',
      render: (row) => <span className="font-medium">₹{(parseFloat(row.sale_rate || 0)).toFixed(2)}</span>
    },
    {
      header: 'Comm.',
      field: 'commission',
      align: 'center',
      className: 'hidden sm:table-cell',
      render: (row) => <span>{(parseFloat(row.commission || 0)).toFixed(2)}%</span>
    },
    {
      header: 'Stock',
      field: 'current_stock',
      align: 'center',
      className: 'whitespace-nowrap',
      render: (row) => (
        <span className={`font-medium ${(parseFloat(row.current_stock || 0) < 5) ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
          {row.current_stock || 0} {row.unit}
        </span>
      )
    },
    {
      header: 'Tax',
      field: 'tax_rate',
      align: 'center',
      className: 'hidden md:table-cell',
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTaxBadgeColor(row.tax_rate)}`}>
          {parseFloat(row.tax_rate)}%
        </span>
      )
    },
    {
      header: 'Lead Time',
      field: 'LeadTimeDays',
      align: 'center',
      className: 'hidden sm:table-cell',
      render: (row) => <span>{row.LeadTimeDays || 0} Days</span>
    },
    {
      header: 'Rack No',
      field: 'rack_no',
      align: 'center',
      className: 'hidden sm:table-cell',
      render: (row) => <span className="font-mono">{row.rack_no || '-'}</span>
    },
    {
      header: 'AMC Status',
      field: 'isAMC',
      align: 'center',
      className: 'hidden sm:table-cell',
      render: (row) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${row.isAMC === 'Yes'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}>
          {row.isAMC === 'Yes' && <Shield className="w-3 h-3" />}
          {row.isAMC === 'Yes' ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      header: 'Status',
      field: 'status',
      align: 'center',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleStatus(row.item_code); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${row.status === 'Active'
            ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
        >
          {row.status === 'Active' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
          {row.status}
        </button>
      )
    },
    {
      header: 'Actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {userRole === 'admin' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(row.item_code); }}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ], [userRole]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="sm:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Add/Acc Master</h1>
            <p className="text-gray-500 text-sm mt-1">Manage products and inventory items</p>
          </div>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl animate-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1 relative group">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Code or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5
    bg-white
    text-gray-900
    placeholder-gray-400
    border border-gray-200
    rounded-lg
    focus:ring-2 focus:ring-blue-100
    focus:border-blue-500
    transition-all"    >
              <option value="All">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.dept_code} value={dept.dept_code}>
                  {dept.dept_name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5
    bg-white
    text-gray-900
    placeholder-gray-400
    border border-gray-200
    rounded-lg
    focus:ring-2 focus:ring-blue-100
    focus:border-blue-500
    transition-all"   >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={filterAMC}
              onChange={(e) => setFilterAMC(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            >
              <option value="All">All AMC</option>
              <option value="Yes">AMC Items</option>
              <option value="No">Non-AMC Items</option>
            </select>

            <button
              onClick={fetchItems}
              className="col-span-2 md:col-span-1 p-2.5 flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="md:hidden">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reusable Data Table */}
      <ResponsiveTable
        columns={columns}
        data={items}
        loading={loading}
        keyField="item_code"
        emptyMessage="No items found. Try adjusting your search or filters."
      />

      {/* Reusable Form Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={isEditing ? 'Edit Item' : 'Add New Item'}
        onSubmit={handleSubmit}
        loading={formLoading}
        width="max-w-4xl" // Wider modal for this form
        submitLabel={isEditing ? 'Update Item' : 'Create Item'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Item Code */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Item Code <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                name="item_code"
                value={formData.item_code}
                onChange={handleInputChange}
                disabled={isEditing}
                required
                placeholder="e.g., IFB-WM001"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 uppercase transition-all"
              />
            </div>
          </div>

          {/* Item Name */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleInputChange}
              required
              placeholder="e.g., IFB Front Load Washing Machine"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Department */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
            <div className="relative group">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <select
                name="dept_code"
                value={formData.dept_code}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 appearance-none bg-white transition-all cursor-pointer"
              >
                <option value="">-- Select Department --</option>
                {departments.map((dept) => (
                  <option key={dept.dept_code} value={dept.dept_code}>
                    {dept.dept_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sale Rate */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Sale Rate <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="number"
                name="sale_rate"
                value={formData.sale_rate}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Commission */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Commission (%)
            </label>
            <div className="relative group">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="number"
                name="commission"
                value={formData.commission}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Tax Rate */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Rate (GST)</label>
            <div className="relative group">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <select
                name="tax_rate"
                value={formData.tax_rate}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 appearance-none bg-white transition-all cursor-pointer"
              >
                {TAX_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Field */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {isEditing ? 'Current Stock' : 'Opening Stock'}
            </label>
            <input
              type="number"
              name={isEditing ? 'current_stock' : 'opening_stock'}
              value={isEditing ? (formData.current_stock || 0) : (formData.opening_stock || '')}
              onChange={handleInputChange}
              placeholder="0"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Unit */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 appearance-none bg-white transition-all cursor-pointer"
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>

          {/* HSN Code */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">HSN Code</label>
            <input
              type="text"
              name="hsn_code"
              value={formData.hsn_code}
              onChange={handleInputChange}
              placeholder="e.g., 84501100"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Lead Time Days */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead Time (Days)</label>
            <input
              type="number"
              name="LeadTimeDays"
              value={formData.LeadTimeDays}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Rack No */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rack No</label>
            <input
              type="text"
              name="rack_no"
              value={formData.rack_no || ''}
              onChange={handleInputChange}
              placeholder="e.g., RACK-A1"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Status Toggle */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <button
              type="button"
              onClick={handleStatusToggle}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${formData.status === 'Active'
                ? 'bg-green-50 border-green-200 text-green-700 w-full md:w-auto'
                : 'bg-red-50 border-red-200 text-red-700 w-full md:w-auto'
                }`}
            >
              {formData.status === 'Active' ? (
                <ToggleRight className="w-6 h-6" />
              ) : (
                <ToggleLeft className="w-6 h-6" />
              )}
              <span className="font-medium">{formData.status}</span>
            </button>
            {formData.status === 'Inactive' && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Inactive items cannot be selected in Sale/Purchase transactions
              </p>
            )}
          </div>

          {/* AMC Toggle */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">AMC Item</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleAMCToggle}
                className={`relative inline-flex items-center h-8 rounded-full w-14 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.isAMC === 'Yes' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform shadow-sm ${formData.isAMC === 'Yes' ? 'translate-x-7' : 'translate-x-1'
                    }`}
                />
              </button>
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${formData.isAMC === 'Yes' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${formData.isAMC === 'Yes' ? 'text-blue-600' : 'text-gray-600'}`}>
                  {formData.isAMC === 'Yes' ? 'Yes (AMC Item)' : 'No (Regular Item)'}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enable this if the item is part of an Annual Maintenance Contract
            </p>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default ItemMaster;