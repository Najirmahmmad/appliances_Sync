
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    FileText, Calendar, RefreshCw,
    AlertCircle, Download, User, DollarSign
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getToken, getUserRole } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const CommissionReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState('');

    // Filters
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [technicianId, setTechnicianId] = useState('All');

    // Metadata
    const [technicians, setTechnicians] = useState([]);
    const userRole = getUserRole(); // 'admin' or 'technician'

    // Fetch Technicians (Admin only)
    useEffect(() => {
        if (userRole === 'admin') {
            fetchTechnicians();
        }
    }, [userRole]);

    const fetchTechnicians = async () => {
        try {
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params: { role: 'Technician' } // Assuming the API supports filtering or I'll filter client-side
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
                technicianId: userRole === 'admin' ? technicianId : undefined
            };

            const response = await axios.get(`${API_URL}/reports/commission`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params
            });

            setData(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch commission report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [startDate, endDate, technicianId]); // Auto-fetch on filter change

    // Calculate Total Commission
    const totalCommission = data.reduce((sum, item) => sum + (parseFloat(item.tot_commission) || 0), 0);

    // Print PDF
    const handlePrint = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Commission Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`From: ${format(new Date(startDate), 'dd/MM/yyyy')} To: ${format(new Date(endDate), 'dd/MM/yyyy')}`, 14, 30);

        if (userRole === 'admin') {
            const techName = technicianId === 'All' ? 'All Technicians' : technicians.find(t => t.id === parseInt(technicianId))?.name || 'Unknown';
            doc.text(`Technician: ${techName}`, 14, 36);
        }

        autoTable(doc, {
            startY: 40,
            head: [['Date', 'Technician', 'Bill No', 'Item', 'Qty', 'Comm Rate', 'Total Comm']],
            body: data.map(item => [
                format(new Date(item.vouch_date), 'dd/MM/yyyy'),
                item.technician_name,
                `${item.book_code}-${item.vouch_no}`,
                item.item_name,
                item.qty,
                item.comm_rate,
                (parseFloat(item.tot_commission) || 0).toFixed(2)
            ]),
            foot: [['', '', '', '', '', 'Total:', totalCommission.toFixed(2)]]
        });

        window.open(doc.output('bloburl'));
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Mobile Sticky Header */}
            <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-800">Commission Report</h1>
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
                    <h1 className="text-2xl font-bold text-gray-800">Commission Report</h1>
                    <p className="text-gray-500 mt-1">View commission details for sales</p>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50" >
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
                    {userRole === 'admin' && (
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

                    {/* Technician Filter (Admin Only) */}
                    {userRole === 'admin' && (
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
            <div className="md:hidden bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm opacity-90">Total Commission</span>
                    </div>
                    <span className="text-xl font-bold">₹{totalCommission.toFixed(2)}</span>
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
                        <p className="text-gray-500">No commission data found for the selected period</p>
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
                                        <span className="text-green-600 font-bold">₹{(parseFloat(item.tot_commission) || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                        <span>{format(new Date(item.vouch_date), 'dd/MM/yyyy')}</span>
                                        <span className="text-blue-600 font-mono">{item.book_code}-{item.vouch_no}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">Technician: <span className="text-gray-800">{item.technician_name}</span></span>
                                        <span className="text-gray-500">Qty: <span className="text-gray-800">{item.qty}</span></span>
                                        <span className="text-gray-500">Rate: <span className="text-gray-800">{item.comm_rate}</span></span>
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
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Technician</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bill No</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Item</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Qty</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Comm. Rate</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Comm.</th>
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
                                            <td className="py-3 px-4 text-sm text-right text-gray-600">
                                                {item.comm_rate}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right font-bold text-green-600">
                                                ₹{(parseFloat(item.tot_commission) || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-200">
                                    <tr>
                                        <td colSpan="6" className="py-3 px-4 text-right font-bold text-gray-800">Total Commission:</td>
                                        <td className="py-3 px-4 text-right font-bold text-green-700 text-lg">
                                            ₹{totalCommission.toFixed(2)}
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

export default CommissionReport;
