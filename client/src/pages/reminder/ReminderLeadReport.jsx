import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ClipboardList, RefreshCw, AlertCircle, Download, Package, User, Table
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getToken } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const ReminderLeadReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState('');
    const [users, setUsers] = useState([]);
    const [targetItems, setTargetItems] = useState([]);

    const [createdBy, setCreatedBy] = useState('All');
    const [itemCode, setItemCode] = useState('All');

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

    const fetchTargetItems = async () => {
        try {
            const response = await axios.get(`${API_URL}/items`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params: { active_only: 'true' }
            });
            const items = response.data.data || [];
            const filtered = items.filter(item => item.LeadTimeDays && item.LeadTimeDays > 0);
            setTargetItems(filtered);
        } catch (err) {
            console.error('Failed to fetch target items:', err);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const params = { created_by: createdBy };
            if (itemCode !== 'All') params.item_code = itemCode;

            const response = await axios.get(`${API_URL}/reports/reminder-lead`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params
            });
            setData(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch reminder report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchTargetItems();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [createdBy, itemCode]);

    const handlePrint = () => {
        const doc = new jsPDF('landscape');
        doc.text('Lead Reminder Report', 14, 20);
        doc.setFontSize(10);
        
        autoTable(doc, {
            startY: 30,
            head: [['Customer', 'Phone', 'Address', 'Item', 'Qty', 'Sale Date', 'Reminder Date', 'Technician']],
            body: data.map(item => [
                item.party_name,
                item.party_phone || '-',
                item.party_address || '-',
                item.item_name,
                item.qty,
                format(new Date(item.vouch_date), 'dd/MM/yyyy'),
                item.reminder_date ? format(new Date(item.reminder_date), 'dd/MM/yyyy') : '-',
                item.created_by_name || '-'
            ]),
        });
        window.open(doc.output('bloburl'));
    };

    const handleExcelExport = () => {
        const exportData = data.map(item => ({
            'Customer Name': item.party_name,
            'Phone Number': item.party_phone || '-',
            'Address': item.party_address || '-',
            'GST No': item.party_gst || '-',
            'Remarks': item.remarks || '-',
            'Item Name': item.item_name,
            'Item Code': item.item_code,
            'Qty': item.qty,
            'Sale Date': format(new Date(item.vouch_date), 'dd/MM/yyyy'),
            'Reminder Date': item.reminder_date ? format(new Date(item.reminder_date), 'dd/MM/yyyy') : '-',
            'Technician': item.created_by_name || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Lead Reminders");
        XLSX.writeFile(wb, `Lead_Reminders_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Mobile Header */}
            <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-800">Lead Reminders</h1>
                <div className="flex items-center gap-2">
                    <button onClick={handleExcelExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg">
                        <Table className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">
                        <Download className="w-4 h-4" /> PDF
                    </button>
                </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Lead Reminder Report</h1>
                    <p className="text-gray-500 mt-1">Track due items based on sold quantities and expiry logic</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExcelExport} className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm">
                        <Table className="w-4 h-4 text-green-600" /> Export Excel
                    </button>
                    <button onClick={handlePrint} className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm">
                        <Download className="w-4 h-4 text-blue-600" /> Export PDF
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lead Item</label>
                        <div className="relative">
                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={itemCode}
                                onChange={(e) => setItemCode(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 transition-all"
                            >
                                <option value="All">All Lead Items</option>
                                {targetItems.map((item) => (
                                    <option key={item.item_code} value={item.item_code}>
                                        {item.item_name} ({item.LeadTimeDays} Days/Qty)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Created By Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={createdBy}
                                onChange={(e) => setCreatedBy(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 transition-all"
                            >
                                <option value="All">All Technicians</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
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
                        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No leads found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reminder Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer Info</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Address & GST</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Item Detail</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Sale Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Technician</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 text-sm text-red-600 font-bold whitespace-nowrap">
                                            {item.reminder_date ? format(new Date(item.reminder_date), 'dd/MM/yyyy') : '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm font-bold text-gray-800">{item.party_name}</div>
                                            <div className="text-sm text-gray-500">{item.party_phone}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm text-gray-600 max-w-xs truncate">{item.party_address || '-'}</div>
                                            <div className="text-xs text-gray-400">GST: {item.party_gst || 'N/A'}</div>
                                            <div className="text-xs text-blue-500">{item.remarks || ''}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm text-gray-800">{item.item_name}</div>
                                            <div className="text-xs text-gray-500">Qty: {item.qty}</div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-right text-gray-600 whitespace-nowrap">
                                            {format(new Date(item.vouch_date), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-800">
                                            {item.created_by_name || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReminderLeadReport;
