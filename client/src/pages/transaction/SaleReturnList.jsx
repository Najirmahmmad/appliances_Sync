import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Edit2, Trash2, Eye, Search, Calendar,
  RefreshCw, AlertCircle, CheckCircle, X,
  Plus, Package, User, FileText, Printer
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUserRole } from '../../utils/auth.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const getToken = () => localStorage.getItem('token');

const SaleReturnList = () => {
  const userRole = getUserRole()?.toLowerCase();
  // State
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookCode, setBookCode] = useState('SR'); // Default to Sales Return
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Fetch sales
  const fetchSales = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (bookCode) params.append('book_code', bookCode);
      params.append('page', page);
      params.append('limit', limit);

      const response = await axios.get(`${API_URL}/sales/headers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      setSales(response.data.data);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setTotalRecords(response.data.pagination.total);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, startDate, endDate, bookCode]);

  useEffect(() => {
    fetchSales();
  }, [searchTerm, startDate, endDate, bookCode, page, limit]);

  // Delete sale
  const handleDelete = async (bookCode, vouchNo) => {
    setError('');
    setSuccess('');

    try {
      await axios.delete(`${API_URL}/sales/${bookCode}/${vouchNo}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      setSuccess('Sales return transaction deleted successfully');
      fetchSales();
      setShowDeleteConfirm(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete sales return transaction');
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

  // Function to handle printing a single sale return
  const handlePrintSale = async (sale) => {
    try {
      const token = getToken();

      // Get the sale details with items
      const response = await axios.get(`${API_URL}/sales/${sale.book_code}/${sale.vouch_no}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { header, items, company } = response.data.data;
      const doc = await generateInvoicePDF(header, items, company);
      window.open(doc.output("bloburl"));
    } catch (err) {
      console.error('❌ Print API error', err);
      alert('Failed to generate invoice');
    }
  };

  // Function to print the entire sale return list
  const handlePrintSaleList = () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    let y = 15;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Sales Return Transaction List', 105, y, { align: 'center' });

    y += 10;

    // Column headers
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      head: [[
        'Voucher No.',
        'Date',
        'Party Name',
        'Party Phone',
        'Quantity',
        'Amount'
      ]],
      body: sales.map((sale) => [
        `${sale.book_code}-${sale.vouch_no}`,
        format(new Date(sale.vouch_date), 'dd/MM/yyyy'),
        sale.party_name,
        sale.party_phone || '-',
        sale.total_qty,
        `₹${(typeof sale.net_amount === 'number' ? sale.net_amount : Number(sale.net_amount || 0)).toFixed(2)}`
      ]),
    });

    // Open the PDF
    window.open(doc.output('bloburl'));
  };

  const handleWhatsAppShare = async (sale) => {
    try {
      const token = getToken();
      // Fetch details to generate PDF
      const response = await axios.get(`${API_URL}/sales/${sale.book_code}/${sale.vouch_no}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { header, items, company } = response.data.data;

      // 1. Generate the PDF
      const doc = await generateInvoicePDF(header, items, company);

      // 2. Save/Upload the PDF
      const fileName = `Invoice_${header.book_code}-${header.vouch_no}.pdf`;
      const pdfBase64 = doc.output('datauristring');

      const uploadResponse = await axios.post(`${API_URL}/upload/invoice`, {
        pdfBase64,
        fileName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const pdfUrl = uploadResponse.data.url;

      // 3. Format Phone (Remove non-numbers)
      const rawPhone = header.party_phone || '';
      let cleanPhone = rawPhone.replace(/\D/g, '');

      // Auto-append 91 if it's a 10-digit number (common in India)
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }

      // 4. Create Message
      const message = `Dear ${header.party_name},\n\nPlease find attached the sales return invoice (${header.book_code}-${header.vouch_no}). You can download or view it here: ${pdfUrl}\n\nThank you for your business!`;

      // 5. Open WhatsApp
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

    } catch (err) {
      console.error('WhatsApp Share Error', err);
      alert('Failed to share on WhatsApp');
    }
  };

  // Function to generate invoice PDF
  const generateInvoicePDF = async (header, items, companyData) => {
    const doc = new jsPDF('p', 'mm', 'a4');

    let y = 12;

    /* ================= COMPANY HEADER ================= */

    // Use print header if available, otherwise use company details
    if (companyData?.print_header) {
      // Split the print header by newlines and add each line
      const headerLines = companyData.print_header.split('\n');
      headerLines.forEach(line => {
        if (line.trim()) {
          doc.setFontSize(16);
          doc.setFont(undefined, 'bold');
          doc.text(line.trim(), 105, y, { align: 'center' });
          y += 6;
        }
      });
    } else {
      // Fallback to standard company info
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(companyData?.company_name || 'COMPANY NAME', 105, y, { align: 'center' });

      y += 6;

      // Company address
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      if (companyData?.address_line1) {
        doc.text(companyData.address_line1, 105, y, { align: 'center' });
        y += 5;
      }
      if (companyData?.address_line2) {
        doc.text(companyData.address_line2, 105, y, { align: 'center' });
        y += 5;
      }
      if (companyData?.city_state_pincode) {
        doc.text(companyData.city_state_pincode, 105, y, { align: 'center' });
        y += 5;
      }

      // Company contact info
      const contactInfo = [];
      if (companyData?.phone_number) contactInfo.push(`Phone: ${companyData.phone_number}`);
      if (companyData?.phone_number2) contactInfo.push(`Alt: ${companyData.phone_number2}`);
      if (companyData?.email_address) contactInfo.push(`Email: ${companyData.email_address}`);
      if (companyData?.gst_number) contactInfo.push(`GST No.: ${companyData.gst_number}`);

      if (contactInfo.length > 0) {
        doc.text(contactInfo.join(' | '), 105, y, { align: 'center' });
        y += 5;
      }
    }

    // Fallback to default header if company data is not available
    if (!companyData) {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('YOUR COMPANY NAME', 105, y, { align: 'center' });

      y += 6;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('YOUR ADDRESS', 105, y, { align: 'center' });
      y += 5;
      doc.text('CITY, STATE - PINCODE', 105, y, { align: 'center' });
      y += 5;
      doc.text('Mobile: PHONE | Email: EMAIL | GST No.: GST NUMBER', 105, y, { align: 'center' });
      y += 5;
    }

    // Invoice title
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`${header.book_code === 'SA' ? 'SALES INVOICE' : 'SALES RETURN INVOICE'}`, 105, y, { align: 'center' });

    y += 8;

    // Horizontal line
    doc.line(10, y, 200, y);

    /* ================= INVOICE DETAILS ================= */
    y += 5;
    doc.setFontSize(10);

    // Party details
    doc.text(`M/s: ${header.party_name}`, 10, y);
    doc.text(`Voucher No: ${header.book_code}-${header.vouch_no}`, 140, y);

    y += 6;
    doc.text(`GST No: ${header.party_gst || '-'}`, 10, y);
    doc.text(`Date: ${format(new Date(header.vouch_date), 'dd/MM/yyyy')}`, 140, y);

    y += 6;
    doc.text(`Phone: ${header.party_phone || '-'}`, 10, y);

    if (header.party_email) {
      y += 6;
      doc.text(`Email: ${header.party_email}`, 10, y);
    }

    /* ================= ITEM TABLE ================= */
    y += 10;

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      head: [[
        'Sr',
        'Item Code',
        'Item Name',
        'Qty',
        'Rate',
        'Tax %',
        'Tax Amt',
        'Amount'
      ]],
      body: items.map((item, index) => [
        index + 1,
        item.item_code,
        item.item_name,
        item.qty,
        (typeof item.rate === 'number' ? item.rate : Number(item.rate || 0)).toFixed(2),
        item.tax_rate,
        (typeof item.tax_amount === 'number' ? item.tax_amount : Number(item.tax_amount || 0)).toFixed(2),
        (typeof item.total_amount === 'number' ? item.total_amount : Number(item.total_amount || 0)).toFixed(2)
      ]),
    });

    y = doc.lastAutoTable.finalY + 8;

    /* ================= TAX SUMMARY ================= */
    const rightX = 130;
    doc.text(`Sub Total: ₹${(typeof header.sub_total === 'number' ? header.sub_total : Number(header.sub_total || 0)).toFixed(2)}`, rightX, y);
    y += 6;
    if (header.tax_amount > 0) {
      doc.text(`Tax Amount: ₹${(typeof header.tax_amount === 'number' ? header.tax_amount : Number(header.tax_amount || 0)).toFixed(2)}`, rightX, y);
      y += 6;
    }
    doc.setFont(undefined, 'bold');
    doc.text(`Net Amount: ₹${(typeof header.net_amount === 'number' ? header.net_amount : Number(header.net_amount || 0)).toFixed(2)}`, rightX, y);

    /* ================= REMARKS ================= */
    if (header.remarks) {
      y += 15;
      doc.setFont(undefined, 'normal');
      doc.text(`Remarks: ${header.remarks}`, 10, y);
    }

    /* ================= FOOTER ================= */
    y += 20;

    // Add terms and conditions from company data
    const termsConditions = [];
    for (let i = 1; i <= 8; i++) {
      if (companyData && companyData[`terms_condition${i}`]) {
        termsConditions.push(companyData[`terms_condition${i}`]);
      }
    }

    if (termsConditions.length > 0) {
      // Add terms and conditions header
      doc.setFont(undefined, 'bold');
      doc.text('Terms & Conditions:', 10, y);
      y += 6;
      doc.setFont(undefined, 'normal');

      termsConditions.forEach(term => {
        if (y < 270) { // Prevent going beyond page
          const wrapped = doc.splitTextToSize(term, 180);
          doc.text(wrapped, 10, y);
          y += wrapped.length * 4 + 2;
        }
      });
    } else {
      // Use default footer if no terms and conditions
      doc.text('Thank you for your business!', 105, y, { align: 'center' });
      y += 5;
    }

    // Open the PDF
    // window.open(doc.output('bloburl'));
    return doc;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Sales Return</h1>
          <button
            onClick={() => window.location.href = '/transaction/sale/SR/new'}
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
            <h1 className="text-2xl font-bold text-gray-800">Sales Return Transactions</h1>
            <p className="text-gray-500 mt-1">View and manage all sales return transactions</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchSales}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-semibold text-sm rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 group-hover:text-erp-primary transition-colors ${loading ? 'animate-spin text-erp-primary' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => window.location.href = '/transaction/sale/SR/new'}
              className="flex items-center gap-2 px-4 py-2 bg-erp-primary text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-erp-primary/20"
            >
              <Plus className="w-5 h-5" />
              Add New Return
            </button>
            <button
              onClick={handlePrintSaleList}
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
          <div className="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
            {/* Search */}
            <div className="relative min-w-[200px] md:min-w-0 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search party..."
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

            {/* Book Code */}
            <div className="relative min-w-[140px] md:min-w-0 flex-shrink-0">
              <select
                value={bookCode}
                onChange={(e) => setBookCode(e.target.value)}
                className="w-full px-4 py-3 md:py-2.5 text-base md:text-sm bg-gray-50 md:bg-white border border-gray-200 rounded-xl md:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="SA">Sales (SA)</option>
                <option value="SR">Sale Return (SR)</option>
              </select>
            </div>
          </div>
        </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No sales return transactions found</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {sales.map((sale) => (
                <div key={`${sale.book_code}-${sale.vouch_no}`} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium text-blue-600">
                      {sale.book_code}-{sale.vouch_no}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(sale.vouch_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800 font-medium">{sale.party_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{sale.party_phone || '-'}</span>
                    <span className="font-bold text-blue-600 text-lg">
                      ₹{(typeof sale.net_amount === 'number' ? sale.net_amount : Number(sale.net_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => window.location.href = `/transaction/sale/${sale.book_code}/${sale.vouch_no}`}
                      className="flex-1 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg font-medium active:bg-blue-100"
                    >
                      <Edit2 className="w-4 h-4 inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handlePrintSale(sale)}
                      className="flex-1 py-2 text-sm text-purple-600 bg-purple-50 rounded-lg font-medium active:bg-purple-100"
                    >
                      <Printer className="w-4 h-4 inline mr-1" /> Print
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare(sale)}
                      className="flex-1 py-2 text-sm text-green-600 bg-green-50 rounded-lg font-medium active:bg-green-100"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 inline mr-1 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.47-1.761-1.643-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                      Share
                    </button>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => setShowDeleteConfirm({ bookCode: sale.book_code, vouchNo: sale.vouch_no })}
                        className="py-2 px-3 text-sm text-red-600 bg-red-50 rounded-lg font-medium active:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6 text-center">Volume</th>
                    <th className="py-4 px-6 text-right">Net Amount</th>
                    <th className="py-4 px-6 text-center">Created By</th>
                    <th className="py-4 px-6 text-center flex-shrink-0 w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sales.map((sale) => (
                    <tr key={`${sale.book_code}-${sale.vouch_no}`} className="hover:bg-slate-50/50 transition-colors group">
                      
                      {/* Voucher Details */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[13px] font-semibold text-slate-800 tracking-tight flex items-center gap-1.5">
                            {sale.book_code}-{sale.vouch_no}
                          </span>
                          <span className="text-[12px] text-slate-500 font-medium">
                            {format(new Date(sale.vouch_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                      </td>

                      {/* Customer Column */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-erp-primary/10 text-erp-primary flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100/50 shrink-0">
                            {sale.party_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-erp-primary transition-colors">
                              {sale.party_name}
                            </span>
                            <span className="text-[12px] text-slate-500 font-medium tracking-wide">
                              {sale.party_phone || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Quantity Badge */}
                      <td className="py-4 px-6 text-center align-middle">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100/80 text-slate-600 border border-slate-200">
                          {parseFloat(sale.total_qty || 0)} items
                        </span>
                      </td>

                      {/* Net Amount Field */}
                      <td className="py-4 px-6 text-right align-middle">
                        <div className="flex flex-col items-end">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-bold shadow-sm border ${
                            sale.net_amount > 10000 
                              ? 'bg-rose-50 text-rose-600 border-rose-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            ₹{parseFloat(sale.net_amount).toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Created By */}
                      <td className="py-4 px-6 text-center align-middle">
                        <span className="inline-block px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-slate-50 text-slate-500 border border-slate-200 rounded-md">
                          {sale.created_by || 'SYSTEM'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => window.location.href = `/transaction/sale/${sale.book_code}/${sale.vouch_no}`}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 hover:text-erp-primary hover:shadow-sm transition-all shadow-sm"
                            title="Edit / View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintSale(sale)}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-purple-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 hover:shadow-sm transition-all shadow-sm"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleWhatsAppShare(sale)}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-sm transition-all shadow-sm"
                            title="Share on WhatsApp"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.47-1.761-1.643-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                          </button>
                          {userRole === 'admin' && (
                            <button
                              onClick={() => setShowDeleteConfirm({ bookCode: sale.book_code, vouchNo: sale.vouch_no })}
                              className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:shadow-sm transition-all shadow-sm"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
                Are you sure you want to delete sales return transaction <strong>{showDeleteConfirm.bookCode}-{showDeleteConfirm.vouchNo}</strong>?
                This action cannot be undone.
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
                className="flex-1 px-4 py-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
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

export default SaleReturnList;
