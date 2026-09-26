
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    FileText, Calendar, RefreshCw,
    AlertCircle, Download, User, ArrowLeftRight, Package
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getToken, getUserRole } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const StockTransferReport = ({ type = 'ST' }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState('');

    // Filters
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [technicianId, setTechnicianId] = useState('All');

    // Metadata
    const [technicians, setTechnicians] = useState([]);
    const userRole = getUserRole(); // 'admin', 'operator', 'technician'

    // Check if user has permission to see filters
    const showFilters = userRole === 'admin' || userRole === 'operator';

    // Fetch Technicians (Admin/Operator only)
    useEffect(() => {
        if (showFilters) {
            fetchTechnicians();
        }
    }, [userRole]);

    const fetchTechnicians = async () => {
        try {
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params: { role: 'Technician' }
            });

            // Filter if API doesn't support generic filtering
            const filteredTechs = response.data.data.filter(u => u.role === 'Technician');
            setTechnicians(filteredTechs);
        } catch (err) {
            console.error('Failed to fetch technicians', err);
        }
    };

    // Fetch Report Data
    const fetchReport = async () => {
        setLoading(true);
        setError('');

        try {
            const params = {
                startDate,
                endDate,
                technicianId: showFilters ? technicianId : undefined,
                book_code: type
            };

            const response = await axios.get(`${API_URL}/reports/stock-transfer`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params
            });

            setData(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch stock transfer report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [startDate, endDate, technicianId]); // Auto-fetch on filter change

    // Print PDF
    const handlePrint = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(type === 'STR' ? 'Stock Return Report' : 'Stock Transfer Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`From: ${format(new Date(startDate), 'dd/MM/yyyy')} To: ${format(new Date(endDate), 'dd/MM/yyyy')}`, 14, 30);

        if (showFilters) {
            const techName = technicianId === 'All' ? 'All Technicians' : technicians.find(t => t.id === parseInt(technicianId))?.name || 'Unknown';
            doc.text(`Technician: ${techName}`, 14, 36);
        }

        autoTable(doc, {
            startY: 40,
            head: [['Date', 'Technician', 'Bill No', 'Item', 'Qty', 'Remarks']],
            body: data.map(item => [
                format(new Date(item.vouch_date), 'dd/MM/yyyy'),
                item.technician_name || '-',
                `${item.book_code}-${item.vouch_no}`,
                item.item_name,
                item.qty,
                item.remarks || '-'
            ]),
        });

        window.open(doc.output('bloburl'));
    };

    // Calculate Total Qty
    const totalQty = data.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Mobile Sticky Header */}
            <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-800">{type === 'STR' ? 'Stock Return' : 'Stock Transfer'}</h1>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg"
                >
                    <Download className="w-4 h-4" />
                    PDF
                </button>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{type === 'STR' ? 'Stock Return Report' : 'Stock Transfer Report'}</h1>
                    <p className="text-gray-500 mt-1">{type === 'STR' ? 'View stock returned from technicians' : 'View stock transferred to technicians'}</p>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                >
                    <Download className="w-4 h-4" />
                    Export PDF
                </button>
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
                    {showFilters && (
                        <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Technician</label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={technicianId}
                                    onChange={(e) => setTechnicianId(e.target.value)}
                                    className="w-40 pl-8 pr-2 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="All">All</option>
                                    {technicians.map(tech => (
                                        <option key={tech.id} value={tech.id}>{tech.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Start Date */}
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

                    {/* End Date */}
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

                    {/* Technician Filter (Admin/Operator Only) */}
                    {showFilters && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={technicianId}
                                    onChange={(e) => setTechnicianId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                                >
                                    <option value="All">All Technicians</option>
                                    {technicians.map(tech => (
                                        <option key={tech.id} value={tech.id}>{tech.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Total Summary Bar */}
            <div className="md:hidden bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        <span className="text-sm opacity-90">{type === 'STR' ? 'Total Items Returned' : 'Total Items Transferred'}</span>
                    </div>
                    <span className="text-xl font-bold">{totalQty}</span>
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
                        <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No stock {type === 'STR' ? 'return' : 'transfer'} data found for the selected period</p>
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
                                            <p className="text-xs text-gray-500">{item.item_code}</p>
                                        </div>
                                        <span className="text-purple-600 font-bold text-lg">{item.qty}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span>{format(new Date(item.vouch_date), 'dd/MM/yyyy')}</span>
                                        <span className="text-blue-600 font-mono">{item.book_code}-{item.vouch_no}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">{type === 'STR' ? 'From:' : 'To:'} <span className="text-gray-800 font-medium">{item.technician_name}</span></span>
                                    </div>
                                    {item.remarks && (
                                        <p className="text-xs text-gray-500 truncate" title={item.remarks}>
                                            Remarks: {item.remarks}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Technician</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bill No</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Item</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Qty</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {format(new Date(item.vouch_date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-800 font-medium">
                                                {item.technician_name}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-blue-600 font-mono">
                                                {item.book_code}-{item.vouch_no}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-800">
                                                {item.item_name}
                                                <div className="text-xs text-gray-500">{item.item_code}</div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right text-gray-800">
                                                {item.qty}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-xs" title={item.remarks}>
                                                {item.remarks || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StockTransferReport;
