
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    FileText, RefreshCw,
    AlertCircle, Download, User, Package, ArrowUp, ArrowDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getToken, getUserRole } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const CurrentStockReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState('');

    // Filters
    const [technicianId, setTechnicianId] = useState('All');

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'item_name', direction: 'asc' });

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
                technicianId: showFilters ? technicianId : undefined
            };

            const response = await axios.get(`${API_URL}/reports/current-stock`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params
            });

            setData(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch current stock report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [technicianId]); // Auto-fetch on filter change

    // Sorting Logic
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = [...data].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Print PDF
    const handlePrint = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Current Stock Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

        if (showFilters) {
            const techName = technicianId === 'All' ? 'Main Stock' : technicians.find(t => t.id === String(technicianId))?.name || 'Unknown';
            doc.text(`Stock Location: ${techName}`, 14, 36);
        }

        autoTable(doc, {
            startY: 40,
            head: [['Item Code', 'Item Name', 'Current Qty']],
            body: sortedData.map(item => [
                item.item_code,
                item.item_name,
                item.current_qty
            ]),
        });

        window.open(doc.output('bloburl'));
    };

    // Calculate Totals
    const totalQty = data.reduce((sum, item) => sum + parseFloat(item.current_qty || 0), 0);

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Mobile Sticky Header */}
            <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-800">Current Stock</h1>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg"
                    disabled={data.length === 0}
                >
                    <Download className="w-4 h-4" />
                    PDF
                </button>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Current Stock Report</h1>
                    <p className="text-gray-500 mt-1">
                        {showFilters && technicianId === 'All' ? 'Viewing Main Warehouse Stock' :
                            showFilters ? 'Viewing Technician Stock' : 'Viewing Your Bag Stock'}
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    disabled={data.length === 0}
                >
                    <Download className="w-4 h-4" />
                    Export PDF
                </button>
            </div>

            {/* Mobile Filter - Horizontal Scrollable */}
            {showFilters && (
                <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4">
                    <div className="flex gap-3 min-w-max">
                        <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={technicianId}
                                    onChange={(e) => setTechnicianId(e.target.value)}
                                    className="w-44 pl-8 pr-2 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="All">Main Warehouse</option>
                                    <optgroup label="Technicians">
                                        {technicians.map(tech => (
                                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Filters */}
            {showFilters && (
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Technician Filter (Admin/Operator Only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Location / Technician</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={technicianId}
                                    onChange={(e) => setTechnicianId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                                >
                                    <option value="All">Main Warehouse Stock</option>
                                    <optgroup label="Technicians">
                                        {technicians.map(tech => (
                                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Total Summary Bar */}
            <div className="md:hidden bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        <span className="text-sm opacity-90">Total Quantity</span>
                    </div>
                    <span className="text-xl font-bold">{totalQty.toFixed(2)}</span>
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
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No stock data found</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {sortedData.map((item, index) => (
                                <div key={index} className="p-4 flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{item.item_name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{item.item_code}</p>
                                    </div>
                                    <div className={`flex-shrink-0 ml-4 text-right ${parseFloat(item.current_qty) <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        <p className="text-lg font-bold">{item.current_qty}</p>
                                        <p className="text-xs text-gray-400">Qty</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Item Code</th>
                                        <th
                                            className="text-left py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleSort('item_name')}
                                        >
                                            <div className="flex items-center">
                                                Item Name
                                                {sortConfig.key === 'item_name' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" /> : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />
                                                ) : null}
                                            </div>
                                        </th>
                                        <th
                                            className="text-right py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleSort('current_qty')}
                                        >
                                            <div className="flex items-center justify-end">
                                                Current Qty
                                                {sortConfig.key === 'current_qty' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" /> : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />
                                                ) : null}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sortedData.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                                                {item.item_code}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-800 font-medium">
                                                {item.item_name}
                                            </td>
                                            <td className={`py-3 px-4 text-sm text-right font-bold ${parseFloat(item.current_qty) <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                {item.current_qty}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-100">
                                    <tr>
                                        <td colSpan="2" className="py-3 px-4 text-sm font-bold text-gray-700 text-right">Total Quantity:</td>
                                        <td className="py-3 px-4 text-sm font-bold text-gray-800 text-right">{totalQty.toFixed(2)}</td>
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

export default CurrentStockReport;
