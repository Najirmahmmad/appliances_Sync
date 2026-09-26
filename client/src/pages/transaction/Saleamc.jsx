import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Minus, Save, Trash2, X, Calendar,
  User, Phone, Mail, MapPin, FileText,
  Calculator, AlertCircle, CheckCircle,
  RefreshCw, Edit2, Eye, CreditCard,
  Share2, Camera
} from 'lucide-react';
import { format } from 'date-fns';
import { getUserID, getToken, getUserName } from '../../utils/auth';
import Select from 'react-select';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';



// Calculate row amounts based on inclusive tax formula
const calculateRow = (qty, rate, tax_perc) => {
  const quantity = parseFloat(qty) || 0;
  const itemRate = parseFloat(rate) || 0;
  const taxPercentage = parseFloat(tax_perc) || 0;

  // Inclusive Tax Formula
  // For tax-inclusive pricing, the rate already includes tax
  const totalValue = itemRate * quantity;
  const basicAmount = totalValue / (1 + (taxPercentage / 100));
  const taxAmount = totalValue - basicAmount;

  return {
    basic_amt: parseFloat(basicAmount.toFixed(2)),
    tax_amt: parseFloat(taxAmount.toFixed(2)),
    net_amt: parseFloat(totalValue.toFixed(2))
  };
};

const Saleamc = ({ initialBookCode = 'SAM' }) => {
  const { bookCode: paramBookCode, vouchNo } = useParams();
  const effectiveBookCode = paramBookCode || initialBookCode;
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [header, setHeader] = useState({
    book_code: effectiveBookCode, // Sale
    vouch_date: format(new Date(), 'yyyy-MM-dd'),
    party_phone: '',
    party_name: '',
    party_address: '',
    party_email: '',
    party_gst: '',
    remarks: '',
    created_by: '', // Initialize
    payment_mode: 'Cash'
  });
  const [items, setItems] = useState([
    { sr_no: 1, item_code: '', item_name: '', qty: 0, rate: 0, tax_perc: 0, comm_rate: 0, basic_amt: 0, tax_amt: 0, net_amt: 0, tot_commission: 0, current_stock: 0, model_no: '', serial_no: '' }
  ]);
  const [availableItems, setAvailableItems] = useState([]);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [activeTab, setActiveTab] = useState(1);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scanner state
  const [activeScanner, setActiveScanner] = useState(null); // { index, field }
  const [scannerError, setScannerError] = useState('');
  const scannerRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  // Start scanning
  const startScanner = async (index, field, cameraId = null) => {
    // Stop any running scanner first
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.error('Failed to stop previous scanner:', e);
      }
      scannerRef.current = null;
    }

    setActiveScanner({ index, field });
    setScannerError('');

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('barcode-reader');
        scannerRef.current = html5QrCode;

        // Try to fetch cameras to let the user select/switch
        let devices = [];
        try {
          devices = await Html5Qrcode.getCameras();
          setCameras(devices);
        } catch (camErr) {
          console.warn('Failed to get cameras list:', camErr);
        }

        // Determine camera to use
        let cameraConfig = { facingMode: 'environment' };
        if (cameraId) {
          cameraConfig = cameraId === 'environment' ? { facingMode: 'environment' } : cameraId;
          setSelectedCameraId(cameraId);
        } else if (devices && devices.length > 0) {
          // Try to find the back/rear camera
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('facing back')
          );
          if (backCam) {
            cameraConfig = backCam.id;
            setSelectedCameraId(backCam.id);
          } else {
            // If not explicitly labeled, use the last camera (often back camera on multi-lens phones)
            cameraConfig = devices[devices.length - 1].id;
            setSelectedCameraId(devices[devices.length - 1].id);
          }
        } else {
          setSelectedCameraId('environment');
        }

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: (width, height) => {
              const minSize = Math.min(width, height);
              const boxWidth = Math.floor(minSize * 0.75);
              return { width: boxWidth, height: Math.floor(boxWidth * 0.6) };
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            handleItemChange(index, field, decodedText);
            stopScanner();
          },
          (errorMessage) => {
            // ignore scan parsing errors
          }
        );
      } catch (err) {
        console.error('Failed to start scanner:', err);
        let errMsg = err.message || 'Camera access denied or not available.';
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          errMsg += '\n\nNote: Camera access requires a secure connection (HTTPS or localhost). If you are accessing this from a mobile phone over HTTP (like http://192.168.x.x), camera access will be blocked by the browser.';
        }
        setScannerError(errMsg);
      }
    }, 300);
  };

  // Switch Camera
  const switchCamera = async (cameraId) => {
    if (activeScanner) {
      await startScanner(activeScanner.index, activeScanner.field, cameraId);
    }
  };

  // Stop scanning
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
      scannerRef.current = null;
    }
    setActiveScanner(null);
    setScannerError('');
    setCameras([]);
    setSelectedCameraId('');
  };

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Fetch company profile for owner phone and company details
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/company-profile`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (response.data.data) {
          setCompanyProfile(response.data.data);
          if (response.data.data.owner_phone) {
            setOwnerPhone(response.data.data.owner_phone);
          }
        }
      } catch (err) {
        console.error('Failed to fetch company profile', err);
      }
    };
    fetchCompanyProfile();
  }, []);

  // Fetch active items for dropdown
  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/items?status=Active&isAMC=Yes`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setAvailableItems(response.data.data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  // Fetch sales transaction for editing
  const fetchSaleTransaction = async (bookCode, vouchNo) => {
    if (!bookCode || !vouchNo) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_URL}/sales/${bookCode}/${vouchNo}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      const { header: saleHeader, items: saleItems } = response.data.data;

      setHeader({
        book_code: saleHeader.book_code,
        vouch_date: new Date(saleHeader.vouch_date).toISOString().split('T')[0],
        party_phone: saleHeader.party_phone || '',
        party_name: saleHeader.party_name,
        party_address: saleHeader.party_address || '',
        party_email: saleHeader.party_email || '',
        party_gst: saleHeader.party_gst || '',
        remarks: saleHeader.remarks || '',
        created_by: saleHeader.created_by, // Preserve original creator
        payment_mode: saleHeader.payment_mode || 'Cash'
      });

      // Map the fetched items to our format
      const mappedItems = saleItems.map((item, index) => {
        const parsedRate = parseFloat(item.rate) || 0;
        return {
          sr_no: item.sr_no,
          item_code: item.item_code,
          item_name: item.item_name,
          qty: parseFloat(item.qty),
          rate: parsedRate,
          tax_perc: parseFloat(item.tax_perc),
          comm_rate: parsedRate === 0 ? 0 : (parseFloat(item.comm_rate) || 0), // Include commission rate
          tot_commission: parsedRate === 0 ? 0 : (parseFloat(item.tot_commission) || 0),
          basic_amt: parseFloat(item.basic_amt),
          tax_amt: parseFloat(item.tax_amt),
          net_amt: parseFloat(item.net_amt),
          model_no: item.model_no || '',
          serial_no: item.serial_no || ''
        };
      });

      setItems(mappedItems);
      setIsEditMode(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch sales transaction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();

    // If we have bookCode and vouchNo, we're in edit mode
    if (effectiveBookCode && vouchNo) {
      fetchSaleTransaction(effectiveBookCode, vouchNo);
    }
  }, [effectiveBookCode, vouchNo]);

  // Auto-fill party details when phone is entered
  const fetchPartyDetails = async (phone) => {
    if (phone && phone.length === 10) {
      setAutoFillLoading(true);
      try {
        const response = await axios.get(`${API_URL}/sales/party-details/${phone}`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });

        if (response.data.data) {
          setHeader(prev => ({
            ...prev,
            party_name: response.data.data.party_name || prev.party_name,
            party_address: response.data.data.party_address || prev.party_address,
            party_email: response.data.data.party_email || prev.party_email,
            party_gst: response.data.data.party_gst || prev.party_gst
          }));
        }
      } catch (err) {
        console.error('Failed to fetch party details:', err);
      } finally {
        setAutoFillLoading(false);
      }
    }
  };

  // Handle header input change
  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeader(prev => ({ ...prev, [name]: value }));

    // Auto-fetch party details when phone is 10 digits
    if (name === 'party_phone' && value.length === 10) {
      fetchPartyDetails(value);
    }
  };

  // Handle item input change
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];

    // Update the specific field
    newItems[index][field] = value;

    // If item_code changes, auto-populate from item master
    if (field === 'item_code') {
      const selectedItem = availableItems.find(item => item.item_code === value);
      if (selectedItem) {
        newItems[index].item_name = selectedItem.item_name;
        newItems[index].rate = parseFloat(selectedItem.sale_rate) || 0;
        newItems[index].tax_perc = parseFloat(selectedItem.tax_rate) || 0;
        newItems[index].qty = 1; // Set default qty to 1
        newItems[index].comm_rate = parseFloat(selectedItem.commission) || 0;
        newItems[index].current_stock = parseFloat(selectedItem.current_stock) || 0;

        // Trigger initial calculation since qty is set to 1
        const calculations = calculateRow(1, newItems[index].rate, newItems[index].tax_perc);
        newItems[index].basic_amt = calculations.basic_amt;
        newItems[index].tax_amt = calculations.tax_amt;
        newItems[index].net_amt = calculations.net_amt;
        newItems[index].tot_commission = 1 * newItems[index].comm_rate;
      }
    }

    // Recalculate row amounts if qty, rate, or tax_perc changed
    if (['qty', 'rate', 'tax_perc'].includes(field)) {
      const calculations = calculateRow(newItems[index].qty, newItems[index].rate, newItems[index].tax_perc);
      newItems[index].basic_amt = calculations.basic_amt;
      newItems[index].tax_amt = calculations.tax_amt;
      newItems[index].net_amt = calculations.net_amt;
    }

    // If rate is 0, commission rate must be 0
    if (parseFloat(newItems[index].rate) === 0 || newItems[index].rate === '') {
      newItems[index].comm_rate = 0;
    }

    // Recalculate total commission
    const qty = parseFloat(newItems[index].qty) || 0;
    const commRate = parseFloat(newItems[index].comm_rate) || 0;
    newItems[index].tot_commission = qty * commRate;

    setItems(newItems);
  };

  // Add new row
  const addRow = () => {
    const newRow = {
      sr_no: items.length + 1,
      item_code: '',
      item_name: '',
      qty: 0,
      rate: 0,
      tax_perc: 0,
      comm_rate: 0,
      basic_amt: 0,
      tax_amt: 0,
      net_amt: 0,
      model_no: '',
      serial_no: ''
    };
    setItems([...items, newRow]);
  };

  // Remove row
  const removeRow = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      // Renumber sr_no
      newItems.forEach((item, idx) => {
        item.sr_no = idx + 1;
      });
      setItems(newItems);
    }
  };

  // Calculate summary totals using useMemo for performance
  const summary = useMemo(() => {
    let totalQty = 0;
    let totalBasic = 0;
    let totalTax = 0;
    let netAmount = 0;
    let totalItems = 0;
    let totalSGST = 0;
    let totalCGST = 0;

    items.forEach(item => {
      if (item.qty && item.rate) {
        totalQty += parseFloat(item.qty);
        totalBasic += parseFloat(item.basic_amt) * parseFloat(item.qty);
        totalTax += parseFloat(item.tax_amt) * parseFloat(item.qty);
        netAmount += parseFloat(item.net_amt);
        totalItems += 1;

        // Calculate SGST and CGST (half of total tax each)
        const sgst = (parseFloat(item.tax_amt) * parseFloat(item.qty)) / 2;
        const cgst = sgst;
        totalSGST += sgst;
        totalCGST += cgst;
      }
    });

    return {
      totalItems: totalItems,
      totalQty: parseFloat(totalQty.toFixed(2)),
      totalSGST: parseFloat(totalSGST.toFixed(2)),
      totalCGST: parseFloat(totalCGST.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      grandTotal: parseFloat(netAmount.toFixed(2))
    };
  }, [items]); // Recalculate when items change

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
          party_address: header.party_address || null,
          party_email: header.party_email || null,
          party_gst: header.party_gst || null,
          remarks: header.remarks || null,
          created_by: header.created_by || getUserID() // Send existing or new user ID
        },
        items: items.map(item => {
          const parsedRate = parseFloat(item.rate) || 0;
          return {
            item_code: item.item_code,
            qty: parseFloat(item.qty),
            rate: parsedRate,
            tax_perc: parseFloat(item.tax_perc),
            comm_rate: parsedRate === 0 ? 0 : (parseFloat(item.comm_rate) || 0), // Enforce 0 if rate is 0
            model_no: item.model_no,
            serial_no: item.serial_no
          };
        })
      };

      let response;
      if (isEditMode) {
        // Update existing transaction
        response = await axios.put(`${API_URL}/sales/${header.book_code}/${vouchNo}`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
      } else {
        // Create new transaction
        payload.header.book_code = effectiveBookCode;
        response = await axios.post(`${API_URL}/sales`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
      }

      setSuccess(response.data.message || 'Sales transaction saved successfully!');

      // Notify Owner if new sale and owner phone exists
      if (!isEditMode && ownerPhone) {
        try {
          const techName = getUserName();
          const invNo = `${effectiveBookCode}-${response.data.data?.vouch_no || header.vouch_no || 'New'}`;
          const totalAmount = summary.grandTotal.toFixed(2);
          const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

          const msg = `📢 NEW SALE ALERT

Inv No: ${invNo}
Customer: ${header.party_name}
Amount: ₹${totalAmount}
Technician: ${techName}
Time: ${currentTime}`;

          // Open WhatsApp
          window.open(`https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
        } catch (notifyErr) {
          console.error("Notification Error", notifyErr);
        }
      }

      // If it's a new transaction, reset form
      if (!isEditMode) {
        setHeader({
          book_code: effectiveBookCode,
          vouch_date: format(new Date(), 'yyyy-MM-dd'),
          party_phone: '',
          party_name: '',
          party_address: '',
          party_email: '',
          party_gst: '',
          remarks: '',
          payment_mode: 'Cash'
        });
        setItems([{ sr_no: 1, item_code: '', item_name: '', qty: 0, rate: 0, tax_perc: 0, comm_rate: 0, basic_amt: 0, tax_amt: 0, net_amt: 0, tot_commission: 0, current_stock: 0, model_no: '', serial_no: '' }]);
      } else {
        // If editing, redirect to the list after a delay
        setTimeout(() => {
          navigate(effectiveBookCode === 'SAM' ? '/transaction/sale-amc-list' : '/transaction/sale-amc-list');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save sales transaction');
    } finally {
      setFormLoading(false);
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

  // Prepare options for react-select
  const itemOptions = useMemo(() => availableItems.map(availItem => ({
    value: availItem.item_code,
    label: `${availItem.item_name} - ${availItem.item_code}`
  })), [availableItems]);

  // Generate Invoice PDF
  const generateInvoicePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header - Company Info
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companyProfile?.company_name || 'Company Name', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(companyProfile?.address || '', pageWidth / 2, 22, { align: 'center' });
    doc.text(`Phone: ${companyProfile?.phone || ''} | GST: ${companyProfile?.gst_no || ''}`, pageWidth / 2, 28, { align: 'center' });
    
    // Invoice Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${effectiveBookCode === 'SA' ? 'SALES' : 'SALES RETURN'} INVOICE`, pageWidth / 2, 40, { align: 'center' });
    
    // Invoice Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${header.book_code}-${vouchNo || 'New'}`, 14, 50);
    doc.text(`Date: ${format(new Date(header.vouch_date), 'dd/MM/yyyy')}`, pageWidth - 60, 50);
    doc.text(`Payment Mode: ${header.payment_mode}`, 14, 56);
    
    // Customer Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 14, 68);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${header.party_name || ''}`, 14, 75);
    doc.text(`Phone: ${header.party_phone || ''}`, 14, 81);
    doc.text(`Address: ${header.party_address || ''}`, 14, 87);
    doc.text(`GST: ${header.party_gst || ''}`, 14, 93);
    
    // Items Table
    const tableData = items
      .filter(item => item.item_code && item.qty > 0)
      .map((item, index) => [
        index + 1,
        item.item_name || item.item_code,
        item.qty,
        `₹${item.rate.toFixed(2)}`,
        `${item.tax_perc}%`,
        `₹${item.net_amt.toFixed(2)}`
      ]);
    
    doc.autoTable({
      startY: 100,
      head: [['#', 'Item', 'Qty', 'Rate', 'Tax%', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 135, 245], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' }
      }
    });
    
    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Items: ${summary.totalItems}`, 14, finalY);
    doc.text(`Total Qty: ${summary.totalQty}`, 70, finalY);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`SGST: ₹${summary.totalSGST.toFixed(2)}`, pageWidth - 80, finalY);
    doc.text(`CGST: ₹${summary.totalCGST.toFixed(2)}`, pageWidth - 80, finalY + 6);
    doc.text(`Total Tax: ₹${summary.totalTax.toFixed(2)}`, pageWidth - 80, finalY + 12);
    
    doc.setFontSize(14);
    doc.setTextColor(66, 135, 245);
    doc.text(`Grand Total: ₹${summary.grandTotal.toFixed(2)}`, pageWidth - 80, finalY + 22);
    doc.setTextColor(0);
    
    // Remarks
    if (header.remarks) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Remarks: ${header.remarks}`, 14, finalY + 35);
    }
    
    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    
    return doc;
  };

  // Handle WhatsApp Share
  const handleWhatsAppShare = async () => {
    if (!header.party_phone || header.party_phone.length !== 10) {
      setError('Please enter a valid 10-digit customer phone number');
      return;
    }
    
    if (items.filter(item => item.item_code && item.qty > 0).length === 0) {
      setError('Please add at least one item');
      return;
    }
    
    setShareLoading(true);
    setError('');
    
    try {
      // Generate PDF
      const doc = generateInvoicePDF();
      const pdfBase64 = doc.output('datauristring');
      
      // Create filename
      const fileName = `Invoice_${header.book_code}-${vouchNo || Date.now()}.pdf`;
      
      // Upload to backend
      const response = await axios.post(`${API_URL}/upload/invoice`, {
        pdfBase64,
        fileName
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      if (response.data.success) {
        const pdfUrl = response.data.url;
        
        // Format phone with country code
        const phoneWithCountryCode = `91${header.party_phone.replace(/\D/g, '')}`;
        
        // Create WhatsApp message
        const message = `Dear ${header.party_name || 'Customer'}, please view your invoice here: ${pdfUrl}`;
        
        // Open WhatsApp
        window.open(`https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`, '_blank');
      } else {
        setError('Failed to upload invoice');
      }
    } catch (err) {
      console.error('WhatsApp share error:', err);
      setError(err.response?.data?.message || 'Failed to share invoice on WhatsApp');
    } finally {
      setShareLoading(false);
    }
  };

  // ─── inline style helpers (no Tailwind needed, works in Capacitor APK) ───
  const S = {
    page: { minHeight: '100vh', background: '#f3f4f6', paddingBottom: 100, fontFamily: 'system-ui,sans-serif' },
    // header bar
    headerBar: { position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    headerTitle: { fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 },
    headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    totalBadge: { background: '#eff6ff', borderRadius: 10, padding: '6px 14px', textAlign: 'right' },
    totalLabel: { fontSize: 11, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' },
    totalValue: { fontSize: 18, fontWeight: 700, color: '#2563eb' },
    // container
    wrap: { maxWidth: 780, margin: '0 auto', padding: '16px 12px' },
    // alerts
    alertErr: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 12, color: '#991b1b', fontSize: 14 },
    alertOk: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 12, color: '#166534', fontSize: 14 },
    // tabs
    tabBar: { background: '#e5e7eb', borderRadius: 12, padding: 4, display: 'flex', gap: 4, marginBottom: 16 },
    tabBtn: (active) => ({ flex: 1, padding: '11px 8px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 9, cursor: 'pointer', background: active ? '#fff' : 'transparent', color: active ? '#2563eb' : '#6b7280', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }),
    tabBadge: { background: '#2563eb', color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '1px 7px' },
    // cards
    card: { background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 14 },
    cardHead: { padding: '13px 18px', background: '#eff6ff', borderBottom: '1px solid #e5e7eb' },
    cardHeadLabel: { fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.07em' },
    cardBody: { padding: 18 },
    grid2: { display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' },
    grid3: { display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr 1fr' },
    // field
    fieldLabel: { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' },
    req: { color: '#dc2626' },
    inputWrap: { position: 'relative' },
    iconPos: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', display: 'flex', alignItems: 'center' },
    iconPosTop: { position: 'absolute', left: 12, top: 12, color: '#9ca3af', pointerEvents: 'none', display: 'flex' },
    input: { width: '100%', boxSizing: 'border-box', paddingLeft: 42, paddingRight: 14, paddingTop: 11, paddingBottom: 11, fontSize: 15, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#f9fafb', color: '#111827', outline: 'none' },
    inputNoIcon: { width: '100%', boxSizing: 'border-box', padding: '11px 14px', fontSize: 15, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#f9fafb', color: '#111827', outline: 'none' },
    textarea: { width: '100%', boxSizing: 'border-box', paddingLeft: 42, paddingRight: 14, paddingTop: 11, paddingBottom: 11, fontSize: 15, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#f9fafb', color: '#111827', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
    select: { width: '100%', boxSizing: 'border-box', paddingLeft: 42, paddingRight: 32, paddingTop: 11, paddingBottom: 11, fontSize: 15, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#f9fafb', color: '#111827', outline: 'none', appearance: 'none', cursor: 'pointer' },
    chevron: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' },
    autoFill: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#2563eb' },
    // expandable
    expandBtn: { width: '100%', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151', borderTop: '1px solid #e5e7eb' },
    // item card
    itemCard: { background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 12 },
    itemHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: '#eff6ff', borderBottom: '1px solid #e5e7eb' },
    itemLabel: { fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.07em' },
    itemBody: { padding: '14px 16px' },
    itemTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f3f4f6', marginTop: 4 },
    itemTotalSub: { fontSize: 12, color: '#9ca3af' },
    itemTotalAmt: { fontSize: 17, fontWeight: 700, color: '#2563eb' },
    numInput: { width: '100%', boxSizing: 'border-box', padding: '9px 10px', fontSize: 14, textAlign: 'right', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#111827', outline: 'none' },
    // add item dashed
    addItemBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, background: 'transparent', border: '2px dashed #d1d5db', borderRadius: 14, fontSize: 14, fontWeight: 600, color: '#2563eb', cursor: 'pointer', width: '100%', marginBottom: 14 },
    // summary
    summaryCard: { background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px 20px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(80px,1fr))', gap: 16 },
    sumPill: { textAlign: 'center' },
    sumLabel: { fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    sumVal: { fontSize: 15, fontWeight: 700, color: '#111827', marginTop: 2 },
    sumGrandLabel: { fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    sumGrandVal: { fontSize: 20, fontWeight: 700, color: '#2563eb', marginTop: 2 },
    // buttons
    btnRow: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 22px', fontSize: 14, fontWeight: 700, borderRadius: 10, cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none', whiteSpace: 'nowrap' },
    btnSuccess: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 22px', fontSize: 14, fontWeight: 700, borderRadius: 10, cursor: 'pointer', background: '#16a34a', color: '#fff', border: 'none', whiteSpace: 'nowrap' },
    btnGhost: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 22px', fontSize: 14, fontWeight: 700, borderRadius: 10, cursor: 'pointer', background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', whiteSpace: 'nowrap' },
    btnFull: { width: '100%' },
    // react-select override styles (works in APK)
    rsControl: { minHeight: 44, fontSize: 15, borderRadius: 10, background: '#f9fafb', borderColor: '#e5e7eb' },
    // scanner styles
    btnScan: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background-color 0.2s' },
    scannerOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 },
    scannerModal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column' },
    scannerHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb' },
    scannerTitle: { fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 },
    scannerCloseBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, display: 'flex', alignItems: 'center' },
    scannerBody: { padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' },
    scannerBox: { width: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '1.0' },
    scannerReader: { width: '100%', height: '100%' },
    scannerTargetFrame: { position: 'absolute', top: '12.5%', left: '12.5%', width: '75%', height: '75%', border: '2px solid #2563eb', borderRadius: 12, pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    scannerLaserLine: { width: '90%', height: 2, background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'scanLaser 2s linear infinite' },
    scannerTip: { fontSize: 13, color: '#6b7280', marginTop: 12, textAlign: 'center' },
    scannerFooter: { padding: '12px 18px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', background: '#f9fafb' },
  };

  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div style={S.page}>
      {/* ── Sticky Header Bar ─────────────────────────────────────── */}
      <div style={S.headerBar}>
        <div>
          <div style={S.headerTitle}>{effectiveBookCode === 'SAM' ? 'Sales AMC Invoice' : 'Sales AMC Invoice Return'}</div>
          <div style={S.headerSub}>{isEditMode ? `Editing Voucher #${vouchNo}` : header.vouch_date || 'New Transaction'}</div>
        </div>
        {summary.grandTotal > 0 && (
          <div style={S.totalBadge}>
            <div style={S.totalLabel}>Total</div>
            <div style={S.totalValue}>₹{summary.grandTotal.toFixed(2)}</div>
          </div>
        )}
      </div>

      <div style={S.wrap}>
        {/* ── Alerts ──────────────────────────────────────────────── */}
        {error && (
          <div style={S.alertErr}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={S.alertOk}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* ── Tab Bar ───────────────────────────────────────────── */}
        <div style={S.tabBar}>
          <button type="button" onClick={() => setActiveTab(1)} style={S.tabBtn(activeTab === 1)}>
            <User size={15} />
            <span>Customer</span>
          </button>
          <button type="button" onClick={() => setActiveTab(2)} style={S.tabBtn(activeTab === 2)}>
            <FileText size={15} />
            <span>Items</span>
            {items.filter(i => i.item_code && i.qty > 0).length > 0 && (
              <span style={S.tabBadge}>{items.filter(i => i.item_code && i.qty > 0).length}</span>
            )}
          </button>
        </div>

        {/* ── Form ──────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>

          {/* ════════════════════════════════════════════════════════
              TAB 1 – CUSTOMER
          ════════════════════════════════════════════════════════ */}
          {activeTab === 1 && (
            <>
              {/* Invoice Details Card */}
              <div style={S.card}>
                <div style={S.cardHead}><span style={S.cardHeadLabel}>Invoice Details</span></div>
                <div style={{ ...S.cardBody, ...{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' } }}>

                  {/* Voucher Date */}
                  <div>
                    <label style={S.fieldLabel}>Voucher Date <span style={S.req}>*</span></label>
                    <div style={S.inputWrap}>
                      <span style={S.iconPos}><Calendar size={17} /></span>
                      <input
                        type="date"
                        name="vouch_date"
                        value={header.vouch_date}
                        onChange={handleHeaderChange}
                        required
                        style={S.input}
                      />
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label style={S.fieldLabel}>Payment Mode</label>
                    <div style={S.inputWrap}>
                      <span style={S.iconPos}><CreditCard size={17} /></span>
                      <select name="payment_mode" value={header.payment_mode} onChange={handleHeaderChange} style={S.select}>
                        <option value="Cash">Cash</option>
                        <option value="Online">Online</option>
                      </select>
                      <span style={S.chevron}>▾</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Customer Info Card */}
              <div style={S.card}>
                <div style={S.cardHead}><span style={S.cardHeadLabel}>Customer Information</span></div>
                <div style={{ ...S.cardBody, ...{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' } }}>

                  {/* Phone */}
                  <div>
                    <label style={S.fieldLabel}>Phone <span style={{ color: '#9ca3af', fontSize: 10, textTransform: 'none', fontWeight: 400 }}>(10 digits)</span></label>
                    <div style={S.inputWrap}>
                      <span style={S.iconPos}><Phone size={17} /></span>
                      <input
                        type="tel"
                        name="party_phone"
                        value={header.party_phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                            handleHeaderChange({ ...e, target: { ...e.target, name: 'party_phone', value } });
                          }
                        }}
                        placeholder="Enter 10-digit phone"
                        style={S.input}
                      />
                    </div>
                    {autoFillLoading && (
                      <div style={S.autoFill}>
                        <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Auto-filling details...
                      </div>
                    )}
                  </div>

                  {/* Party Name */}
                  <div>
                    <label style={S.fieldLabel}>Customer Name <span style={S.req}>*</span></label>
                    <div style={S.inputWrap}>
                      <span style={S.iconPos}><User size={17} /></span>
                      <input
                        type="text"
                        name="party_name"
                        value={header.party_name}
                        onChange={handleHeaderChange}
                        required
                        placeholder="Enter customer name"
                        style={S.input}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label style={S.fieldLabel}>Email</label>
                    <div style={S.inputWrap}>
                      <span style={S.iconPos}><Mail size={17} /></span>
                      <input
                        type="email"
                        name="party_email"
                        value={header.party_email}
                        onChange={handleHeaderChange}
                        placeholder="customer@email.com"
                        style={S.input}
                      />
                    </div>
                  </div>

                  {/* GST */}
                  <div>
                    <label style={S.fieldLabel}>GST Number</label>
                    <input
                      type="text"
                      name="party_gst"
                      value={header.party_gst}
                      onChange={handleHeaderChange}
                      placeholder="22AAAAA0000A1Z5"
                      style={S.inputNoIcon}
                    />
                  </div>

                </div>

                {/* Expandable: Address + Remarks */}
                <button
                  type="button"
                  onClick={() => setMoreOpen(v => !v)}
                  style={S.expandBtn}
                >
                  <span>More Details (Address &amp; Remarks)</span>
                  <span style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▾</span>
                </button>

                {moreOpen && (
                  <div style={{ padding: '0 18px 18px', display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', borderTop: '1px solid #f3f4f6' }}>
                    <div>
                      <label style={{ ...S.fieldLabel, marginTop: 14 }}>Address</label>
                      <div style={S.inputWrap}>
                        <span style={S.iconPosTop}><MapPin size={17} /></span>
                        <textarea
                          name="party_address"
                          value={header.party_address}
                          onChange={handleHeaderChange}
                          placeholder="Customer address"
                          rows={3}
                          style={S.textarea}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ ...S.fieldLabel, marginTop: 14 }}>Remarks</label>
                      <div style={S.inputWrap}>
                        <span style={S.iconPosTop}><FileText size={17} /></span>
                        <textarea
                          name="remarks"
                          value={header.remarks}
                          onChange={handleHeaderChange}
                          placeholder="Additional notes..."
                          rows={3}
                          style={S.textarea}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={() => setActiveTab(2)}
                style={{ ...S.btnPrimary, ...S.btnFull }}
              >
                Next: Add Items →
              </button>
            </>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 2 – ITEMS
          ════════════════════════════════════════════════════════ */}
          {activeTab === 2 && (
            <>
              {/* Item Cards */}
              {items.map((item, index) => (
                <div key={index} style={S.itemCard}>
                  {/* Card header */}
                  <div style={S.itemHead}>
                    <span style={S.itemLabel}>Item #{item.sr_no}</span>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={items.length <= 1}
                      style={{ background: 'none', border: 'none', cursor: items.length <= 1 ? 'not-allowed' : 'pointer', color: '#dc2626', opacity: items.length <= 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', padding: 4 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={S.itemBody}>
                    {/* Item Select */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={S.fieldLabel}>Select Item</label>
                      <Select
                        value={itemOptions.find(op => op.value === item.item_code) || null}
                        onChange={(selectedOption) => handleItemChange(index, 'item_code', selectedOption ? selectedOption.value : '')}
                        options={itemOptions}
                        placeholder="Search & select item..."
                        isClearable
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: base => ({ ...base, zIndex: 9999 }),
                          control: base => ({
                            ...base,
                            minHeight: 44,
                            fontSize: 15,
                            borderRadius: 10,
                            backgroundColor: '#f9fafb',
                            borderColor: '#e5e7eb',
                            boxShadow: 'none',
                          }),
                          option: (base, state) => ({
                            ...base,
                            color: '#111827',
                            backgroundColor: state.isFocused ? '#eff6ff' : 'white',
                            padding: '10px 14px',
                          }),
                          singleValue: base => ({ ...base, color: '#111827' }),
                          menu: base => ({ ...base, zIndex: 9999, borderRadius: 10 }),
                          placeholder: base => ({ ...base, color: '#9ca3af' }),
                        }}
                      />
                    </div>

                    {/* Qty / Rate / Tax row */}
                    <div style={S.grid3}>
                      <div>
                        <label style={S.fieldLabel}>Qty</label>
                        <input
                          type="number" min="0.01" step="0.01"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          style={S.numInput}
                        />
                      </div>
                      <div>
                        <label style={S.fieldLabel}>Rate</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          style={S.numInput}
                        />
                      </div>
                      <div>
                        <label style={S.fieldLabel}>Tax %</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.tax_perc}
                          onChange={(e) => handleItemChange(index, 'tax_perc', e.target.value)}
                          style={S.numInput}
                        />
                      </div>
                    </div>

                    {/* Extra fields for SAM */}
                    {effectiveBookCode === 'SAM' && (
                      isMobile ? (
                        <div style={{ marginTop: 12 }}>
                          {/* Row 1: Model No and Serial No inputs side-by-side */}
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <label style={S.fieldLabel}>Model No</label>
                              <input
                                type="text"
                                value={item.model_no}
                                onChange={(e) => handleItemChange(index, 'model_no', e.target.value)}
                                placeholder="Model No"
                                style={S.inputNoIcon}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={S.fieldLabel}>Serial No</label>
                              <input
                                type="text"
                                value={item.serial_no}
                                onChange={(e) => handleItemChange(index, 'serial_no', e.target.value)}
                                placeholder="Serial No"
                                style={S.inputNoIcon}
                              />
                            </div>
                          </div>
                          {/* Row 2: Camera scan buttons side-by-side */}
                          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                            <button
                              type="button"
                              onClick={() => startScanner(index, 'model_no')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '10px 14px',
                                fontSize: 13,
                                fontWeight: 600,
                                borderRadius: 10,
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                flex: 1
                              }}
                              title="Scan Model No"
                            >
                              <Camera size={16} />
                              Scan Model
                            </button>
                            <button
                              type="button"
                              onClick={() => startScanner(index, 'serial_no')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '10px 14px',
                                fontSize: 13,
                                fontWeight: 600,
                                borderRadius: 10,
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                flex: 1
                              }}
                              title="Scan Serial No"
                            >
                              <Camera size={16} />
                              Scan Serial
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ ...S.grid3, marginTop: 12 }}>
                          <div>
                            <label style={S.fieldLabel}>Model No</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input
                                type="text"
                                value={item.model_no}
                                onChange={(e) => handleItemChange(index, 'model_no', e.target.value)}
                                placeholder="Enter Model No"
                                style={{ ...S.inputNoIcon, flex: 1 }}
                              />
                              <button
                                type="button"
                                onClick={() => startScanner(index, 'model_no')}
                                style={S.btnScan}
                                title="Scan Model No"
                              >
                                <Camera size={16} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label style={S.fieldLabel}>Serial No</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input
                                type="text"
                                value={item.serial_no}
                                onChange={(e) => handleItemChange(index, 'serial_no', e.target.value)}
                                placeholder="Enter Serial No"
                                style={{ ...S.inputNoIcon, flex: 1 }}
                              />
                              <button
                                type="button"
                                onClick={() => startScanner(index, 'serial_no')}
                                style={S.btnScan}
                                title="Scan Serial No"
                              >
                                <Camera size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    {/* Per-item total */}
                    {item.item_code && item.qty > 0 && (
                      <div style={S.itemTotal}>
                        <span style={S.itemTotalSub}>
                          Basic ₹{item.basic_amt.toFixed(2)} + Tax ₹{item.tax_amt.toFixed(2)}
                        </span>
                        <span style={S.itemTotalAmt}>₹{item.net_amt.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Item Button */}
              <button type="button" onClick={addRow} style={S.addItemBtn}>
                <Plus size={18} />
                Add Another Item
              </button>

              {/* Summary Card */}
              {summary.totalItems > 0 && (
                <div style={S.summaryCard}>
                  <div style={S.summaryGrid}>
                    <div style={S.sumPill}>
                      <div style={S.sumLabel}>Items</div>
                      <div style={S.sumVal}>{summary.totalItems}</div>
                    </div>
                    <div style={S.sumPill}>
                      <div style={S.sumLabel}>Total Qty</div>
                      <div style={S.sumVal}>{summary.totalQty}</div>
                    </div>
                    <div style={S.sumPill}>
                      <div style={S.sumLabel}>SGST</div>
                      <div style={S.sumVal}>₹{summary.totalSGST.toFixed(2)}</div>
                    </div>
                    <div style={S.sumPill}>
                      <div style={S.sumLabel}>CGST</div>
                      <div style={S.sumVal}>₹{summary.totalCGST.toFixed(2)}</div>
                    </div>
                    <div style={S.sumPill}>
                      <div style={S.sumLabel}>Total Tax</div>
                      <div style={S.sumVal}>₹{summary.totalTax.toFixed(2)}</div>
                    </div>
                    <div style={S.sumPill}>
                      <div style={S.sumGrandLabel}>Grand Total</div>
                      <div style={S.sumGrandVal}>₹{summary.grandTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons — always full text, never clipped */}
              <div style={S.btnRow}>
                <button
                  type="button"
                  onClick={() => setActiveTab(1)}
                  style={S.btnGhost}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={shareLoading || !header.party_phone}
                  style={{ ...S.btnSuccess, opacity: (shareLoading || !header.party_phone) ? 0.5 : 1, cursor: (shareLoading || !header.party_phone) ? 'not-allowed' : 'pointer' }}
                >
                  {shareLoading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Share2 size={16} />}
                  {shareLoading ? 'Sharing...' : 'Share on WhatsApp'}
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  style={{ ...S.btnPrimary, opacity: formLoading ? 0.6 : 1, cursor: formLoading ? 'not-allowed' : 'pointer' }}
                >
                  {formLoading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                  {formLoading ? 'Saving...' : isEditMode ? 'Update Invoice' : 'Save Invoice'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
      {/* ── Barcode Scanner Modal Overlay ─────────────────────────── */}
      {activeScanner && (
        <div style={S.scannerOverlay}>
          <style>{`
            @keyframes scanLaser {
              0% { transform: translateY(-70px); }
              50% { transform: translateY(70px); }
              100% { transform: translateY(-70px); }
            }
          `}</style>
          <div style={S.scannerModal}>
            <div style={S.scannerHeader}>
              <h3 style={S.scannerTitle}>
                Scanning {activeScanner.field === 'model_no' ? 'Model No' : 'Serial No'}
              </h3>
              <button type="button" onClick={stopScanner} style={S.scannerCloseBtn}>
                <X size={20} />
              </button>
            </div>
            
            {scannerError ? (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <AlertCircle size={36} style={{ color: '#dc2626', marginBottom: 10, display: 'inline-block' }} />
                <p style={{ color: '#ef4444', fontSize: 14, margin: 0, whiteSpace: 'pre-line' }}>{scannerError}</p>
                <button type="button" onClick={() => startScanner(activeScanner.index, activeScanner.field, selectedCameraId)} style={{ ...S.btnPrimary, marginTop: 14 }}>
                  Try Again
                </button>
              </div>
            ) : (
              <div style={S.scannerBody}>
                {cameras.length > 1 && (
                  <div style={{ width: '100%', marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#4b5563', fontWeight: 600, display: 'block', marginBottom: 4 }}>Select Camera:</label>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => switchCamera(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 14,
                        background: '#fff',
                        outline: 'none',
                        color: '#374151'
                      }}
                    >
                      <option value="environment">Default Back Camera</option>
                      {cameras.map((camera, idx) => (
                        <option key={camera.id} value={camera.id}>
                          {camera.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={S.scannerBox}>
                  <div id="barcode-reader" style={S.scannerReader}></div>
                  <div style={S.scannerTargetFrame}>
                    <div style={S.scannerLaserLine}></div>
                  </div>
                </div>
                <p style={S.scannerTip}>Position the barcode/QR code inside the window to scan</p>
              </div>
            )}
            
            <div style={S.scannerFooter}>
              <button type="button" onClick={stopScanner} style={S.btnGhost}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Saleamc;
