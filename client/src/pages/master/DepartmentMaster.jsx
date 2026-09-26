import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Search, Edit2, Trash2, ArrowLeft,
  Building2, ToggleLeft, ToggleRight, RefreshCw,
  AlertCircle, CheckCircle
} from 'lucide-react';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import FormModal from '../../components/common/FormModal';
import { Button } from '../../components/ui/Button';
import { getUserRole } from '../../utils/auth.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const getToken = () => localStorage.getItem('token');

const DepartmentMaster = () => {
  const navigate = useNavigate();
  const userRole = getUserRole()?.toLowerCase();
  // State
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    dept_code: '',
    dept_name: '',
    status: 'Active'
  });

  // Fetch departments
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'All') params.append('status', filterStatus);

      const response = await axios.get(`${API_URL}/departments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setDepartments(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDepartments();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterStatus]);

  // Reset form
  const resetForm = () => {
    setFormData({
      dept_code: '',
      dept_name: '',
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

  // Handle status toggle in form
  const handleStatusToggle = () => {
    setFormData(prev => ({
      ...prev,
      status: prev.status === 'Active' ? 'Inactive' : 'Active'
    }));
  };

  // Open form for new department
  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  // Open form for editing
  const handleEdit = (department) => {
    setFormData({
      dept_code: department.dept_code,
      dept_name: department.dept_name,
      status: department.status
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
      if (isEditing) {
        await axios.put(`${API_URL}/departments/${formData.dept_code}`, formData, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setSuccess('Department updated successfully');
      } else {
        await axios.post(`${API_URL}/departments`, formData, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setSuccess('Department created successfully');
      }

      resetForm();
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete department
  const handleDelete = async (code) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;

    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/departments/${code}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSuccess('Department deleted successfully');
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete department');
    }
  };

  // Toggle department status
  const handleToggleStatus = async (code) => {
    setError('');
    setSuccess('');
    try {
      const response = await axios.patch(`${API_URL}/departments/${code}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSuccess(response.data.message);
      fetchDepartments();
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
      header: 'Code',
      field: 'dept_code',
      className: 'font-mono text-blue-600 font-medium w-24',
      render: (row) => row.dept_code
    },
    {
      header: 'Department Name',
      field: 'dept_name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-700">{row.dept_name}</span>
        </div>
      )
    },
    {
      header: 'Status',
      field: 'status',
      align: 'center',
      className: 'w-32',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleStatus(row.dept_code); }}
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
      className: 'w-24',
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
              onClick={(e) => { e.stopPropagation(); handleDelete(row.dept_code); }}
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
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Department Master</h1>
            <p className="text-gray-500 text-sm mt-1">Manage organization departments</p>
          </div>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
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
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by Code or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex gap-3">
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

            <button
              onClick={fetchDepartments}
              className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Reusable Data Table */}
      <ResponsiveTable
        columns={columns}
        data={departments}
        loading={loading}
        keyField="dept_code"
        emptyMessage="No departments found. Try adjusting your search."
      />

      {/* Reusable Form Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={isEditing ? 'Edit Department' : 'Add New Department'}
        onSubmit={handleSubmit}
        loading={formLoading}
        submitLabel={isEditing ? 'Update Department' : 'Create Department'}
      >
        <div className="space-y-5">
          {/* Department Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Department Code <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                name="dept_code"
                value={formData.dept_code}
                onChange={handleInputChange}
                disabled={isEditing}
                required
                placeholder="e.g., SALES"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 uppercase transition-all"
              />
            </div>
          </div>

          {/* Department Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="dept_name"
              value={formData.dept_name}
              onChange={handleInputChange}
              required
              placeholder="e.g., Sales Department"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Status Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <button
              type="button"
              onClick={handleStatusToggle}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border w-full transition-all ${formData.status === 'Active'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
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

export default DepartmentMaster;
