import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus, Minus, Save, Calendar,
    User, Phone, MapPin, FileText,
    AlertCircle, CheckCircle,
    RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { getUserID, getToken } from '../../utils/auth.js';
import Select from 'react-select';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

// Calculate row amounts based on inclusive tax formula
const calculateRow = (qty, rate, tax_perc) => {
    const quantity = parseFloat(qty) || 0;
    const itemRate = parseFloat(rate) || 0;
    const taxPercentage = parseFloat(tax_perc) || 0;

    // Inclusive Tax Formula
    const totalValue = itemRate * quantity;
    const basicAmount = totalValue / (1 + (taxPercentage / 100));
    const taxAmount = totalValue - basicAmount;

    return {
        basic_amt: parseFloat(basicAmount.toFixed(2)),
        tax_amt: parseFloat(taxAmount.toFixed(2)),
        net_amt: parseFloat(totalValue.toFixed(2))
    };
};

const PurchaseReturn = () => {
    const { vouchNo } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState(1);

    // Header State
    const [header, setHeader] = useState({
        book_code: 'PR',
        vouch_date: format(new Date(), 'yyyy-MM-dd'),
        party_phone: '',
        party_name: '',
        party_address: '',
        party_email: '',
        party_gst: '',
        remarks: ''
    });

    const [items, setItems] = useState([
        { sr_no: 1, item_code: '', item_name: '', qty: 0, rate: 0, tax_perc: 0, basic_amt: 0, tax_amt: 0, net_amt: 0 }
    ]);

    const [availableItems, setAvailableItems] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);

    // Fetch active items for dropdown
    const fetchItems = async () => {
        try {
            const response = await axios.get(`${API_URL}/items?status=Active`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setAvailableItems(response.data.data);
        } catch (err) {
            console.error('Failed to fetch items:', err);
        }
    };

    // Fetch purchase return for viewing/editing
    const fetchPurchaseReturnTransaction = async (vouchNo) => {
        if (!vouchNo) return;

        setLoading(true);
        setError('');

        try {
            const response = await axios.get(`${API_URL}/purchases/return/${vouchNo}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            const { header: purchHeader, items: purchItems } = response.data.data;

            setHeader({
                book_code: 'PR',
                vouch_date: new Date(purchHeader.vouch_date).toISOString().split('T')[0],
                party_phone: purchHeader.party_phone || '',
                party_name: purchHeader.party_name,
                party_address: purchHeader.party_address || '',
                party_email: purchHeader.party_email || '',
                party_gst: purchHeader.party_gst || '',
                remarks: purchHeader.remarks || ''
            });

            // Map items
            const mappedItems = purchItems.map((item, index) => ({
                sr_no: item.sr_no,
                item_code: item.item_code,
                item_name: item.item_name,
                qty: parseFloat(item.qty),
                rate: parseFloat(item.rate),
                tax_perc: parseFloat(item.tax_perc),
                basic_amt: parseFloat(item.basic_amt),
                tax_amt: parseFloat(item.tax_amt),
                net_amt: parseFloat(item.net_amt)
            }));

            setItems(mappedItems);
            setIsEditMode(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch purchase return transaction');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
        if (vouchNo) {
            fetchPurchaseReturnTransaction(vouchNo);
        }
    }, [vouchNo]);

    // Handle header input change
    const handleHeaderChange = (e) => {
        const { name, value } = e.target;
        setHeader(prev => ({ ...prev, [name]: value }));
    };

    // Handle item input change
    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // Auto-populate item details
        if (field === 'item_code') {
            const selectedItem = availableItems.find(item => item.item_code === value);
            if (selectedItem) {
                newItems[index].item_name = selectedItem.item_name;
                newItems[index].rate = 0; // Default rate
                newItems[index].tax_perc = parseFloat(selectedItem.tax_rate) || 0;
                newItems[index].qty = 1;

                const calculations = calculateRow(1, 0, newItems[index].tax_perc);
                newItems[index].basic_amt = calculations.basic_amt;
                newItems[index].tax_amt = calculations.tax_amt;
                newItems[index].net_amt = calculations.net_amt;
            }
        }

        // Recalculate
        if (['qty', 'rate', 'tax_perc'].includes(field)) {
            const calculations = calculateRow(newItems[index].qty, newItems[index].rate, newItems[index].tax_perc);
            newItems[index].basic_amt = calculations.basic_amt;
            newItems[index].tax_amt = calculations.tax_amt;
            newItems[index].net_amt = calculations.net_amt;
        }

        setItems(newItems);
    };

    // Add new row
    const addRow = () => {
        const newRow = {
            sr_no: items.length + 1,
            item_code: '', item_name: '', qty: 0, rate: 0, tax_perc: 0, basic_amt: 0, tax_amt: 0, net_amt: 0
        };
        setItems([...items, newRow]);
    };

    // Remove row
    const removeRow = (index) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            newItems.forEach((item, idx) => item.sr_no = idx + 1);
            setItems(newItems);
        }
    };

    // Summary Calculation
    const summary = useMemo(() => {
        let totalQty = 0;
        let totalTax = 0;
        let netAmount = 0;
        let totalItems = 0;

        items.forEach(item => {
            if (item.qty) {
                totalQty += parseFloat(item.qty);
                totalTax += parseFloat(item.tax_amt);
                netAmount += parseFloat(item.net_amt);
                totalItems += 1;
            }
        });

        return {
            totalItems,
            totalQty: parseFloat(totalQty.toFixed(2)),
            totalTax: parseFloat(totalTax.toFixed(2)),
            grandTotal: parseFloat(netAmount.toFixed(2))
        };
    }, [items]);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        setSuccess('');

        try {
            const payload = {
                header: {
                    ...header,
                    party_phone: header.party_phone || null,
                    created_by: getUserID()
                },
                items: items.map(item => ({
                    item_code: item.item_code,
                    qty: parseFloat(item.qty),
                    rate: parseFloat(item.rate),
                    tax_perc: parseFloat(item.tax_perc)
                }))
            };

            let response;
            if (isEditMode) {
                alert("Update functionality is under construction. Please delete and re-create.");
                return;
            } else {
                response = await axios.post(`${API_URL}/purchases/return`, payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            }

            setSuccess('Purchase Return saved successfully!');

            // Reset
            setHeader({
                book_code: 'PR',
                vouch_date: format(new Date(), 'yyyy-MM-dd'),
                party_phone: '',
                party_name: '',
                party_address: '',
                party_email: '',
                party_gst: '',
                remarks: ''
            });
            setItems([{ sr_no: 1, item_code: '', item_name: '', qty: 0, rate: 0, tax_perc: 0, basic_amt: 0, tax_amt: 0, net_amt: 0 }]);
            setActiveTab(1);

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save purchase return');
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
                <h1 className="text-lg font-bold text-gray-800">Purchase Return</h1>
            </div>

            <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto px-3 md:px-4 pt-4 md:pt-6">
                {/* Desktop Header */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h1 className="text-2xl font-bold text-gray-800">Purchase Return Entry</h1>
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
                            <span>Supplier</span>
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
                            <FileText className="w-4 h-4" />
                            <span>Items {items.filter(i => i.item_code && i.qty > 0).length > 0 && `(${items.filter(i => i.item_code && i.qty > 0).length})`}</span>
                        </span>
                    </button>
                </div>

                {/* Header Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === 1 && (
                        <>
                            {/* Mobile Card Layout */}
                            <div className="md:hidden space-y-4">
                                {/* Date */}
                                <div className="bg-white rounded-xl p-4 border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date <span className="text-red-500">*</span>
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

                                {/* Supplier Name */}
                                <div className="bg-white rounded-xl p-4 border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Supplier Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            name="party_name"
                                            value={header.party_name}
                                            onChange={handleHeaderChange}
                                            required
                                            placeholder="Enter supplier name"
                                            className="w-full pl-12 pr-4 py-3.5 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                                        />
                                    </div>
                                </div>

                                {/* Supplier Phone */}
                                <div className="bg-white rounded-xl p-4 border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Phone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            name="party_phone"
                                            value={header.party_phone}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                if (value.length <= 10) handleHeaderChange({ ...e, target: { ...e.target, name: 'party_phone', value } });
                                            }}
                                            placeholder="Phone Number"
                                            className="w-full pl-12 pr-4 py-3.5 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                                        />
                                    </div>
                                </div>

                                {/* Expandable Details */}
                                <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <summary className="px-4 py-3 font-medium text-gray-700 cursor-pointer flex items-center justify-between">
                                        <span>More Details (Optional)</span>
                                        <span className="text-gray-400 text-sm">Tap to expand</span>
                                    </summary>
                                    <div className="p-4 pt-0 space-y-4 border-t border-gray-100 mt-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="party_address"
                                                    value={header.party_address}
                                                    onChange={handleHeaderChange}
                                                    placeholder="Address"
                                                    className="w-full pl-12 pr-4 py-3.5 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">GST No.</label>
                                            <input
                                                type="text"
                                                name="party_gst"
                                                value={header.party_gst}
                                                onChange={handleHeaderChange}
                                                placeholder="GST Number"
                                                className="w-full px-4 py-3.5 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                                            <textarea
                                                name="remarks"
                                                value={header.remarks}
                                                onChange={handleHeaderChange}
                                                placeholder="Additional notes..."
                                                rows={2}
                                                className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50"
                                            />
                                        </div>
                                    </div>
                                </details>

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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Voucher Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date <span className="text-red-500">*</span>
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

                                    {/* Supplier Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Supplier Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                name="party_name"
                                                value={header.party_name}
                                                onChange={handleHeaderChange}
                                                required
                                                placeholder="Supplier Name"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    {/* Supplier Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="tel"
                                                name="party_phone"
                                                value={header.party_phone}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '');
                                                    if (value.length <= 10) handleHeaderChange({ ...e, target: { ...e.target, name: 'party_phone', value } });
                                                }}
                                                placeholder="Phone Number"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                name="party_address"
                                                value={header.party_address}
                                                onChange={handleHeaderChange}
                                                placeholder="Address"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    {/* GST */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GST No.</label>
                                        <input
                                            type="text"
                                            name="party_gst"
                                            value={header.party_gst}
                                            onChange={handleHeaderChange}
                                            placeholder="GST Number"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Remarks */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                            <textarea
                                                name="remarks"
                                                value={header.remarks}
                                                onChange={handleHeaderChange}
                                                placeholder="Additional notes..."
                                                rows={2}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                            />
                                        </div>
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

                    {/* Items Section */}
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

                                        {/* Qty, Rate, Tax Row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                    className="w-full px-3 py-3 text-base text-center border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Rate</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                    className="w-full px-3 py-3 text-base text-center border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Tax%</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.tax_perc}
                                                    onChange={(e) => handleItemChange(index, 'tax_perc', e.target.value)}
                                                    className="w-full px-3 py-3 text-base text-center border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Item Total */}
                                        {item.item_code && item.qty > 0 && (
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <span className="text-sm text-gray-500">Item Total</span>
                                                <span className="text-lg font-bold text-blue-600">₹{item.net_amt.toFixed(2)}</span>
                                            </div>
                                        )}
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
                                    <h3 className="font-semibold text-gray-700">Return Items</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Qty</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Rate (Inc. Tax)</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Tax%</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Total</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {items.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
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
                                                    <td className="px-1 py-2">
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            value={item.qty}
                                                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm text-right"
                                                        />
                                                    </td>
                                                    <td className="px-1 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.rate}
                                                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm text-right"
                                                        />
                                                    </td>
                                                    <td className="px-1 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.tax_perc}
                                                            onChange={(e) => handleItemChange(index, 'tax_perc', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm text-right"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-sm font-semibold">
                                                        {item.net_amt.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRow(index)}
                                                            disabled={items.length <= 1}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={addRow}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Item
                                    </button>
                                </div>
                            </div>

                            {/* Summary Section */}
                            {/* Mobile Summary - Sticky Bottom */}
                            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
                                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                                    <div>
                                        <div className="text-xs text-gray-500">Items</div>
                                        <div className="font-bold text-gray-800">{summary.totalItems}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">Qty</div>
                                        <div className="font-bold text-gray-800">{summary.totalQty}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">Tax</div>
                                        <div className="font-bold text-gray-800">₹{summary.totalTax.toFixed(0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">Total</div>
                                        <div className="font-bold text-lg text-blue-600">₹{summary.grandTotal.toFixed(0)}</div>
                                    </div>
                                </div>
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

                            {/* Desktop Summary */}
                            <div className="hidden md:block bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="text-gray-500">Total Items</div>
                                        <div className="font-semibold">{summary.totalItems}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-gray-500">Total Qty</div>
                                        <div className="font-semibold">{summary.totalQty}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-gray-500">Total Tax</div>
                                        <div className="font-semibold">₹{summary.totalTax.toFixed(2)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-gray-500">Grand Total</div>
                                        <div className="font-semibold text-lg text-blue-600">₹{summary.grandTotal.toFixed(2)}</div>
                                    </div>
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
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Save Return
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

export default PurchaseReturn;
