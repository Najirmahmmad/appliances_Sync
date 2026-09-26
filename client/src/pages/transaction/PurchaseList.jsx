import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Edit2, Trash2, Eye, Search, Calendar,
    RefreshCw, AlertCircle, CheckCircle, X,
    Plus, User, FileText, Printer
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getToken } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const PurchaseList = () => {
    // State
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Fetch purchases
    const fetchPurchases = async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('page', page);
            params.append('limit', limit);

            const response = await axios.get(`${API_URL}/purchases?${params.toString()}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            setPurchases(response.data.data);
            if (response.data.pagination) {
                setTotalPages(response.data.pagination.totalPages);
                setTotalRecords(response.data.pagination.total);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch purchases');
        } finally {
            setLoading(false);
        }
    };

    // Reset page to 1 on filter changes
    useEffect(() => {
        setPage(1);
    }, [searchTerm, startDate, endDate]);

    useEffect(() => {
        fetchPurchases();
    }, [searchTerm, startDate, endDate, page, limit]);

    // Delete purchase
    const handleDelete = async (vouchNo) => {
        setError('');
        setSuccess('');

        try {
            await axios.delete(`${API_URL}/purchases/${vouchNo}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            setSuccess('Purchase transaction deleted successfully');
            fetchPurchases();
            setShowDeleteConfirm(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete purchase transaction');
        }
    };

    // Print List
    const handlePrintList = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        let y = 15;

        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Purchase Transaction List', 105, y, { align: 'center' });
        y += 10;

        autoTable(doc, {
            startY: y,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            head: [['Voucher No.', 'Date', 'Supplier Name', 'Phone', 'Quantity', 'Amount']],
            body: purchases.map((p) => [
                `${p.book_code}-${p.vouch_no}`,
                format(new Date(p.vouch_date), 'dd/MM/yyyy'),
                p.party_name,
                p.party_phone || '-',
                p.total_qty,
                `₹${parseFloat(p.net_amount).toFixed(2)}`
            ]),
        });

        window.open(doc.output('bloburl'));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Sticky Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold text-gray-800">Purchases</h1>
                    <button
                        onClick={() => window.location.href = '/transaction/purchase/new'}
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
                        <h1 className="text-2xl font-bold text-gray-800">Purchase Transactions</h1>
                        <p className="text-gray-500 mt-1">View and manage stock purchases</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchPurchases}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-semibold text-sm rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-500 group-hover:text-erp-primary transition-colors ${loading ? 'animate-spin text-erp-primary' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => window.location.href = '/transaction/purchase/new'}
                            className="flex items-center gap-2 px-4 py-2 bg-erp-primary text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-erp-primary/20"
                        >
                            <Plus className="w-5 h-5" />
                            Add New Purchase
                        </button>
                        <button
                            onClick={handlePrintList}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-semibold text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Printer className="w-4 h-4 text-slate-500" />
                            Print List
                        </button>
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

                {/* Filters - Mobile Friendly */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    {/* Mobile: Horizontal scroll filters */}
                    <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                        {/* Search */}
                        <div className="relative min-w-[200px] md:min-w-0 flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search supplier..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 md:py-2 text-base md:text-sm border border-gray-200 rounded-xl md:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 md:bg-white"
                            />
                        </div>

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
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : purchases.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No purchase transactions found</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {purchases.map((purchase) => (
                                    <div key={`${purchase.book_code}-${purchase.vouch_no}`} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-sm font-medium text-blue-600">
                                                {purchase.book_code}-{purchase.vouch_no}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {format(new Date(purchase.vouch_date), 'dd/MM/yyyy')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-800 font-medium">{purchase.party_name}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">{purchase.party_phone || '-'}</span>
                                            <span className="font-bold text-blue-600 text-lg">
                                                ₹{parseFloat(purchase.net_amount).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                            <button
                                                onClick={() => window.location.href = `/transaction/purchase/${purchase.vouch_no}`}
                                                className="flex-1 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg font-medium active:bg-blue-100"
                                            >
                                                <Eye className="w-4 h-4 inline mr-1" /> View
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(purchase)}
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
                                            <th className="py-4 px-6">Supplier</th>
                                            <th className="py-4 px-6 text-center">Volume</th>
                                            <th className="py-4 px-6 text-right">Net Amount</th>
                                            <th className="py-4 px-6 text-center flex-shrink-0 w-44">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {purchases.map((purchase) => (
                                            <tr key={`${purchase.book_code}-${purchase.vouch_no}`} className="hover:bg-slate-50/50 transition-colors group">
                                                
                                                {/* Voucher Details */}
                                                <td className="py-4 px-6 align-middle">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-mono text-[13px] font-semibold text-slate-800 tracking-tight flex items-center gap-1.5">
                                                            {purchase.book_code}-{purchase.vouch_no}
                                                        </span>
                                                        <span className="text-[12px] text-slate-500 font-medium">
                                                            {format(new Date(purchase.vouch_date), 'dd MMM yyyy')}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Supplier Column */}
                                                <td className="py-4 px-6 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-erp-primary/10 text-erp-primary flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100/50 shrink-0">
                                                            {purchase.party_name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-800 group-hover:text-erp-primary transition-colors">
                                                                {purchase.party_name}
                                                            </span>
                                                            <span className="text-[12px] text-slate-500 font-medium tracking-wide">
                                                                {purchase.party_phone || '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Quantity Badge */}
                                                <td className="py-4 px-6 text-center align-middle">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100/80 text-slate-600 border border-slate-200">
                                                        {parseFloat(purchase.total_qty || 0)} items
                                                    </span>
                                                </td>

                                                {/* Net Amount Field */}
                                                <td className="py-4 px-6 text-right align-middle">
                                                    <div className="flex flex-col items-end">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-bold shadow-sm border ${
                                                            purchase.net_amount > 10000 
                                                                ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        }`}>
                                                            ₹{parseFloat(purchase.net_amount).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-4 px-6 align-middle">
                                                    <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => window.location.href = `/transaction/purchase/${purchase.vouch_no}`}
                                                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 hover:text-erp-primary hover:shadow-sm transition-all shadow-sm"
                                                            title="View/Edit"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(purchase)}
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

                {/* Delete Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                            <div className="flex items-center justify-between p-5 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-800">Confirm Delete</h2>
                                <button onClick={() => setShowDeleteConfirm(null)} className="p-1 hover:bg-gray-100 rounded">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="p-5">
                                <p className="text-gray-600">
                                    Are you sure you want to delete Purchase <strong>{showDeleteConfirm.book_code}-{showDeleteConfirm.vouch_no}</strong>?
                                    <br />This will <span className="text-red-600 font-bold">REDUCE stock</span> for the items in this purchase.
                                </p>
                            </div>
                            <div className="flex gap-3 p-5 border-t border-gray-200">
                                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={() => handleDelete(showDeleteConfirm.vouch_no)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseList;
