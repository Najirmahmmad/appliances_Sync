
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    FileText, Calendar, RefreshCw,
    AlertCircle, Download, DollarSign, Package, User, Table
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getToken } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const isFreeRecord = (item) => {
    return (parseFloat(item.rate) || 0) === 0 && 
           (parseFloat(item.tax_amt) || 0) === 0 && 
           (parseFloat(item.net_amt) || 0) === 0;
};

const SaleRegisterReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState('');
    const [items, setItems] = useState([]);
    const [itemCode, setItemCode] = useState('');

    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [createdBy, setCreatedBy] = useState('All');
    const [users, setUsers] = useState([]);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params: { status: 'Active' }
            });
            setUsers(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const fetchItems = async () => {
        try {
            const response = await axios.get(`${API_URL}/items`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params: { active_only: 'true' }
            });
            setItems(response.data.data);
        } catch (err) {
            console.error('Failed to fetch items:', err);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const params = { startDate, endDate, created_by: createdBy };
            if (itemCode) params.item_code = itemCode;

            const response = await axios.get(`${API_URL}/reports/sale-register`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params
            });
            setData(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [startDate, endDate, itemCode, createdBy]);

    const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.net_amt) || 0), 0);
    const totalFreeQty = data.reduce((sum, item) => sum + (isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0), 0);
    const totalQty = data.reduce((sum, item) => sum + (!isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0), 0);
    const totalTax = data.reduce((sum, item) => sum + (parseFloat(item.tax_amt) || 0), 0);

    const handlePrint = () => {
        const doc = new jsPDF();
        doc.text('Sale Register Report', 14, 20);
        doc.setFontSize(10);
        doc.text(`From: ${format(new Date(startDate), 'dd/MM/yyyy')} To: ${format(new Date(endDate), 'dd/MM/yyyy')}`, 14, 30);
        if (itemCode) {
            const selectedItem = items.find(i => i.item_code === itemCode);
            if (selectedItem) {
                doc.text(`Item: ${selectedItem.item_name}`, 14, 35);
            }
        }

        autoTable(doc, {
            startY: itemCode ? 45 : 40,
            head: [['Date', 'Bill No', 'Created By', 'Party Name', 'Item', 'Free Qty', 'Qty', 'Rate', 'Tax', 'Amount']],
            body: data.map(item => [
                format(new Date(item.vouch_date), 'dd/MM/yyyy'),
                `${item.book_code}-${item.vouch_no}`,
                item.created_by_name || '-',
                item.party_name,
                item.item_name,
                isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0,
                !isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0,
                item.rate,
                (parseFloat(item.tax_amt) || 0).toFixed(2),
                (parseFloat(item.net_amt) || 0).toFixed(2)
            ]),
            foot: [['Total', '', '', '', '', totalFreeQty.toString(), totalQty.toString(), '', totalTax.toFixed(2), totalAmount.toFixed(2)]]
        });
        window.open(doc.output('bloburl'));
    };

    const handleExcelExport = () => {
        const exportData = data.map(item => ({
            'Date': format(new Date(item.vouch_date), 'dd/MM/yyyy'),
            'Bill No': `${item.book_code}-${item.vouch_no}`,
            'Created By': item.created_by_name || '-',
            'Party Name': item.party_name,
            'Item': item.item_name,
            'Free Qty': isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0,
            'Qty': !isFreeRecord(item) ? (parseFloat(item.qty) || 0) : 0,
            'Rate': parseFloat(item.rate) || 0,
            'Tax': parseFloat(item.tax_amt) || 0,
            'Amount': parseFloat(item.net_amt) || 0
        }));

        exportData.push({
            'Date': 'Total',
            'Bill No': '',
            'Created By': '',
            'Party Name': '',
            'Item': '',
            'Free Qty': totalFreeQty,
            'Qty': totalQty,
            'Rate': '',
            'Tax': totalTax,
            'Amount': totalAmount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sale Register");
        XLSX.writeFile(wb, `Sale_Register_${format(new Date(startDate), 'yyyyMMdd')}_to_${format(new Date(endDate), 'yyyyMMdd')}.xlsx`);
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Mobile Sticky Header */}
            <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-800">Sale Register</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExcelExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg"
                    >
                        <Table className="w-4 h-4" />
                        Excel
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg"
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Sale Register Report</h1>
                    <p className="text-gray-500 mt-1">View detailed sale item report</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExcelExport}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Table className="w-4 h-4 text-green-600" />
                        Export Excel
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Download className="w-4 h-4 text-blue-600" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Mobile Horizontal Scrollable Filters */}
            <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4">
                <div className="flex gap-3 min-w-max">
                    <div className="flex-shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-36 pl-8 pr-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-36 pl-8 pr-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Item</label>
                        <div className="relative">
                            <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={itemCode}
                                onChange={(e) => setItemCode(e.target.value)}
                                className="w-40 pl-8 pr-2 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Items</option>
                                {items.map((item) => (
                                    <option key={item.item_code} value={item.item_code}>
                                        {item.item_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Created By</label>
                        <div className="relative">
                            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={createdBy}
                                onChange={(e) => setCreatedBy(e.target.value)}
                                className="w-32 pl-8 pr-2 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="All">All</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={itemCode}
                                onChange={(e) => setItemCode(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            >
                                <option value="">All Items</option>
                                {items.map((item) => (
                                    <option key={item.item_code} value={item.item_code}>
                                        {item.item_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Created By Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={createdBy}
                                onChange={(e) => setCreatedBy(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            >
                                <option value="All">All Users</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Total Summary Bar */}
            <div className="md:hidden bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        <span className="text-sm opacity-90">Total Free Qty</span>
                    </div>
                    <span className="text-lg font-bold">{totalFreeQty}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/20 pt-2">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        <span className="text-sm opacity-90">Total Qty</span>
                    </div>
                    <span className="text-lg font-bold">{totalQty}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/20 pt-2">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm opacity-90">Total Amount</span>
                    </div>
                    <span className="text-lg font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>
            </div>

            {/* Data Table / Card View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-12 text-red-500">
                        <AlertCircle className="w-6 h-6 mr-2" />
                        {error}
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No data found</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {data.map((item, index) => (
                                <div key={index} className="p-4 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                                            <p className="text-xs text-blue-600 font-mono">{item.book_code}-{item.vouch_no}</p>
                                        </div>
                                        <span className="text-green-600 font-bold">₹{(parseFloat(item.net_amt) || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span>{format(new Date(item.vouch_date), 'dd/MM/yyyy')}</span>
                                        <span className="text-gray-300">|</span>
                                        <span>{item.party_name}</span>
                                        {item.created_by_name && (
                                            <>
                                                <span className="text-gray-300">|</span>
                                                <span className="text-gray-500">By: {item.created_by_name}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        {isFreeRecord(item) ? (
                                            <span className="text-gray-500">Free Qty: <span className="text-gray-800 font-semibold">{item.qty}</span></span>
                                        ) : (
                                            <span className="text-gray-500">Qty: <span className="text-gray-800">{item.qty}</span></span>
                                        )}
                                        <span className="text-gray-500">Rate: <span className="text-gray-800">{item.rate}</span></span>
                                        <span className="text-gray-500">Tax: <span className="text-gray-800">{(parseFloat(item.tax_amt) || 0).toFixed(2)}</span></span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bill No</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created By</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Party Name</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Item</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Free Qty</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Qty</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Rate</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tax</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {format(new Date(item.vouch_date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-blue-600 font-mono">
                                                {item.book_code}-{item.vouch_no}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{item.created_by_name || '-'}</td>
                                            <td className="py-3 px-4 text-sm text-gray-800">{item.party_name}</td>
                                            <td className="py-3 px-4 text-sm text-gray-800">{item.item_name}</td>
                                            <td className="py-3 px-4 text-sm text-right text-gray-800 font-semibold text-orange-600">
                                                {isFreeRecord(item) ? item.qty : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right text-gray-800">
                                                {!isFreeRecord(item) ? item.qty : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right text-gray-600">{item.rate}</td>
                                            <td className="py-3 px-4 text-sm text-right text-gray-600">
                                                {(parseFloat(item.tax_amt) || 0).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right font-bold text-gray-800">
                                                ₹{(parseFloat(item.net_amt) || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                                    <tr>
                                        <td colSpan="5" className="py-3 px-4 text-right text-gray-800">Total:</td>
                                        <td className="py-3 px-4 text-right text-gray-800 text-orange-600">{totalFreeQty}</td>
                                        <td className="py-3 px-4 text-right text-gray-800">{totalQty}</td>
                                        <td className="py-3 px-4 text-right text-gray-600"></td>
                                        <td className="py-3 px-4 text-right text-gray-600">
                                            ₹{totalTax.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-lg text-green-700">
                                            ₹{totalAmount.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SaleRegisterReport;
