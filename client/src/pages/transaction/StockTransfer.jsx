import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus, Minus, Save, User, Calendar, RefreshCw, AlertCircle, CheckCircle,
    FileText, Package
} from 'lucide-react';
import Select from 'react-select';
import { format } from 'date-fns';
import { getToken } from '../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const StockTransfer = ({ type = 'ST' }) => {
    const { bookCode, vouchNo } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!bookCode && !!vouchNo;

    // State
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState(1);
    const [technicians, setTechnicians] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);

    // Header State
    const [header, setHeader] = useState({
        book_code: type,
        vouch_date: format(new Date(), 'yyyy-MM-dd'),
        technician_id: '',
        remarks: ''
    });

    // Items State
    const [items, setItems] = useState([
        { sr_no: 1, item_code: '', item_name: '', qty: 0, serial_numbers: '', current_stock: 0 }
    ]);

    // Fetch Existing Transfer for Edit
    const fetchTransfer = async () => {
        if (!isEditMode) return;

        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/stock/${bookCode}/${vouchNo}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            const { header: fetchedHeader, items: fetchedItems } = response.data.data;

            setHeader({
                book_code: fetchedHeader.book_code,
                vouch_date: format(new Date(fetchedHeader.vouch_date), 'yyyy-MM-dd'),
                technician_id: fetchedHeader.technician_id,
                remarks: fetchedHeader.remarks || ''
            });

            // Map items
            if (type === 'STR') {
                const techRes = await axios.get(`${API_URL}/stock/technician/${fetchedHeader.technician_id}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const techStockList = techRes.data.data;
                setAvailableItems(techStockList.map(item => ({
                    item_code: item.item_code,
                    item_name: item.item_name,
                    current_stock: item.current_qty
                })));

                setItems(fetchedItems.map(item => {
                    const techItem = techStockList.find(ti => ti.item_code === item.item_code);
                    return {
                        sr_no: item.sr_no,
                        item_code: item.item_code,
                        item_name: item.item_name,
                        qty: item.qty,
                        serial_numbers: item.serial_numbers || '',
                        current_stock: (techItem ? parseFloat(techItem.current_qty) : 0) + parseFloat(item.qty)
                    };
                }));
            } else {
                setItems(fetchedItems.map(item => ({
                    sr_no: item.sr_no,
                    item_code: item.item_code,
                    item_name: item.item_name,
                    qty: item.qty,
                    serial_numbers: item.serial_numbers || '',
                    current_stock: parseFloat(item.main_stock) + parseFloat(item.qty)
                })));
            }

        } catch (err) {
            console.error('Failed to fetch transfer details:', err);
            setError('Failed to load transaction details');
        } finally {
            setLoading(false);
        }
    };

    // Fetch Technicians
    const fetchTechnicians = async () => {
        try {
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                params: { role: 'Technician', status: 'Active' }
            });
            // The API return format for users might need adjustment if it doesn't support filter parameters directly
            // Assuming standard returning all users, we might need to filter client-side if API doesn't support it
            // Let's assume we filter client side to be safe
            const techs = response.data.data.filter(u => u.role === 'Technician' && u.status === 'Active');
            setTechnicians(techs);
        } catch (err) {
            console.error('Failed to fetch technicians:', err);
            setError('Failed to fetch technician list');
        }
    };

    // Fetch Active Items
    const fetchItems = async () => {
        try {
            const response = await axios.get(`${API_URL}/items?status=Active`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setAvailableItems(response.data.data);
        } catch (err) {
            console.error('Failed to fetch items:', err);
            setError('Failed to fetch item list');
        }
    };

    // Fetch Technician Stock (For STR)
    const fetchTechnicianStock = async (techId) => {
        if (!techId) {
            setAvailableItems([]);
            return;
        }
        try {
            const response = await axios.get(`${API_URL}/stock/technician/${techId}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setAvailableItems(response.data.data.map(item => ({
                item_code: item.item_code,
                item_name: item.item_name,
                current_stock: item.current_qty
            })));
        } catch (err) {
            console.error('Failed to fetch technician stock:', err);
            setError('Failed to fetch technician stock');
        }
    };

    useEffect(() => {
        const init = async () => {
            await fetchTechnicians();
            if (type === 'ST') {
                await fetchItems();
            }
            if (isEditMode) {
                await fetchTransfer();
            }
        };
        init();
    }, [isEditMode, bookCode, vouchNo, type]);

    // Handle Header Change
    const handleHeaderChange = (e) => {
        const { name, value } = e.target;
        setHeader(prev => ({ ...prev, [name]: value }));

        if (type === 'STR' && name === 'technician_id' && !isEditMode) {
            fetchTechnicianStock(value);
            setItems([{ sr_no: 1, item_code: '', item_name: '', qty: 0, serial_numbers: '', current_stock: 0 }]);
        }
    };

    // Handle Item Change
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === 'item_code') {
            const selectedItem = availableItems.find(item => item.item_code === value);
            if (selectedItem) {
                newItems[index].item_name = selectedItem.item_name;
                newItems[index].current_stock = parseFloat(selectedItem.current_stock) || 0;
                newItems[index].qty = 1;
            }
        }

        setItems(newItems);
    };

    // Add Row
    const addRow = () => {
        setItems([
            ...items,
            { sr_no: items.length + 1, item_code: '', item_name: '', qty: 0, serial_numbers: '', current_stock: 0 }
        ]);
    };

    // Remove Row
    const removeRow = (index) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            newItems.forEach((item, idx) => item.sr_no = idx + 1);
            setItems(newItems);
        }
    };

    // Submit Handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        setSuccess('');

        // Pre-validation
        if (!header.technician_id) {
            setError('Please select a technician.');
            setFormLoading(false);
            return;
        }

        // Check stock availability (Client side check)
        for (const item of items) {
            if (!item.item_code) {
                setError(`Row ${item.sr_no}: Please select an item.`);
                setFormLoading(false);
                return;
            }
            if (item.qty <= 0) {
                setError(`Row ${item.sr_no}: Quantity must be greater than 0.`);
                setFormLoading(false);
                return;
            }
            if (item.qty > item.current_stock) {
                setError(`Row ${item.sr_no}: Insufficient stock. Available: ${item.current_stock}`);
                setFormLoading(false);
                return;
            }
        }

        try {
            const payload = {
                header: header,
                items: items.map(item => ({
                    item_code: item.item_code,
                    qty: parseFloat(item.qty),
                    serial_numbers: item.serial_numbers
                }))
            };

            let response;
            if (isEditMode) {
                response = await axios.put(`${API_URL}/stock/${bookCode}/${vouchNo}`, payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                setSuccess('Stock Transfer updated successfully!');
            } else {
                response = await axios.post(`${API_URL}/stock/transfer`, payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                setSuccess(response.data.message || 'Stock Transfer successful!');

                // Reset Form only on Create
                setHeader(prev => ({ ...prev, technician_id: '', remarks: '' }));
                setItems([{ sr_no: 1, item_code: '', item_name: '', qty: 0, serial_numbers: '', current_stock: 0 }]);
                setActiveTab(1);
            }

            // Refresh items to get updated stock
            fetchItems();

            // If edit, redirect back
            if (isEditMode) {
                const listPath = type === 'STR' ? '/transaction/stock-transfer-return-list' : '/transaction/stock-transfer-list';
                setTimeout(() => navigate(listPath), 1500);
            }

        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to process stock transfer');
        } finally {
            setFormLoading(false);
        }
    };

    // Prepare options for react-select
    const itemOptions = useMemo(() => availableItems.map(availItem => ({
        value: availItem.item_code,
        label: `${availItem.item_name} - ${availItem.item_code}`
    })), [availableItems]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
            {/* Mobile Sticky Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
                <h1 className="text-lg font-bold text-gray-800">
                    {isEditMode 
                        ? (type === 'STR' ? 'Edit Return' : 'Edit Transfer') 
                        : (type === 'STR' ? 'Stock Return' : 'Stock Transfer')}
                </h1>
            </div>

            <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto px-3 md:px-4 pt-4 md:pt-6">
                {/* Desktop Header */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-800">
                            {isEditMode 
                                ? (type === 'STR' ? 'Edit Stock Return' : 'Edit Stock Transfer') 
                                : (type === 'STR' ? 'Stock Return from Technician' : 'Stock Transfer to Technician')}
                        </h1>
                        {isEditMode && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                                {bookCode}-{vouchNo}
                            </span>
                        )}
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

                {/* Tab Header - Mobile Friendly */}
                <div className="flex bg-gray-100 rounded-xl p-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab(1)}
                        className={`flex-1 py-3 px-4 text-center font-medium rounded-lg transition-all ${
                            activeTab === 1
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-500"
                        }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <User className="w-4 h-4" />
                            <span>Technician</span>
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab(2)}
                        className={`flex-1 py-3 px-4 text-center font-medium rounded-lg transition-all ${
                            activeTab === 2
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-500"
                        }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>Items {items.filter(i => i.item_code && i.qty > 0).length > 0 && `(${items.filter(i => i.item_code && i.qty > 0).length})`}</span>
                        </span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === 1 && (
                        <>
                            {/* Mobile Card Layout */}
                            <div className="md:hidden space-y-4">
                                {/* Technician */}
                                <div className="bg-white rounded-xl p-4 border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Technician <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <select
                                            name="technician_id"
                                            value={header.technician_id}
                                            onChange={handleHeaderChange}
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-gray-50"
                                        >
                                            <option value="">-- Select Technician --</option>
                                            {technicians.map((tech) => (
                                                <option key={tech.id} value={tech.id}>
                                                    {tech.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Transfer Date */}
                                <div className="bg-white rounded-xl p-4 border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Transfer Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="date"
                                            name="vouch_date"
                                            value={header.vouch_date}
                                            onChange={handleHeaderChange}
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                                        />
                                    </div>
                                </div>

                                {/* Remarks */}
                                <div className="bg-white rounded-xl p-4 border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                                    <textarea
                                        name="remarks"
                                        value={header.remarks}
                                        onChange={handleHeaderChange}
                                        placeholder="Optional notes"
                                        rows={3}
                                        className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50"
                                    />
                                </div>

                                {/* Mobile Next Button */}
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(2)}
                                    className="w-full py-4 bg-blue-600 text-white text-base font-medium rounded-xl shadow-lg active:bg-blue-700 transition-colors"
                                >
                                    Next: Add Items →
                                </button>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Technician Dropdown */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Select Technician <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <select
                                                name="technician_id"
                                                value={header.technician_id}
                                                onChange={handleHeaderChange}
                                                required
                                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                                            >
                                                <option value="">-- Select Technician --</option>
                                                {technicians.map((tech) => (
                                                    <option key={tech.id} value={tech.id}>
                                                        {tech.name} ({tech.id})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Voucher Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Transfer Date <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="date"
                                                name="vouch_date"
                                                value={header.vouch_date}
                                                onChange={handleHeaderChange}
                                                required
                                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    {/* Remarks */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                        <input
                                            type="text"
                                            name="remarks"
                                            value={header.remarks}
                                            onChange={handleHeaderChange}
                                            placeholder="Optional notes"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab(2)}
                                        className="px-5 py-2 bg-blue-600 text-white rounded-lg"
                                    >
                                        Next → Add Items
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 2 && (
                        <>
                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">#{item.sr_no}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeRow(index)}
                                                disabled={items.length <= 1}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 active:bg-red-100"
                                            >
                                                <Minus className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Item Select */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Select Item</label>
                                            <Select
                                                value={itemOptions.find(op => op.value === item.item_code) || null}
                                                onChange={(selectedOption) => handleItemChange(index, 'item_code', selectedOption ? selectedOption.value : '')}
                                                options={itemOptions}
                                                placeholder="Search item..."
                                                isClearable
                                                menuPortalTarget={document.body}
                                                styles={{
                                                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                                                    control: base => ({
                                                        ...base,
                                                        minHeight: '48px',
                                                        fontSize: '16px',
                                                        borderRadius: '12px',
                                                        backgroundColor: '#f9fafb',
                                                    }),
                                                    option: (base, state) => ({
                                                        ...base,
                                                        color: '#333',
                                                        backgroundColor: state.isFocused ? '#e5e7eb' : 'white',
                                                        padding: '12px',
                                                    }),
                                                    singleValue: base => ({ ...base, color: '#333' }),
                                                    menu: base => ({ ...base, zIndex: 9999, borderRadius: '12px' }),
                                                }}
                                            />
                                        </div>

                                        {/* Stock Info */}
                                        {item.item_code && (
                                            <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
                                                <span className="text-xs text-blue-600">Available Stock</span>
                                                <span className="font-semibold text-blue-800">{item.current_stock}</span>
                                            </div>
                                        )}

                                        {/* Qty and Serial */}
                                        <div className="space-y-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={item.current_stock}
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                    className="w-full px-3 py-3 text-base text-center border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Serial Numbers (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={item.serial_numbers}
                                                    onChange={(e) => handleItemChange(index, 'serial_numbers', e.target.value)}
                                                    placeholder="e.g. SN123, SN456"
                                                    className="w-full px-3 py-3 text-base border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Item Button */}
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-blue-600 font-medium flex items-center justify-center gap-2 active:bg-blue-50 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add Another Item
                                </button>
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                    <h3 className="font-semibold text-gray-700">Items to Transfer</h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[800px]">
                                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium">
                                            <tr>
                                                <th className="px-4 py-2 text-left w-16">#</th>
                                                <th className="px-4 py-2 text-left w-1/3">Item</th>
                                                <th className="px-4 py-2 text-left w-1/4">Serial Numbers</th>
                                                <th className="px-4 py-2 text-center w-24">Avail.</th>
                                                <th className="px-4 py-2 text-center w-24">Qty</th>
                                                <th className="px-4 py-2 text-center w-20">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {items.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-2 text-sm text-gray-500">{item.sr_no}</td>
                                                    <td className="px-4 py-2 min-w-[250px]">
                                                        <Select
                                                            value={itemOptions.find(op => op.value === item.item_code) || null}
                                                            onChange={(selectedOption) => handleItemChange(index, 'item_code', selectedOption ? selectedOption.value : '')}
                                                            options={itemOptions}
                                                            placeholder="Select Item"
                                                            isClearable
                                                            menuPortalTarget={document.body}
                                                            styles={{
                                                                menuPortal: base => ({ ...base, zIndex: 9999 }),
                                                                control: base => ({
                                                                    ...base,
                                                                    minHeight: '38px',
                                                                    fontSize: '0.875rem',
                                                                    '@media (max-width: 768px)': {
                                                                        fontSize: '16px',
                                                                        minHeight: '44px',
                                                                    }
                                                                }),
                                                                option: (base, state) => ({
                                                                    ...base,
                                                                    color: '#333',
                                                                    backgroundColor: state.isFocused ? '#e5e7eb' : 'white',
                                                                }),
                                                                singleValue: base => ({
                                                                    ...base,
                                                                    color: '#333',
                                                                }),
                                                                menu: base => ({
                                                                    ...base,
                                                                    zIndex: 9999,
                                                                })
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={item.serial_numbers}
                                                            onChange={(e) => handleItemChange(index, 'serial_numbers', e.target.value)}
                                                            placeholder="e.g. SN123, SN456"
                                                            className="w-full p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-sm font-medium text-gray-600">
                                                        {item.current_stock}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={item.current_stock}
                                                            value={item.qty}
                                                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                            className="w-full p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 text-center text-sm"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRow(index)}
                                                            disabled={items.length <= 1}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-30 transition-colors"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-3 bg-gray-50 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={addRow}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Another Item
                                    </button>
                                </div>
                            </div>

                            {/* Mobile Summary - Sticky Bottom */}
                            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab(1)}
                                        className="py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm active:bg-gray-200"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="py-3 bg-blue-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1 disabled:opacity-50 active:bg-blue-700"
                                    >
                                        {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save
                                    </button>
                                </div>
                            </div>

                            {/* Desktop Action Buttons */}
                            <div className="hidden md:flex flex-wrap gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(1)}
                                    className="px-5 py-2 bg-gray-500 text-white rounded-lg"
                                >
                                    ← Back
                                </button>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 shadow-sm disabled:opacity-50"
                                >
                                    {formLoading ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            {type === 'STR' ? 'Save Return' : 'Save Transfer'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default StockTransfer;
