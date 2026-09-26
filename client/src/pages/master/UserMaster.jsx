import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, ArrowLeft,
  User, Phone, Mail, Shield, CheckCircle, AlertCircle,
  ToggleLeft, ToggleRight, RefreshCw, Lock
} from 'lucide-react';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import FormModal from '../../components/common/FormModal';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { getUserRole } from '../../utils/auth.js';

const API_URL = import.meta.env.VITE_API_URL;

const UserMaster = () => {
  const navigate = useNavigate();
  const userRole = getUserRole()?.toLowerCase();
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'Operator',
    status: 'Active'
  });

  // Get token from localStorage
  const getToken = () => localStorage.getItem('token');

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterRole !== 'All') params.append('role', filterRole);
      if (filterStatus !== 'All') params.append('status', filterStatus);

      const response = await axios.get(`${API_URL}/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      setUsers(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterRole, filterStatus]);

  // Reset form
  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'Operator',
      status: 'Active'
    });
    setIsEditing(false);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle phone input - only digits, max 10
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 10) {
      setFormData(prev => ({ ...prev, phone: value }));
    }
  };

  // Handle status toggle in form
  const handleStatusToggle = () => {
    setFormData(prev => ({
      ...prev,
      status: prev.status === 'Active' ? 'Inactive' : 'Active'
    }));
  };

  // Open form for new user
  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  // Open form for editing
  const handleEdit = (user) => {
    setFormData({
      id: user.id,
      name: user.name,
      phone: user.phone || '',
      email: user.email || '',
      password: '',
      role: user.role,
      status: user.status
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

    try {
      const payload = { ...formData };

      // Don't send empty password on update
      if (isEditing && !payload.password) {
        delete payload.password;
      }

      if (isEditing) {
        await axios.put(`${API_URL}/users/${formData.id}`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setSuccess('User updated successfully');
      } else {
        await axios.post(`${API_URL}/users`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setSuccess('User created successfully');
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete user
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Toggle user status
  const handleToggleStatus = async (id) => {
    setError('');
    setSuccess('');
    try {
      const response = await axios.patch(`${API_URL}/users/${id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSuccess(response.data.message);
      fetchUsers();
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

  // Define Columns
  const columns = useMemo(() => [
    {
      header: 'ID',
      field: 'id',
      className: 'font-mono text-gray-800 font-medium',
      render: (row) => row.id
    },
    {
      header: 'User Details',
      field: 'name',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-800">{row.name}</div>
          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            {row.email && <span>{row.email}</span>}
          </div>
        </div>
      )
    },
    {
      header: 'Contact',
      field: 'phone',
      className: 'hidden sm:table-cell',
      render: (row) => (
        <span className="text-gray-600">{row.phone || '-'}</span>
      )
    },
    {
      header: 'Role',
      field: 'role',
      align: 'center',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.role === 'Admin'
          ? 'bg-purple-100 text-purple-800'
          : row.role === 'Operator'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-green-100 text-green-800'
          }`}>
          {row.role}
        </span>
      )
    },
    {
      header: 'Status',
      field: 'status',
      align: 'center',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleStatus(row.id); }}
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
              onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
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
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">User Master</h1>
            <p className="text-gray-500 text-sm mt-1">Manage system users and access</p>
          </div>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add User</span>
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
      <Card>
        <CardBody className="py-4">
          <div className="flex flex-col xl:flex-row gap-4">
            <div className="flex-1">
              <Input
                icon={Search}
                type="text"
                placeholder="Search by ID, Name, Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Operator">Operator</option>
                <option value="Technician">Technician</option>
              </Select>

              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>

              <Button
                variant="outline"
                onClick={fetchUsers}
                className="col-span-2 lg:col-span-1 gap-2 border-slate-200 text-slate-500 hover:text-erp-primary"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="lg:hidden">Refresh</span>
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Reusable Data Table */}
      <ResponsiveTable
        columns={columns}
        data={users}
        loading={loading}
        keyField="id"
        emptyMessage="No users found. Try adjusting your filters."
      />

      {/* Reusable Form Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={isEditing ? 'Edit User' : 'Add New User'}
        onSubmit={handleSubmit}
        loading={formLoading}
        width="max-w-2xl"
        submitLabel={isEditing ? 'Update User' : 'Create User'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* User ID */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              User ID <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                disabled={isEditing}
                required
                placeholder="e.g., EMP001"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
              />
            </div>
          </div>

          {/* Name */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Full Name"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Phone */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone <span className="text-gray-400 text-xs">(10 digits)</span>
            </label>
            <div className="relative group">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={10}
                pattern="[0-9]{10}"
                inputMode="numeric"
                placeholder="Enter 10-digit number"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>
            {formData.phone && formData.phone.length < 10 && (
              <p className="text-xs text-amber-600 mt-1">
                {10 - formData.phone.length} more digit{10 - formData.phone.length !== 1 ? 's' : ''} required
              </p>
            )}
          </div>

          {/* Email */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="user@example.com"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Role */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 appearance-none bg-white transition-all cursor-pointer"
              >
                <option value="Admin">Admin</option>
                <option value="Operator">Operator</option>
                <option value="Technician">Technician</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password {!isEditing && <span className="text-red-500">*</span>}
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!isEditing}
                placeholder={isEditing ? 'Fill only to change' : 'Enter password'}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="col-span-1 md:col-span-2">
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
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default UserMaster;
