import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search, Calendar, RefreshCw, AlertCircle, CheckCircle,
    User, FileText, Plus, Edit2, Trash2, X
} from 'lucide-react';
import { format } from 'date-fns';
import { getToken } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const StockList = ({ type = 'ST' }) => {
    // State
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [technicianId, setTechnicianId] = useState('');
    const [technicians, setTechnicians] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Fetch Technicians for Filter
    const fetchTechnicians = async () => {
        try {
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params: { role: 'Technician' }
            });
            const techs = response.data.data.filter(u => u.role === 'Technician');
            setTechnicians(techs);
        } catch (err) {
            console.error('Failed to fetch technicians:', err);
        }
    };

    // Fetch Transfers
    const fetchTransfers = async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (technicianId) params.append('technician_id', technicianId);
            params.append('book_code', type);
            params.append('page', page);
            params.append('limit', limit);

            const response = await axios.get(`${API_URL}/stock/transfers?${params.toString()}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            setTransfers(response.data.data);
            if (response.data.pagination) {
                setTotalPages(response.data.pagination.totalPages);
                setTotalRecords(response.data.pagination.total);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch stock transfers');
        } finally {
            setLoading(false);
        }
    };

    // Delete Transfer
    const handleDelete = async (bookCode, vouchNo) => {
        setError('');
        setSuccess('');

        try {
            await axios.delete(`${API_URL}/stock/${bookCode}/${vouchNo}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            setSuccess('Stock transfer deleted successfully');
            fetchTransfers();
            setShowDeleteConfirm(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete stock transfer');
        }
    };

    // Clear messages
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(''), setError('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    useEffect(() => {
        fetchTechnicians();
    }, []);

    // Reset page to 1 on filter changes
    useEffect(() => {
        setPage(1);
    }, [startDate, endDate, technicianId, type]);

    useEffect(() => {
        fetchTransfers();
    }, [startDate, endDate, technicianId, type, page, limit]);


    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Sticky Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold text-gray-800">
                        {type === 'STR' ? 'Stock Returns' : 'Stock Transfers'}
                    </h1>
                    <button
                        onClick={() => window.location.href = type === 'STR' ? '/transaction/stock-transfer-return' : '/transaction/stock-transfer'}
                        className="p-2 bg-blue-600 text-white rounded-lg"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="space-y-4 md:space-y-6 px-3 md:px-4 pt-4 md:pt-6 pb-6">
                {/* Desktop Header */}
                <div className="hidden md:flex md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {type === 'STR' ? 'Stock Return List' : 'Stock Transfer List'}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {type === 'STR' ? 'View and track stock returns from technicians' : 'View and track stock transfers to technicians'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchTransfers}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-semibold text-sm rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-500 group-hover:text-erp-primary transition-colors ${loading ? 'animate-spin text-erp-primary' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => window.location.href = type === 'STR' ? '/transaction/stock-transfer-return' : '/transaction/stock-transfer'}
                            className="flex items-center gap-2 px-4 py-2 bg-erp-primary text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-erp-primary/20"
                        >
                            <Plus className="w-5 h-5" />
                            {type === 'STR' ? 'New Return' : 'New Transfer'}
                        </button>
                    </div>
                </div>

                {/* Filters - Mobile Friendly */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    {/* Mobile: Horizontal scroll filters */}
                    <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                        {/* Start Date */}
                        <div className="relative min-w-[140px] md:min-w-0 flex-shrink-0">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 md:py-2.5 text-base md:text-sm bg-gray-50 md:bg-white border border-gray-200 rounded-xl md:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* End Date */}
                        <div className="relative min-w-[140px] md:min-w-0 flex-shrink-0">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 md:py-2.5 text-base md:text-sm bg-gray-50 md:bg-white border border-gray-200 rounded-xl md:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Technician Filter */}
                        <div className="relative min-w-[180px] md:min-w-0 flex-shrink-0">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={technicianId}
                                onChange={(e) => setTechnicianId(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 md:py-2.5 text-base md:text-sm bg-gray-50 md:bg-white border border-gray-200 rounded-xl md:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                            >
                                <option value="">All Technicians</option>
                                {technicians.map((tech) => (
                                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : transfers.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No {type === 'STR' ? 'stock returns' : 'stock transfers'} found</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {transfers.map((transfer) => (
                                    <div key={`${transfer.book_code}-${transfer.vouch_no}`} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-sm font-medium text-blue-600">
                                                {transfer.book_code}-{transfer.vouch_no}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {format(new Date(transfer.vouch_date), 'dd/MM/yyyy')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-800 font-medium">{transfer.technician_name}</span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {transfer.remarks || '-'}
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                            <button
                                                onClick={() => window.location.href = `/transaction/${type === 'STR' ? 'stock-transfer-return' : 'stock-transfer'}/${transfer.book_code}/${transfer.vouch_no}`}
                                                className="flex-1 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg font-medium active:bg-blue-100"
                                            >
                                                <Edit2 className="w-4 h-4 inline mr-1" /> Edit
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm({ bookCode: transfer.book_code, vouchNo: transfer.vouch_no })}
                                                className="py-2 px-3 text-sm text-red-600 bg-red-50 rounded-lg font-medium active:bg-red-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left font-inter border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold tracking-widest">
                                            <th className="py-4 px-6 whitespace-nowrap">Voucher Details</th>
                                            <th className="py-4 px-6">Technician</th>
                                            <th className="py-4 px-6">Remarks</th>
                                            <th className="py-4 px-6 text-center flex-shrink-0 w-32">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {transfers.map((transfer) => (
                                            <tr key={`${transfer.book_code}-${transfer.vouch_no}`} className="hover:bg-slate-50/50 transition-colors group">
                                                
                                                {/* Voucher Details */}
                                                <td className="py-4 px-6 align-middle">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-mono text-[13px] font-semibold text-slate-800 tracking-tight flex items-center gap-1.5">
                                                            {transfer.book_code}-{transfer.vouch_no}
                                                        </span>
                                                        <span className="text-[12px] text-slate-500 font-medium">
                                                            {format(new Date(transfer.vouch_date), 'dd MMM yyyy')}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Technician Column */}
                                                <td className="py-4 px-6 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-erp-primary/10 text-erp-primary flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100/50 shrink-0">
                                                            {transfer.technician_name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-800 group-hover:text-erp-primary transition-colors">
                                                                {transfer.technician_name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Remarks Column */}
                                                <td className="py-4 px-6 align-middle">
                                                    <span className="text-[13px] text-slate-600 font-medium">
                                                        {transfer.remarks || '-'}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-4 px-6 align-middle">
                                                    <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => window.location.href = `/transaction/${type === 'STR' ? 'stock-transfer-return' : 'stock-transfer'}/${transfer.book_code}/${transfer.vouch_no}`}
                                                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 hover:text-erp-primary hover:shadow-sm transition-all shadow-sm"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm({ bookCode: transfer.book_code, vouchNo: transfer.vouch_no })}
                                                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:shadow-sm transition-all shadow-sm"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            {!loading && (
                                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <p className="text-sm text-gray-500">
                                        Showing {totalRecords === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} records
                                    </p>
                                    <div className="flex gap-2 items-center">
                                        <select 
                                            value={limit} 
                                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} 
                                            className="border border-gray-200 rounded p-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value={50}>50 / page</option>
                                            <option value={100}>100 / page</option>
                                            <option value={150}>150 / page</option>
                                            <option value={200}>200 / page</option>
                                        </select>
                                        <div className="flex gap-1 items-center">
                                            <button 
                                                disabled={page === 1} 
                                                onClick={() => setPage(page - 1)} 
                                                className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                            >
                                                Prev
                                            </button>
                                            <span className="px-3 py-1 text-sm text-gray-600 whitespace-nowrap">Page {page} of {totalPages}</span>
                                            <button 
                                                disabled={page === totalPages || totalPages === 0} 
                                                onClick={() => setPage(page + 1)} 
                                                className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                            <div className="flex items-center justify-between p-5 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-800">Confirm Delete</h2>
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <p className="text-gray-600">
                                    Are you sure you want to delete stock transfer <strong>{showDeleteConfirm.bookCode}-{showDeleteConfirm.vouchNo}</strong>?
                                    This will revert the stock changes.
                                </p>
                            </div>

                            <div className="flex gap-3 p-5 border-t border-gray-200">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(showDeleteConfirm.bookCode, showDeleteConfirm.vouchNo)}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockList;
