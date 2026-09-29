import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Edit2, Trash2, Eye, Search, Calendar,
  RefreshCw, AlertCircle, CheckCircle, X,
  Plus, Package, User, FileText, Printer, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LeftLogo from "../../assets/ogo-left.jpeg";
import RightLogo from "../../assets/ogo-right.png";
import QrImage from "../../assets/qrCode.jpeg";
import { emitUserAction } from '../../services/activityLogger';
import { getUserRole } from '../../utils/auth.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const getToken = () => localStorage.getItem('token');

const SaleList = () => {
  const userRole = getUserRole()?.toLowerCase();
  // State
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookCode, setBookCode] = useState('SA'); // Default to Sales
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

      setSuccess('Sales transaction deleted successfully');
      fetchSales();
      setShowDeleteConfirm(null);
      
      // Industrial Logging
      emitUserAction('delete', `sale_vouch:${bookCode}-${vouchNo}`, `Deleted Sales Transaction: ${bookCode}-${vouchNo}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete sales transaction');
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

  // Function to handle printing a single sale
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

      // Industrial Logging
      emitUserAction('export_report', `sale_print:${sale.book_code}-${sale.vouch_no}`, `Printed POS Invoice for Voucher No: ${sale.book_code}-${sale.vouch_no}`);
    } catch (err) {
      console.error('❌ Print API error', err);
      alert('Failed to generate invoice');
    }
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
      // Use header.party_phone or sale.party_phone. Fallback to empty string safely.
      const rawPhone = header.party_phone || '';
      let cleanPhone = rawPhone.replace(/\D/g, '');

      // Auto-append 91 if it's a 10-digit number (common in India)
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }

      // 4. Create Message
      const message = `Dear ${header.party_name},\n\nPlease find attached the invoice (${header.book_code}-${header.vouch_no}) for your recent purchase. You can download or view it here: ${pdfUrl}\n\nThank you for your business!`;

      // 5. Open WhatsApp
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

    } catch (err) {
      console.error('WhatsApp Share Error', err);
      alert('Failed to share on WhatsApp');
    }
  };

  // Function to print the entire sale list
  const handlePrintSaleList = () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    let y = 15;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Sales Transaction List', 105, y, { align: 'center' });

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

  const getCompanyHeaderLines = (company) => {
    const lines = [];
    if (company.company_name) lines.push(company.company_name);
    if (company.address) lines.push(company.address);

    const panGst = [];
    if (company.pan_number) panGst.push(`PAN No.: ${company.pan_number}`);
    if (company.gst_number) panGst.push(`GST No.: ${company.gst_number}`);
    if (panGst.length) lines.push(panGst.join(" | "));

    const contact = [];
    if (company.phone_number) contact.push(`Mobile: ${company.phone_number} / ${company.phone_number2}`);
    if (company.email_address) contact.push(`Email: ${company.email_address}`);
    if (contact.length) lines.push(contact.join(" | "));

    return lines;
  };

  const getTermsAndConditions = (company) => {
    return Object.keys(company)
      .filter(k => k.startsWith("footer") && company[k])
      .map((k, i) => `${i + 1}. ${company[k]}`);
  };


  // Function to generate invoice PDF
  // const generateInvoicePDF = async (header, items, company) => {
  //   const doc = new jsPDF("p", "mm", "a4");
  //   let y = 10;

  //   /* ================= LOGOS ================= */
  //   doc.addImage(LeftLogo, "PNG", 10, 8, 25, 25);
  //   doc.addImage(RightLogo, "PNG", 170, 8, 25, 25);
  //   doc.addImage(QrImage, "PNG", 160, 245, 30, 30);


  //   /* ================= COMPANY HEADER ================= */
  //   const headerLines = getCompanyHeaderLines(company);

  //   doc.setFontSize(14);
  //   doc.setFont(undefined, "bold");
  //   doc.text("GST INVOICE", 105, y, { align: "center" });

  //   y += 6;

  //   headerLines.forEach((line, index) => {
  //     doc.setFont(index === 0 ? undefined : "normal");
  //     doc.setFontSize(index === 0 ? 16 : 10);
  //     doc.text(line, 105, y, { align: "center" });
  //     y += 7;
  //   });
  //   doc.text(`Authorized Service Center`, 10, y);

  //   y += 3;
  //   doc.line(10, y, 200, y);

  //   /* ================= PARTY & INVOICE DETAILS ================= */
  //   y += 6;
  //   doc.setFontSize(10);
  //   doc.setFont(undefined, "normal");

  //   doc.text(`M/s: ${header.party_name}`, 10, y);
  //   doc.text(`Invoice No: ${header.book_code}${header.vouch_no}`, 140, y);

  //   y += 6;
  //   doc.text(`GST No: ${header.party_gst || "-"}`, 10, y);
  //   doc.text(`Invoice Date: ${format(new Date(header.vouch_date), "dd/MM/yyyy")}`, 140, y);

  //   y += 6;
  //   doc.text(`Phone: ${header.party_phone || "-"}`, 10, y);
  //   //doc.text(`Customer Name:${header.party_name}`, 140, y);
  //     //y += 6;
  //   doc.text(`Technician Name:${header.technician_name}`, 140, y);


  //   if (header.party_email) {
  //       y += 6;
  //     doc.text(`Created Date: ${format(new Date(header.vouch_date), "dd/MM/yyyy")}`, 140, y);
  //   }
  //   y += 6;
  //   doc.text(`Email: ${header.party_email || "-"}`, 10, y);


  //   /* ================= ITEM TABLE ================= */
  //   y += 8;
  //   autoTable(doc, {
  //     startY: y,
  //     theme: "grid",
  //     styles: { fontSize: 8, cellPadding: 2 },
  //     head: [[
  //       "Sr",
  //       "Item Name",
  //       "MRP",
  //       "Unit Price ",
  //       "Item Price",
  //       "SGST",
  //       "CGST",
  //       "Net Amount"
  //     ]],
  //     body: items.map((item, i) => [
  //       i + 1,
  //       item.item_name + `(${item.hsn_code})`,
  //       item.rate,
  //       item.rate + `*` + `(${item.qty})`,
  //       item.basic_amt,
  //       (item.tax_amt / 2).toFixed(2),
  //       (item.tax_amt / 2).toFixed(2),
  //       item.net_amt
  //     ])
  //   });

  //   y = doc.lastAutoTable.finalY + 5;

  //   /* ================= TOTAL SUMMARY ================= */
  //   doc.text(`Sub Total : ${header.total_basic}`, 140, y); y += 5;
  //   doc.text(`SGST : ${(header.total_tax / 2).toFixed(2)}`, 140, y); y += 5;
  //   doc.text(`CGST : ${(header.total_tax / 2).toFixed(2)}`, 140, y); y += 5;

  //   doc.setFont(undefined, "bold");
  //   doc.text(`G. Total : ${header.net_amount}`, 140, y);
  //   doc.setFont(undefined, "normal");

  //   /* ================= BANK DETAILS ================= */
  //   y += 10;
  //   doc.text("Bank Details:", 10, y); y += 5;
  //   doc.text(`Bank Name : ${company.bank_name}`, 10, y); y += 5;
  //   doc.text(`A/C No : ${company.account_number}`, 10, y); y += 5;
  //   doc.text(`IFSC Code : ${company.ifsc_code}`, 10, y);

  //   /* ================= TERMS & CONDITIONS ================= */
  //   y += 8;
  //   doc.setFont('Arial', "bold");
  //   doc.text("Terms & Conditions:", 10, y);
  //   doc.setFont('Arial', "normal");

  //   y += 5;
  //   getTermsAndConditions(company).forEach(line => {
  //     if (y < 260) {
  //       doc.text(line, 10, y);
  //       y += 4;
  //     }
  //   });

  //   /* ================= QR CODE ================= */
  //   doc.addImage(QrImage, "PNG", 160, 245, 30, 30);

  //   /* ================= OPEN PDF ================= */
  //   /* ================= OPEN PDF ================= */
  //   // window.open(doc.output("bloburl"));
  //   return doc;
  // };
  // ============================================================
//  Professional GST E-Invoice Generator  •  jsPDF + autoTable
// ============================================================

// const generateInvoicePDF = async (header, items, company) => {
//   const doc = new jsPDF("p", "mm", "a4");
//   const PW = 210; // page width
//   const ML = 12;  // margin left
//   const MR = 198; // margin right (210 - 12)

//   // ── BRAND PALETTE ──────────────────────────────────────────
//   const C = {
//     navy:      [13,  42,  84],   // deep navy — primary brand
//     teal:      [0,  128, 128],   // teal accent
//     tealLight: [0,  160, 160],
//     white:     [255, 255, 255],
//     offWhite:  [248, 249, 252],
//     slate:     [71,  85, 105],
//     steel:     [148, 163, 184],
//     ink:       [15,  23,  42],
//     amber:     [217, 119,   6],  // highlight accent
//     green:     [22, 163,  74],
//     borderGray:[220, 225, 235],
//   };

//   // ── HELPERS ────────────────────────────────────────────────
//   const rgb   = (arr) => arr;
//   const setFg = (arr) => doc.setTextColor(...arr);
//   const setBg = (arr) => doc.setFillColor(...arr);
//   const setLn = (arr) => doc.setDrawColor(...arr);

//   const rect = (x, y, w, h, color, style = "F") => {
//     setBg(color);
//     doc.rect(x, y, w, h, style);
//   };

//   const hLine = (y, color = C.borderGray) => {
//     setLn(color);
//     doc.setLineWidth(0.3);
//     doc.line(ML, y, MR, y);
//   };

//   const label = (txt, x, y, size = 7.5, color = C.steel, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(txt, x, y);
//   };

//   const value = (txt, x, y, size = 9, color = C.ink, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(String(txt ?? "-"), x, y);
//   };

//   // ── BACKGROUND ─────────────────────────────────────────────
//   rect(0, 0, PW, 297, C.white);

//   // ── HEADER BAND ────────────────────────────────────────────
//   rect(0, 0, PW, 38, C.navy);
//   // Accent strip bottom of header
//   rect(0, 36, PW, 2.5, C.teal);

//   // Logos
//   try { doc.addImage(LeftLogo,  "PNG", ML,        5, 22, 22); } catch(_) {}
//   try { doc.addImage(RightLogo, "PNG", MR - 22,   5, 22, 22); } catch(_) {}

//   // Company name + title centred in header
//   const headerLines = getCompanyHeaderLines(company);
//   let hy = 11;
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(15);
//   setFg(C.white);
//   doc.text(headerLines[0] ?? "Company Name", PW / 2, hy, { align: "center" });

//   hy += 5.5;
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(8);
//   setFg(C.tealLight);
//   if (headerLines[1]) doc.text(headerLines[1], PW / 2, hy, { align: "center" }), (hy += 4.5);
//   if (headerLines[2]) doc.text(headerLines[2], PW / 2, hy, { align: "center" }), (hy += 4.5);

//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8.5);
//   setFg([255, 200, 60]);
//   doc.text("AUTHORIZED SERVICE CENTER", PW / 2, hy, { align: "center" });

//   // ── INVOICE BADGE (top-right pill) ─────────────────────────
//   rect(MR - 50, 1.5, 52, 8, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8);
//   setFg(C.white);
//   doc.text("GST E-INVOICE", MR - 10, 6.8, { align: "center" });

//   // ── INVOICE META BAR ───────────────────────────────────────
//   let y = 42;
//   rect(ML, y, (MR - ML), 14, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.setLineWidth(0.3);
//   doc.rect(ML, y, (MR - ML), 14, "S");

//   // Invoice No
//   const invoiceNo = `${header.book_code}${header.vouch_no}`;
//   const invoiceDate = format(new Date(header.vouch_date), "dd/MM/yyyy");

//   label("INVOICE NO",          ML + 3, y + 4.5, 7, C.steel, true);
//   value(invoiceNo,             ML + 3, y + 9.5, 9.5, C.navy, true);

//   label("INVOICE DATE",        75, y + 4.5, 7, C.steel, true);
//   value(invoiceDate,           75, y + 9.5, 9.5, C.ink, true);

//   label("TECHNICIAN",          120, y + 4.5, 7, C.steel, true);
//   value(header.technician_name ?? "-", 120, y + 9.5, 9, C.ink);

//   label("STATUS",              170, y + 4.5, 7, C.steel, true);
//   // status badge
//   rect(170, y + 5.5, 24, 5.5, C.green, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7);
//   setFg(C.white);
//   doc.text("PAID", 182, y + 9.5, { align: "center" });

//   // ── PARTY / BILL TO ────────────────────────────────────────
//   y += 18;

//   // Left card — Bill To
//   rect(ML, y, 90, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, y, 90, 28, "S");
//   // Left accent stripe
//   rect(ML, y, 2, 28, C.teal, "F");

//   label("BILL TO",          ML + 5, y + 5.5, 7,  C.teal,  true);
//   value(header.party_name,  ML + 5, y + 11,  9.5, C.navy,  true);

//   label("GST NO",           ML + 5, y + 16,  7, C.steel, true);
//   value(header.party_gst,   ML + 5, y + 20.5, 8, C.ink);

//   label("PHONE",            ML + 5, y + 24.5, 7, C.steel, true);
//   // phone placed right of label
//   value(header.party_phone, ML + 18, y + 24.5, 8, C.ink);

//   // Right card — Contact Details
//   const RX = ML + 95;
//   rect(RX, y, 91, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(RX, y, 91, 28, "S");
//   rect(RX, y, 2, 28, C.amber, "F");

//   label("EMAIL",             RX + 5, y + 5.5,  7, C.amber,  true);
//   value(header.party_email,  RX + 5, y + 11,   8, C.ink);

//   label("CREATED DATE",      RX + 5, y + 16,   7, C.steel, true);
//   value(format(new Date(header.vouch_date), "dd/MM/yyyy"), RX + 5, y + 20.5, 8, C.ink);

//   label("DOCUMENT TYPE",     RX + 5, y + 24.5, 7, C.steel, true);
//   value("Tax Invoice",       RX + 32, y + 24.5, 8, C.ink);

//   // ── ITEM TABLE ─────────────────────────────────────────────
//   y += 33;

//   autoTable(doc, {
//     startY: y,
//     margin: { left: ML, right: 12 },
//     theme: "plain",
//     styles: {
//       fontSize: 8,
//       cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
//       textColor: C.ink,
//       lineColor: C.borderGray,
//       lineWidth: 0.25,
//     },
//     headStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//       fontSize: 7.5,
//       cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
//     },
//     alternateRowStyles: {
//       fillColor: C.offWhite,
//     },
//     columnStyles: {
//       0: { halign: "center", cellWidth: 9  },
//       1: { cellWidth: 55 },
//       2: { halign: "right",  cellWidth: 18 },
//       3: { halign: "right",  cellWidth: 22 },
//       4: { halign: "right",  cellWidth: 20 },
//       5: { halign: "right",  cellWidth: 18 },
//       6: { halign: "right",  cellWidth: 18 },
//       7: { halign: "right",  cellWidth: 22, fontStyle: "bold" },
//     },
//     head: [[
//       "#",
//       "Item Description (HSN)",
//       "MRP (₹)",
//       "Unit Price × Qty",
//       "Basic Amt (₹)",
//       "SGST (₹)",
//       "CGST (₹)",
//       "Net Amt (₹)",
//     ]],
//     body: items.map((item, i) => [
//       i + 1,
//       `${item.item_name}\n(HSN: ${item.hsn_code})`,
//       Number(item.rate).toFixed(2),
//       `${Number(item.rate).toFixed(2)} × ${item.qty}`,
//       Number(item.basic_amt).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       Number(item.net_amt).toFixed(2),
//     ]),
//     // Zebra footer row
//     foot: [[
//       "",
//       { content: "TOTAL", styles: { fontStyle: "bold", textColor: C.white, fillColor: C.navy } },
//       "",
//       "",
//       { content: Number(header.total_basic).toFixed(2), styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: Number(header.net_amount).toFixed(2),  styles: { fontStyle: "bold", halign: "right", fillColor: C.teal,  textColor: C.white } },
//     ]],
//     footStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//     },
//   });

//   y = doc.lastAutoTable.finalY + 6;

//   // ── AMOUNT SUMMARY CARD ────────────────────────────────────
//   const SX = MR - 72;
//   const SH = 36;
//   rect(SX, y, 74, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(SX, y, 74, SH, "S");
//   // teal top bar
//   rect(SX, y, 74, 5, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("AMOUNT SUMMARY", SX + 37, y + 3.5, { align: "center" });

//   let sy = y + 10;
//   const amtRow = (lbl, val, bold = false, accent = false) => {
//     label(lbl, SX + 4, sy, 8, C.slate, bold);
//     value(
//       `₹ ${val}`,
//       MR - 3, sy, 8,
//       accent ? C.teal : C.ink,
//       bold
//     );
//     // right-align the value
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     doc.setFontSize(8);
//     setFg(accent ? C.teal : C.ink);
//     doc.text(`₹ ${val}`, MR - 3, sy, { align: "right" });
//     sy += 5.5;
//   };

//   amtRow("Sub Total",                    Number(header.total_basic).toFixed(2));
//   amtRow("SGST (Tax)",                   (header.total_tax / 2).toFixed(2));
//   amtRow("CGST (Tax)",                   (header.total_tax / 2).toFixed(2));
//   hLine(sy - 1, C.borderGray);
//   sy += 1.5;
//   // Grand Total highlight
//   rect(SX, sy - 4, 74, 8.5, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(9.5);
//   setFg(C.white);
//   doc.text("GRAND TOTAL", SX + 4, sy + 2);
//   doc.text(`₹ ${Number(header.net_amount).toFixed(2)}`, MR - 3, sy + 2, { align: "right" });

//   // ── BANK + QR SECTION ──────────────────────────────────────
//   const BY = y;
//   rect(ML, BY, 100, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, BY, 100, SH, "S");
//   rect(ML, BY, 100, 5, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("BANK DETAILS", ML + 50, BY + 3.5, { align: "center" });

//   let bly = BY + 10;
//   const bankRow = (lbl, val) => {
//     label(lbl + " :", ML + 4, bly, 8, C.slate, true);
//     value(val, ML + 30, bly, 8, C.ink);
//     bly += 5.5;
//   };
//   bankRow("Bank",  company.bank_name);
//   bankRow("A/C No", company.account_number);
//   bankRow("IFSC",  company.ifsc_code);
//   bankRow("Branch", company.branch_name ?? "");

//   // QR code — bottom right
//   const qrY = 255;
//   try {
//     doc.addImage(QrImage, "PNG", MR - 32, qrY, 32, 32);
//     label("Scan to Pay", MR - 32 + 16, qrY + 34, 7, C.slate, false);
//     // center label under QR
//     doc.setFontSize(7);
//     setFg(C.slate);
//     doc.text("Scan to Pay", MR - 32 + 16, qrY + 34, { align: "center" });
//   } catch(_) {}

//   // ── TERMS & CONDITIONS ─────────────────────────────────────
//   y += SH + 6;

//   hLine(y, C.teal);
//   y += 4;

//   rect(ML, y - 0.5, 40, 5.5, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("TERMS & CONDITIONS", ML + 20, y + 3.5, { align: "center" });
//   y += 7;

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(7.5);
//   setFg(C.slate);
//   getTermsAndConditions(company).forEach((line, idx) => {
//     if (y < 260) {
//       doc.text(`${idx + 1}.  ${line}`, ML + 2, y);
//       y += 4.5;
//     }
//   });

//   // ── FOOTER STRIP ───────────────────────────────────────────
//   const FY = 285;
//   rect(0, FY, PW, 12, C.navy, "F");
//   rect(0, FY, PW, 1.5, C.teal, "F");

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(7);
//   setFg([160, 180, 210]);
//   doc.text("This is a computer-generated invoice and does not require a physical signature.", PW / 2, FY + 6, { align: "center" });
//   doc.text(`${company.company_name ?? ""} • GST: ${company.gst_no ?? ""}`, PW / 2, FY + 10, { align: "center" });

//   return doc;
// };

// ============================================================
//  Professional GST E-Invoice Generator  •  jsPDF + autoTable
// ============================================================

// const generateInvoicePDF = async (header, items, company) => {
//   const doc = new jsPDF("p", "mm", "a4");
//   const PW = 210; // page width
//   const ML = 12;  // margin left
//   const MR = 198; // margin right (210 - 12)

//   // ── BRAND PALETTE ──────────────────────────────────────────
//   const C = {
//     navy:      [13,  42,  84],   // deep navy — primary brand
//     teal:      [0,  128, 128],   // teal accent
//     tealLight: [0,  160, 160],
//     white:     [255, 255, 255],
//     offWhite:  [248, 249, 252],
//     slate:     [71,  85, 105],
//     steel:     [148, 163, 184],
//     ink:       [15,  23,  42],
//     amber:     [217, 119,   6],  // highlight accent
//     green:     [22, 163,  74],
//     borderGray:[220, 225, 235],
//   };

//   // ── HELPERS ────────────────────────────────────────────────
//   const rgb   = (arr) => arr;
//   const setFg = (arr) => doc.setTextColor(...arr);
//   const setBg = (arr) => doc.setFillColor(...arr);
//   const setLn = (arr) => doc.setDrawColor(...arr);

//   const rect = (x, y, w, h, color, style = "F") => {
//     setBg(color);
//     doc.rect(x, y, w, h, style);
//   };

//   const hLine = (y, color = C.borderGray) => {
//     setLn(color);
//     doc.setLineWidth(0.3);
//     doc.line(ML, y, MR, y);
//   };

//   const label = (txt, x, y, size = 7.5, color = C.steel, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(txt, x, y);
//   };

//   const value = (txt, x, y, size = 9, color = C.ink, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(String(txt ?? "-"), x, y);
//   };

//   // ── BACKGROUND ─────────────────────────────────────────────
//   rect(0, 0, PW, 297, C.white);

//   // ── HEADER BAND ────────────────────────────────────────────
//   rect(0, 0, PW, 38, C.navy);
//   // Accent strip bottom of header
//   rect(0, 36, PW, 2.5, C.teal);

//   // Logos
//   try { doc.addImage(LeftLogo,  "PNG", ML,      7, 22, 22); } catch(_) {}
//   try { doc.addImage(RightLogo, "PNG", MR - 22, 7, 22, 22); } catch(_) {}

//   // ── GST E-INVOICE — centered at very top ───────────────────
//   let hy = 6;
//   // Pill background centered
//   const badgeW = 52;
//   const badgeX = (PW - badgeW) / 2;
//   rect(badgeX, hy - 3.5, badgeW, 7, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(9);
//   setFg(C.white);
//   doc.text("GST E-INVOICE", PW / 2, hy + 1, { align: "center" });

//   hy += 8;

//   // ── Company name + details below the badge ─────────────────
//   const headerLines = getCompanyHeaderLines(company);
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(15);
//   setFg(C.white);
//   doc.text(headerLines[0] ?? "Company Name", PW / 2, hy, { align: "center" });

//   hy += 5.5;
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(8);
//   setFg(C.tealLight);
//   if (headerLines[1]) doc.text(headerLines[1], PW / 2, hy, { align: "center" }), (hy += 4.5);
//   if (headerLines[2]) doc.text(headerLines[2], PW / 2, hy, { align: "center" }), (hy += 4.5);

//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8.5);
//   setFg([255, 200, 60]);
//   doc.text("AUTHORIZED SERVICE CENTER", PW / 2, hy, { align: "center" });

//   // ── INVOICE META BAR ───────────────────────────────────────
//   let y = 42;
//   rect(ML, y, (MR - ML), 14, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.setLineWidth(0.3);
//   doc.rect(ML, y, (MR - ML), 14, "S");

//   // Invoice No
//   const invoiceNo = `${header.book_code}${header.vouch_no}`;
//   const invoiceDate = format(new Date(header.vouch_date), "dd/MM/yyyy");

//   label("INVOICE NO",          ML + 3, y + 4.5, 7, C.steel, true);
//   value(invoiceNo,             ML + 3, y + 9.5, 9.5, C.navy, true);

//   label("INVOICE DATE",        75, y + 4.5, 7, C.steel, true);
//   value(invoiceDate,           75, y + 9.5, 9.5, C.ink, true);

//   label("TECHNICIAN",          120, y + 4.5, 7, C.steel, true);
//   value(header.technician_name ?? "-", 120, y + 9.5, 9, C.ink);

//   label("STATUS",              170, y + 4.5, 7, C.steel, true);
//   // status badge
//   rect(170, y + 5.5, 24, 5.5, C.green, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7);
//   setFg(C.white);
//   doc.text("PAID", 182, y + 9.5, { align: "center" });

//   // ── PARTY / BILL TO ────────────────────────────────────────
//   y += 18;

//   // Left card — Bill To
//   rect(ML, y, 90, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, y, 90, 28, "S");
//   // Left accent stripe
//   rect(ML, y, 2, 28, C.teal, "F");

//   label("BILL TO",          ML + 5, y + 5.5, 7,  C.teal,  true);
//   value(header.party_name,  ML + 5, y + 11,  9.5, C.navy,  true);

//   label("GST NO",           ML + 5, y + 16,  7, C.steel, true);
//   value(header.party_gst,   ML + 5, y + 20.5, 8, C.ink);

//   label("PHONE",            ML + 5, y + 24.5, 7, C.steel, true);
//   // phone placed right of label
//   value(header.party_phone, ML + 18, y + 24.5, 8, C.ink);

//   // Right card — Contact Details
//   const RX = ML + 95;
//   rect(RX, y, 91, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(RX, y, 91, 28, "S");
//   rect(RX, y, 2, 28, C.amber, "F");

//   label("EMAIL",             RX + 5, y + 5.5,  7, C.amber,  true);
//   value(header.party_email,  RX + 5, y + 11,   8, C.ink);

//   label("CREATED DATE",      RX + 5, y + 16,   7, C.steel, true);
//   value(format(new Date(header.vouch_date), "dd/MM/yyyy"), RX + 5, y + 20.5, 8, C.ink);

//   label("DOCUMENT TYPE",     RX + 5, y + 24.5, 7, C.steel, true);
//   value("Tax Invoice",       RX + 32, y + 24.5, 8, C.ink);

//   // ── ITEM TABLE ─────────────────────────────────────────────
//   y += 33;

//   autoTable(doc, {
//     startY: y,
//     margin: { left: ML, right: 12 },
//     theme: "plain",
//     styles: {
//       fontSize: 8,
//       cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
//       textColor: C.ink,
//       lineColor: C.borderGray,
//       lineWidth: 0.25,
//     },
//     headStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//       fontSize: 7.5,
//       cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
//     },
//     alternateRowStyles: {
//       fillColor: C.offWhite,
//     },
//     columnStyles: {
//       0: { halign: "center", cellWidth: 9  },
//       1: { cellWidth: 55 },
//       2: { halign: "right",  cellWidth: 18 },
//       3: { halign: "right",  cellWidth: 22 },
//       4: { halign: "right",  cellWidth: 20 },
//       5: { halign: "right",  cellWidth: 18 },
//       6: { halign: "right",  cellWidth: 18 },
//       7: { halign: "right",  cellWidth: 22, fontStyle: "bold" },
//     },
//     head: [[
//       "#",
//       "Item Description (HSN)",
//       "MRP (₹)",
//       "Unit Price × Qty",
//       "Basic Amt (₹)",
//       "SGST (₹)",
//       "CGST (₹)",
//       "Net Amt (₹)",
//     ]],
//     body: items.map((item, i) => [
//       i + 1,
//       `${item.item_name}\n(HSN: ${item.hsn_code})`,
//       Number(item.rate).toFixed(2),
//       `${Number(item.rate).toFixed(2)} × ${item.qty}`,
//       Number(item.basic_amt).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       Number(item.net_amt).toFixed(2),
//     ]),
//     // Zebra footer row
//     foot: [[
//       "",
//       { content: "TOTAL", styles: { fontStyle: "bold", textColor: C.white, fillColor: C.navy } },
//       "",
//       "",
//       { content: Number(header.total_basic).toFixed(2), styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: Number(header.net_amount).toFixed(2),  styles: { fontStyle: "bold", halign: "right", fillColor: C.teal,  textColor: C.white } },
//     ]],
//     footStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//     },
//   });

//   y = doc.lastAutoTable.finalY + 6;

//   // ── AMOUNT SUMMARY CARD ────────────────────────────────────
//   const SX = MR - 72;
//   const SH = 36;
//   rect(SX, y, 74, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(SX, y, 74, SH, "S");
//   // teal top bar
//   rect(SX, y, 74, 5, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("AMOUNT SUMMARY", SX + 37, y + 3.5, { align: "center" });

//   let sy = y + 10;
//   const amtRow = (lbl, val, bold = false, accent = false) => {
//     label(lbl, SX + 4, sy, 8, C.slate, bold);
//     value(
//       `₹ ${val}`,
//       MR - 3, sy, 8,
//       accent ? C.teal : C.ink,
//       bold
//     );
//     // right-align the value
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     doc.setFontSize(8);
//     setFg(accent ? C.teal : C.ink);
//     doc.text(`₹ ${val}`, MR - 3, sy, { align: "right" });
//     sy += 5.5;
//   };

//   amtRow("Sub Total", Number(header.total_basic).toFixed(2));
//   amtRow("SGST (Tax)", (header.total_tax / 2).toFixed(2));
//   amtRow("CGST (Tax)", (header.total_tax / 2).toFixed(2));
//   hLine(sy - 1, C.borderGray);
//   sy += 1.5;
//   // Grand Total highlight
//   rect(SX, sy - 4, 74, 8.5, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(9.5);
//   setFg(C.white);
//   doc.text("GRAND TOTAL", SX + 4, sy + 2);
//   doc.text(`₹ ${Number(header.net_amount).toFixed(2)}`, MR - 3, sy + 2, { align: "right" });

//   // ── BANK + QR SECTION ──────────────────────────────────────
//   const BY = y;
//   rect(ML, BY, 100, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, BY, 100, SH, "S");
//   rect(ML, BY, 100, 5, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("BANK DETAILS", ML + 50, BY + 3.5, { align: "center" });

//   let bly = BY + 10;
//   const bankRow = (lbl, val) => {
//     label(lbl + " :", ML + 4, bly, 8, C.slate, true);
//     value(val, ML + 30, bly, 8, C.ink);
//     bly += 5.5;
//   };
//   bankRow("Bank",  company.bank_name);
//   bankRow("A/C No", company.account_number);
//   bankRow("IFSC",  company.ifsc_code);
//   bankRow("Branch", company.branch_name ?? "");

//   // QR code — bottom right
//   const qrY = 255;
//   try {
//     doc.addImage(QrImage, "PNG", MR - 32, qrY, 32, 32);
//     label("Scan to Pay", MR - 32 + 16, qrY + 34, 7, C.slate, false);
//     // center label under QR
//     doc.setFontSize(7);
//     setFg(C.slate);
//     doc.text("Scan to Pay", MR - 32 + 16, qrY + 34, { align: "center" });
//   } catch(_) {}

//   // ── TERMS & CONDITIONS ─────────────────────────────────────
//   y += SH + 6;

//   hLine(y, C.teal);
//   y += 4;

//   rect(ML, y - 0.5, 40, 5.5, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("TERMS & CONDITIONS", ML + 20, y + 3.5, { align: "center" });
//   y += 7;

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(7.5);
//   setFg(C.slate);
//   getTermsAndConditions(company).forEach((line, idx) => {
//     if (y < 260) {
//       doc.text(`${idx + 1}.  ${line}`, ML + 2, y);
//       y += 4.5;
//     }
//   });

//   // ── FOOTER STRIP ───────────────────────────────────────────
//   const FY = 285;
//   rect(0, FY, PW, 12, C.navy, "F");
//   rect(0, FY, PW, 1.5, C.teal, "F");

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(7);
//   setFg([160, 180, 210]);
//   doc.text("This is a computer-generated invoice and does not require a physical signature.", PW / 2, FY + 6, { align: "center" });
//   doc.text(`${company.company_name ?? ""} • GST: ${company.gst_no ?? ""}`, PW / 2, FY + 10, { align: "center" });

//   return doc;
// };

// ============================================================
//  Professional GST E-Invoice Generator  •  jsPDF + autoTable
// ============================================================

// const generateInvoicePDF = async (header, items, company) => {
//   const doc = new jsPDF("p", "mm", "a4");
//   const PW = 210; // page width
//   const ML = 12;  // margin left
//   const MR = 198; // margin right (210 - 12)

//   // ── BRAND PALETTE ──────────────────────────────────────────
//   const C = {
//     navy:      [13,  42,  84],   // deep navy — primary brand
//     teal:      [0,  128, 128],   // teal accent
//     tealLight: [0,  160, 160],
//     white:     [255, 255, 255],
//     offWhite:  [248, 249, 252],
//     slate:     [71,  85, 105],
//     steel:     [148, 163, 184],
//     ink:       [15,  23,  42],
//     amber:     [217, 119,   6],  // highlight accent
//     green:     [22, 163,  74],
//     borderGray:[220, 225, 235],
//   };

//   // ── HELPERS ────────────────────────────────────────────────
//   const rgb   = (arr) => arr;
//   const setFg = (arr) => doc.setTextColor(...arr);
//   const setBg = (arr) => doc.setFillColor(...arr);
//   const setLn = (arr) => doc.setDrawColor(...arr);

//   const rect = (x, y, w, h, color, style = "F") => {
//     setBg(color);
//     doc.rect(x, y, w, h, style);
//   };

//   const hLine = (y, color = C.borderGray) => {
//     setLn(color);
//     doc.setLineWidth(0.3);
//     doc.line(ML, y, MR, y);
//   };

//   const label = (txt, x, y, size = 7.5, color = C.steel, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(txt, x, y);
//   };

//   const value = (txt, x, y, size = 9, color = C.ink, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(String(txt ?? "-"), x, y);
//   };

//   // ── BACKGROUND ─────────────────────────────────────────────
//   rect(0, 0, PW, 297, C.white);

//   // ── HEADER BAND ────────────────────────────────────────────
//   rect(0, 0, PW, 38, C.navy);
//   // Accent strip bottom of header
//   rect(0, 36, PW, 2.5, C.teal);

//   // Logos
//   try { doc.addImage(LeftLogo,  "PNG", ML,      7, 22, 22); } catch(_) {}
//   try { doc.addImage(RightLogo, "PNG", MR - 22, 7, 22, 22); } catch(_) {}

//   // ── GST E-INVOICE — centered at very top ───────────────────
//   let hy = 6;
//   // Pill background centered
//   const badgeW = 52;
//   const badgeX = (PW - badgeW) / 2;
//   rect(badgeX, hy - 3.5, badgeW, 7, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(9);
//   setFg(C.white);
//   doc.text("GST E-INVOICE", PW / 2, hy + 1, { align: "center" });

//   hy += 8;

//   // ── Company name + details below the badge ─────────────────
//   const headerLines = getCompanyHeaderLines(company);
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(15);
//   setFg(C.white);
//   doc.text(headerLines[0] ?? "Company Name", PW / 2, hy, { align: "center" });

//   hy += 5.5;
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(8);
//   setFg(C.tealLight);
//   if (headerLines[1]) doc.text(headerLines[1], PW / 2, hy, { align: "center" }), (hy += 4.5);
//   if (headerLines[2]) doc.text(headerLines[2], PW / 2, hy, { align: "center" }), (hy += 4.5);

//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8.5);
//   setFg([255, 200, 60]);
//   doc.text("AUTHORIZED SERVICE CENTER", PW / 2, hy, { align: "center" });

//   // ── INVOICE META BAR ───────────────────────────────────────
//   let y = 42;
//   rect(ML, y, (MR - ML), 14, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.setLineWidth(0.3);
//   doc.rect(ML, y, (MR - ML), 14, "S");

//   // Invoice No
//   const invoiceNo = `${header.book_code}${header.vouch_no}`;
//   const invoiceDate = format(new Date(header.vouch_date), "dd/MM/yyyy");

//   label("INVOICE NO",          ML + 3, y + 4.5, 7, C.steel, true);
//   value(invoiceNo,             ML + 3, y + 9.5, 9.5, C.navy, true);

//   label("INVOICE DATE",        75, y + 4.5, 7, C.steel, true);
//   value(invoiceDate,           75, y + 9.5, 9.5, C.ink, true);

//   label("TECHNICIAN",          120, y + 4.5, 7, C.steel, true);
//   value(header.technician_name ?? "-", 120, y + 9.5, 9, C.ink);

//   label("STATUS",              170, y + 4.5, 7, C.steel, true);
//   // status badge
//   rect(170, y + 5.5, 24, 5.5, C.green, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7);
//   setFg(C.white);
//   doc.text("PAID", 182, y + 9.5, { align: "center" });

//   // ── PARTY / BILL TO ────────────────────────────────────────
//   y += 18;

//   // Left card — Bill To
//   rect(ML, y, 90, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, y, 90, 28, "S");
//   // Left accent stripe
//   rect(ML, y, 2, 28, C.teal, "F");

//   label("BILL TO",          ML + 5, y + 5.5, 7,  C.teal,  true);
//   value(header.party_name,  ML + 5, y + 11,  9.5, C.navy,  true);

//   label("GST NO",           ML + 5, y + 16,  7, C.steel, true);
//   value(header.party_gst,   ML + 5, y + 20.5, 8, C.ink);

//   label("PHONE",            ML + 5, y + 24.5, 7, C.steel, true);
//   // phone placed right of label
//   value(header.party_phone, ML + 18, y + 24.5, 8, C.ink);

//   // Right card — Contact Details
//   const RX = ML + 95;
//   rect(RX, y, 91, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(RX, y, 91, 28, "S");
//   rect(RX, y, 2, 28, C.amber, "F");

//   label("EMAIL",             RX + 5, y + 5.5,  7, C.amber,  true);
//   value(header.party_email,  RX + 5, y + 11,   8, C.ink);

//   label("CREATED DATE",      RX + 5, y + 16,   7, C.steel, true);
//   value(format(new Date(header.vouch_date), "dd/MM/yyyy"), RX + 5, y + 20.5, 8, C.ink);

//   label("DOCUMENT TYPE",     RX + 5, y + 24.5, 7, C.steel, true);
//   value("Tax Invoice",       RX + 32, y + 24.5, 8, C.ink);

//   // ── ITEM TABLE ─────────────────────────────────────────────
//   y += 33;

//   autoTable(doc, {
//     startY: y,
//     margin: { left: ML, right: 12 },
//     theme: "plain",
//     styles: {
//       fontSize: 8,
//       cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
//       textColor: C.ink,
//       lineColor: C.borderGray,
//       lineWidth: 0.25,
//     },
//     headStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//       fontSize: 7.5,
//       cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
//     },
//     alternateRowStyles: {
//       fillColor: C.offWhite,
//     },
//     columnStyles: {
//       0: { halign: "center", cellWidth: 9  },
//       1: { cellWidth: 55 },
//       2: { halign: "right",  cellWidth: 18 },
//       3: { halign: "right",  cellWidth: 22 },
//       4: { halign: "right",  cellWidth: 20 },
//       5: { halign: "right",  cellWidth: 18 },
//       6: { halign: "right",  cellWidth: 18 },
//       7: { halign: "right",  cellWidth: 22, fontStyle: "bold" },
//     },
//     head: [[
//       "#",
//       "Item Description (HSN)",
//       "MRP (₹)",
//       "Unit Price × Qty",
//       "Basic Amt (₹)",
//       "SGST (₹)",
//       "CGST (₹)",
//       "Net Amt (₹)",
//     ]],
//     body: items.map((item, i) => [
//       i + 1,
//       `${item.item_name}\n(HSN: ${item.hsn_code})`,
//       Number(item.rate).toFixed(2),
//       `${Number(item.rate).toFixed(2)} × ${item.qty}`,
//       Number(item.basic_amt).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       Number(item.net_amt).toFixed(2),
//     ]),
//     // Zebra footer row
//     foot: [[
//       "",
//       { content: "TOTAL", styles: { fontStyle: "bold", textColor: C.white, fillColor: C.navy } },
//       "",
//       "",
//       { content: Number(header.total_basic).toFixed(2), styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: Number(header.net_amount).toFixed(2),  styles: { fontStyle: "bold", halign: "right", fillColor: C.teal,  textColor: C.white } },
//     ]],
//     footStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//     },
//   });

//   y = doc.lastAutoTable.finalY + 6;

//   // ── AMOUNT SUMMARY CARD ────────────────────────────────────
//   const CARD_W = 80;                      // card width
//   const SX     = MR - CARD_W;            // card left edge (inside page)
//   const CARD_R = SX + CARD_W - 4;        // right text boundary (4 mm padding)
//   const SH     = 38;
//   rect(SX, y, CARD_W, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.setLineWidth(0.3);
//   doc.rect(SX, y, CARD_W, SH, "S");
//   // navy title bar
//   rect(SX, y, CARD_W, 6, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8);
//   setFg(C.white);
//   doc.text("AMOUNT SUMMARY", SX + CARD_W / 2, y + 4.2, { align: "center" });

//   let sy = y + 12;

//   // amtRow: label on left, value right-aligned inside card
//   const amtRow = (lbl, val) => {
//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(8.5);
//     setFg(C.slate);
//     doc.text(lbl, SX + 4, sy);

//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(8.5);
//     setFg(C.ink);
//     doc.text(`Rs. ${val}`, CARD_R, sy, { align: "right" });

//     sy += 6;
//   };

//   amtRow("Sub Total",  Number(header.total_basic).toFixed(2));
//   amtRow("SGST (Tax)", (header.total_tax / 2).toFixed(2));
//   amtRow("CGST (Tax)", (header.total_tax / 2).toFixed(2));

//   // divider line
//   setLn(C.borderGray);
//   doc.setLineWidth(0.25);
//   doc.line(SX + 2, sy - 2, SX + CARD_W - 2, sy - 2);
//   sy += 1;

//   // Grand Total row — full-width teal band
//   rect(SX, sy - 4, CARD_W, 9, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(9);
//   setFg(C.white);
//   doc.text("GRAND TOTAL", SX + 4, sy + 2.5);
//   doc.text(`Rs. ${Number(header.net_amount).toFixed(2)}`, CARD_R, sy + 2.5, { align: "right" });

//   // ── BANK + QR SECTION ──────────────────────────────────────
//   const BY = y;
//   rect(ML, BY, 100, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, BY, 100, SH, "S");
//   rect(ML, BY, 100, 5, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("BANK DETAILS", ML + 50, BY + 3.5, { align: "center" });

//   let bly = BY + 10;
//   const bankRow = (lbl, val) => {
//     label(lbl + " :", ML + 4, bly, 8, C.slate, true);
//     value(val, ML + 30, bly, 8, C.ink);
//     bly += 5.5;
//   };
//   bankRow("Bank",  company.bank_name);
//   bankRow("A/C No", company.account_number);
//   bankRow("IFSC",  company.ifsc_code);
//   bankRow("Branch", company.branch_name ?? "");

//   // QR code — bottom right
//   const qrY = 255;
//   try {
//     doc.addImage(QrImage, "PNG", MR - 32, qrY, 32, 32);
//     label("Scan to Pay", MR - 32 + 16, qrY + 34, 7, C.slate, false);
//     // center label under QR
//     doc.setFontSize(7);
//     setFg(C.slate);
//     doc.text("Scan to Pay", MR - 32 + 16, qrY + 34, { align: "center" });
//   } catch(_) {}

//   // ── TERMS & CONDITIONS ─────────────────────────────────────
//   y += SH + 6;

//   hLine(y, C.teal);
//   y += 4;

//   rect(ML, y - 0.5, 40, 5.5, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("TERMS & CONDITIONS", ML + 20, y + 3.5, { align: "center" });
//   y += 7;

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(7.5);
//   setFg(C.slate);
//   getTermsAndConditions(company).forEach((line, idx) => {
//     if (y < 260) {
//       doc.text(`${idx + 1}.  ${line}`, ML + 2, y);
//       y += 4.5;
//     }
//   });

//   // ── FOOTER STRIP ───────────────────────────────────────────
//   const FY = 285;
//   rect(0, FY, PW, 12, C.navy, "F");
//   rect(0, FY, PW, 1.5, C.teal, "F");

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(7);
//   setFg([160, 180, 210]);
//   doc.text("This is a computer-generated invoice and does not require a physical signature.", PW / 2, FY + 6, { align: "center" });
//   doc.text(`${company.company_name ?? ""} • GST: ${company.gst_no ?? ""}`, PW / 2, FY + 10, { align: "center" });

//   return doc;
// };

// ============================================================
//  Professional GST E-Invoice Generator  •  jsPDF + autoTable
// ============================================================

// const generateInvoicePDF = async (header, items, company) => {
//   const doc = new jsPDF("p", "mm", "a4");
//   const PW = 210; // page width
//   const ML = 12;  // margin left
//   const MR = 198; // margin right (210 - 12)

//   // ── BRAND PALETTE ──────────────────────────────────────────
//   const C = {
//     navy:      [13,  42,  84],   // deep navy — primary brand
//     teal:      [0,  128, 128],   // teal accent
//     tealLight: [0,  160, 160],
//     white:     [255, 255, 255],
//     offWhite:  [248, 249, 252],
//     slate:     [71,  85, 105],
//     steel:     [148, 163, 184],
//     ink:       [15,  23,  42],
//     amber:     [217, 119,   6],  // highlight accent
//     green:     [22, 163,  74],
//     borderGray:[220, 225, 235],
//   };

//   // ── HELPERS ────────────────────────────────────────────────
//   const rgb   = (arr) => arr;
//   const setFg = (arr) => doc.setTextColor(...arr);
//   const setBg = (arr) => doc.setFillColor(...arr);
//   const setLn = (arr) => doc.setDrawColor(...arr);

//   const rect = (x, y, w, h, color, style = "F") => {
//     setBg(color);
//     doc.rect(x, y, w, h, style);
//   };

//   const hLine = (y, color = C.borderGray) => {
//     setLn(color);
//     doc.setLineWidth(0.3);
//     doc.line(ML, y, MR, y);
//   };

//   const label = (txt, x, y, size = 7.5, color = C.steel, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(txt, x, y);
//   };

//   const value = (txt, x, y, size = 9, color = C.ink, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(String(txt ?? "-"), x, y);
//   };

//   // ── BACKGROUND ─────────────────────────────────────────────
//   rect(0, 0, PW, 297, C.white);

//   // ── HEADER BAND ────────────────────────────────────────────
//   rect(0, 0, PW, 38, C.navy);
//   // Accent strip bottom of header
//   rect(0, 36, PW, 2.5, C.teal);

//   // Logos
//   try { doc.addImage(LeftLogo,  "PNG", ML,      7, 22, 22); } catch(_) {}
//   try { doc.addImage(RightLogo, "PNG", MR - 22, 7, 22, 22); } catch(_) {}

//   // ── GST E-INVOICE — centered at very top ───────────────────
//   let hy = 6;
//   // Pill background centered
//   const badgeW = 52;
//   const badgeX = (PW - badgeW) / 2;
//   rect(badgeX, hy - 3.5, badgeW, 7, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(9);
//   setFg(C.white);
//   doc.text("GST E-INVOICE", PW / 2, hy + 1, { align: "center" });

//   hy += 8;

//   // ── Company name + details below the badge ─────────────────
//   const headerLines = getCompanyHeaderLines(company);
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(15);
//   setFg(C.white);
//   doc.text(headerLines[0] ?? "Company Name", PW / 2, hy, { align: "center" });

//   hy += 5.5;
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(8);
//   setFg(C.tealLight);
//   if (headerLines[1]) doc.text(headerLines[1], PW / 2, hy, { align: "center" }), (hy += 4.5);
//   if (headerLines[2]) doc.text(headerLines[2], PW / 2, hy, { align: "center" }), (hy += 4.5);

//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8.5);
//   setFg([255, 200, 60]);
//   doc.text("AUTHORIZED SERVICE CENTER", PW / 2, hy, { align: "center" });

//   // ── INVOICE META BAR ───────────────────────────────────────
//   let y = 42;
//   rect(ML, y, (MR - ML), 14, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.setLineWidth(0.3);
//   doc.rect(ML, y, (MR - ML), 14, "S");

//   // Invoice No
//   const invoiceNo = `${header.book_code}${header.vouch_no}`;
//   const invoiceDate = format(new Date(header.vouch_date), "dd/MM/yyyy");

//   label("INVOICE NO",          ML + 3, y + 4.5, 7, C.steel, true);
//   value(invoiceNo,             ML + 3, y + 9.5, 9.5, C.navy, true);

//   label("INVOICE DATE",        75, y + 4.5, 7, C.steel, true);
//   value(invoiceDate,           75, y + 9.5, 9.5, C.ink, true);

//   label("TECHNICIAN",          120, y + 4.5, 7, C.steel, true);
//   value(header.technician_name ?? "-", 120, y + 9.5, 9, C.ink);

//   label("STATUS",              170, y + 4.5, 7, C.steel, true);
//   // status badge
//   rect(170, y + 5.5, 24, 5.5, C.green, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7);
//   setFg(C.white);
//   doc.text("PAID", 182, y + 9.5, { align: "center" });

//   // ── PARTY / BILL TO ────────────────────────────────────────
//   y += 18;

//   // Left card — Bill To
//   rect(ML, y, 90, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, y, 90, 28, "S");
//   // Left accent stripe
//   rect(ML, y, 2, 28, C.teal, "F");

//   label("BILL TO",          ML + 5, y + 5.5, 7,  C.teal,  true);
//   value(header.party_name,  ML + 5, y + 11,  9.5, C.navy,  true);

//   label("GST NO",           ML + 5, y + 16,  7, C.steel, true);
//   value(header.party_gst,   ML + 5, y + 20.5, 8, C.ink);

//   label("PHONE",            ML + 5, y + 24.5, 7, C.steel, true);
//   // phone placed right of label
//   value(header.party_phone, ML + 18, y + 24.5, 8, C.ink);

//   // Right card — Contact Details
//   const RX = ML + 95;
//   rect(RX, y, 91, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(RX, y, 91, 28, "S");
//   rect(RX, y, 2, 28, C.amber, "F");

//   label("EMAIL",             RX + 5, y + 5.5,  7, C.amber,  true);
//   value(header.party_email,  RX + 5, y + 11,   8, C.ink);

//   label("CREATED DATE",      RX + 5, y + 16,   7, C.steel, true);
//   value(format(new Date(header.vouch_date), "dd/MM/yyyy"), RX + 5, y + 20.5, 8, C.ink);

//   label("DOCUMENT TYPE",     RX + 5, y + 24.5, 7, C.steel, true);
//   value("Tax Invoice",       RX + 32, y + 24.5, 8, C.ink);

//   // ── ITEM TABLE ─────────────────────────────────────────────
//   y += 33;

//   autoTable(doc, {
//     startY: y,
//     margin: { left: ML, right: 12 },
//     theme: "plain",
//     styles: {
//       fontSize: 8,
//       cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
//       textColor: C.ink,
//       lineColor: C.borderGray,
//       lineWidth: 0.25,
//     },
//     headStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//       fontSize: 7.5,
//       cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
//     },
//     alternateRowStyles: {
//       fillColor: C.offWhite,
//     },
//     columnStyles: {
//       0: { halign: "center", cellWidth: 9  },
//       1: { cellWidth: 55 },
//       2: { halign: "right",  cellWidth: 18 },
//       3: { halign: "right",  cellWidth: 22 },
//       4: { halign: "right",  cellWidth: 20 },
//       5: { halign: "right",  cellWidth: 18 },
//       6: { halign: "right",  cellWidth: 18 },
//       7: { halign: "right",  cellWidth: 22, fontStyle: "bold" },
//     },
//     head: [[
//       "#",
//       "Item Description (HSN)",
//       "MRP (₹)",
//       "Unit Price × Qty",
//       "Basic Amt (₹)",
//       "SGST (₹)",
//       "CGST (₹)",
//       "Net Amt (₹)",
//     ]],
//     body: items.map((item, i) => [
//       i + 1,
//       `${item.item_name}\n(HSN: ${item.hsn_code})`,
//       Number(item.rate).toFixed(2),
//       `${Number(item.rate).toFixed(2)} × ${item.qty}`,
//       Number(item.basic_amt).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       Number(item.net_amt).toFixed(2),
//     ]),
//     // Zebra footer row
//     foot: [[
//       "",
//       { content: "TOTAL", styles: { fontStyle: "bold", textColor: C.white, fillColor: C.navy } },
//       "",
//       "",
//       { content: Number(header.total_basic).toFixed(2), styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: Number(header.net_amount).toFixed(2),  styles: { fontStyle: "bold", halign: "right", fillColor: C.teal,  textColor: C.white } },
//     ]],
//     footStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//     },
//   });

//   y = doc.lastAutoTable.finalY + 6;

//   // ── AMOUNT SUMMARY CARD ────────────────────────────────────
//   const CARD_W = 80;                      // card width
//   const SX     = MR - CARD_W;            // card left edge (inside page)
//   const CARD_R = SX + CARD_W - 4;        // right text boundary (4 mm padding)
//   const SH     = 38;
//   rect(SX, y, CARD_W, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.setLineWidth(0.3);
//   doc.rect(SX, y, CARD_W, SH, "S");
//   // navy title bar
//   rect(SX, y, CARD_W, 6, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8);
//   setFg(C.white);
//   doc.text("AMOUNT SUMMARY", SX + CARD_W / 2, y + 4.2, { align: "center" });

//   let sy = y + 12;

//   // amtRow: label on left, value right-aligned inside card
//   const amtRow = (lbl, val) => {
//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(8.5);
//     setFg(C.slate);
//     doc.text(lbl, SX + 4, sy);

//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(8.5);
//     setFg(C.ink);
//     doc.text(`Rs. ${val}`, CARD_R, sy, { align: "right" });

//     sy += 6;
//   };

//   amtRow("Sub Total",  Number(header.total_basic).toFixed(2));
//   amtRow("SGST (Tax)", (header.total_tax / 2).toFixed(2));
//   amtRow("CGST (Tax)", (header.total_tax / 2).toFixed(2));

//   // divider line
//   setLn(C.borderGray);
//   doc.setLineWidth(0.25);
//   doc.line(SX + 2, sy - 2, SX + CARD_W - 2, sy - 2);
//   sy += 1;

//   // Grand Total row — full-width teal band
//   rect(SX, sy - 4, CARD_W, 9, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(9);
//   setFg(C.white);
//   doc.text("GRAND TOTAL", SX + 4, sy + 2.5);
//   doc.text(`Rs. ${Number(header.net_amount).toFixed(2)}`, CARD_R, sy + 2.5, { align: "right" });

//   // ── BANK + QR SECTION ──────────────────────────────────────
//   const BY = y;
//   rect(ML, BY, 100, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, BY, 100, SH, "S");
//   rect(ML, BY, 100, 5, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("BANK DETAILS", ML + 50, BY + 3.5, { align: "center" });

//   let bly = BY + 10;
//   const bankRow = (lbl, val) => {
//     label(lbl.toUpperCase() + " :", ML + 4, bly, 7.5, C.slate, true);
//     value(String(val ?? "-").toUpperCase(), ML + 32, bly, 8, C.ink, false);
//     bly += 5.5;
//   };
//   bankRow("Bank Name", company.bank_name);
//   bankRow("A/C No",    company.account_number);
//   bankRow("IFSC Code", company.ifsc_code);
//   bankRow("Branch",    company.branch_name ?? "");

//   // QR code — bottom right
//   const qrY = 255;
//   try {
//     doc.addImage(QrImage, "PNG", MR - 32, qrY, 32, 32);
//     label("Scan to Pay", MR - 32 + 16, qrY + 34, 7, C.slate, false);
//     // center label under QR
//     doc.setFontSize(7);
//     setFg(C.slate);
//     doc.text("Scan to Pay", MR - 32 + 16, qrY + 34, { align: "center" });
//   } catch(_) {}

//   // ── TERMS & CONDITIONS ─────────────────────────────────────
//   y += SH + 6;

//   hLine(y, C.teal);
//   y += 4;

//   rect(ML, y - 0.5, 40, 5.5, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("TERMS & CONDITIONS", ML + 20, y + 3.5, { align: "center" });
//   y += 7;

//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8);
//   setFg(C.ink);
//   getTermsAndConditions(company).forEach((line, idx) => {
//     if (y < 260) {
//       // Strip any leading number/dot the array already contains
//       const cleanLine = line.replace(/^\s*\d+[\.\)]\s*/, "");
//       doc.text(`${idx + 1}.  ${cleanLine}`, ML + 2, y);
//       y += 5;
//     }
//   });

//   // ── FOOTER STRIP ───────────────────────────────────────────
//   const FY = 285;
//   rect(0, FY, PW, 12, C.navy, "F");
//   rect(0, FY, PW, 1.5, C.teal, "F");

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(7);
//   setFg([160, 180, 210]);
//   doc.text("This is a computer-generated invoice and does not require a physical signature.", PW / 2, FY + 6, { align: "center" });
//   doc.text(`${company.company_name ?? ""} • GST: ${company.gst_no ?? ""}`, PW / 2, FY + 10, { align: "center" });

//   return doc;
// };

// ============================================================
//  Professional GST E-Invoice Generator  •  jsPDF + autoTable
// ============================================================


// const generateInvoicePDF = async (header, items, company) => {
//   const doc = new jsPDF("p", "mm", "a4");
//   const PW = 210; // page width
//   const ML = 12;  // margin left
//   const MR = 198; // margin right (210 - 12)

//   // ── BRAND PALETTE ──────────────────────────────────────────
//   const C = {
//     navy:      [13,  42,  84],   // deep navy — primary brand
//     teal:      [0,  128, 128],   // teal accent
//     tealLight: [0,  160, 160],
//     white:     [255, 255, 255],
//     offWhite:  [248, 249, 252],
//     slate:     [71,  85, 105],
//     steel:     [148, 163, 184],
//     ink:       [15,  23,  42],
//     amber:     [217, 119,   6],  // highlight accent
//     green:     [22, 163,  74],
//     borderGray:[220, 225, 235],
//   };

//   // ── HELPERS ────────────────────────────────────────────────
//   const rgb   = (arr) => arr;
//   const setFg = (arr) => doc.setTextColor(...arr);
//   const setBg = (arr) => doc.setFillColor(...arr);
//   const setLn = (arr) => doc.setDrawColor(...arr);

//   const rect = (x, y, w, h, color, style = "F") => {
//     setBg(color);
//     doc.rect(x, y, w, h, style);
//   };

//   const hLine = (y, color = C.borderGray) => {
//     setLn(color);
//     doc.setLineWidth(0.3);
//     doc.line(ML, y, MR, y);
//   };

//   const label = (txt, x, y, size = 7.5, color = C.steel, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(txt, x, y);
//   };

//   const value = (txt, x, y, size = 9, color = C.ink, bold = false) => {
//     doc.setFontSize(size);
//     doc.setFont("helvetica", bold ? "bold" : "normal");
//     setFg(color);
//     doc.text(String(txt ?? "-"), x, y);
//   };

//   // ── BACKGROUND ─────────────────────────────────────────────
//   rect(0, 0, PW, 297, C.white);

//   // ── HEADER BAND ────────────────────────────────────────────
//   rect(0, 0, PW, 38, C.navy);
//   // Accent strip bottom of header
//   rect(0, 36, PW, 2.5, C.teal);

//   // Logos
//   try { doc.addImage(LeftLogo,  "PNG", ML,      7, 22, 22); } catch(_) {}
//   try { doc.addImage(RightLogo, "PNG", MR - 22, 7, 22, 22); } catch(_) {}

//   // ── GST E-INVOICE — centered at very top ───────────────────
//   let hy = 6;
//   // Pill background centered
//   const badgeW = 52;
//   const badgeX = (PW - badgeW) / 2;
//   rect(badgeX, hy - 3.5, badgeW, 7, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(9);
//   setFg(C.white);
//   doc.text("GST E-INVOICE", PW / 2, hy + 1, { align: "center" });

//   hy += 8;

//   // ── Company name + details below the badge ─────────────────
//   const headerLines = getCompanyHeaderLines(company);
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(15);
//   setFg(C.white);
//   doc.text(headerLines[0] ?? "Company Name", PW / 2, hy, { align: "center" });

//   hy += 5.5;
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(8);
//   setFg(C.tealLight);
//   if (headerLines[1]) doc.text(headerLines[1], PW / 2, hy, { align: "center" }), (hy += 4.5);
//   if (headerLines[2]) doc.text(headerLines[2], PW / 2, hy, { align: "center" }), (hy += 4.5);

//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8.5);
//   setFg([255, 200, 60]);
//   doc.text("AUTHORIZED SERVICE CENTER", PW / 2, hy, { align: "center" });

//   // ── INVOICE META BAR ───────────────────────────────────────
//   let y = 42;
//   rect(ML, y, (MR - ML), 14, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.setLineWidth(0.3);
//   doc.rect(ML, y, (MR - ML), 14, "S");

//   // Invoice No
//   const invoiceNo = `${header.book_code}${header.vouch_no}`;
//   const invoiceDate = format(new Date(header.vouch_date), "dd/MM/yyyy");

//   label("INVOICE NO",          ML + 3, y + 4.5, 7, C.steel, true);
//   value(invoiceNo,             ML + 3, y + 9.5, 9.5, C.navy, true);

//   label("INVOICE DATE",        75, y + 4.5, 7, C.steel, true);
//   value(invoiceDate,           75, y + 9.5, 9.5, C.ink, true);

//   label("TECHNICIAN",          120, y + 4.5, 7, C.steel, true);
//   value(header.technician_name ?? "-", 120, y + 9.5, 9, C.ink);

//   label("STATUS",              170, y + 4.5, 7, C.steel, true);
//   // status badge
//   rect(170, y + 5.5, 24, 5.5, C.green, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7);
//   setFg(C.white);
//   doc.text("PAID", 182, y + 9.5, { align: "center" });

//   // ── PARTY / BILL TO ────────────────────────────────────────
//   y += 18;

//   // Left card — Bill To
//   rect(ML, y, 90, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, y, 90, 28, "S");
//   // Left accent stripe
//   rect(ML, y, 2, 28, C.teal, "F");

//   label("BILL TO",          ML + 5, y + 5.5, 7,  C.teal,  true);
//   value(header.party_name,  ML + 5, y + 11,  9.5, C.navy,  true);

//   label("GST NO",           ML + 5, y + 16,  7, C.steel, true);
//   value(header.party_gst,   ML + 5, y + 20.5, 8, C.ink);

//   label("PHONE",            ML + 5, y + 24.5, 7, C.steel, true);
//   // phone placed right of label
//   value(header.party_phone, ML + 18, y + 24.5, 8, C.ink);

//   // Right card — Contact Details
//   const RX = ML + 95;
//   rect(RX, y, 91, 28, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(RX, y, 91, 28, "S");
//   rect(RX, y, 2, 28, C.amber, "F");

//   label("EMAIL",             RX + 5, y + 5.5,  7, C.amber,  true);
//   value(header.party_email,  RX + 5, y + 11,   8, C.ink);

//   label("CREATED DATE",      RX + 5, y + 16,   7, C.steel, true);
//   value(format(new Date(header.vouch_date), "dd/MM/yyyy"), RX + 5, y + 20.5, 8, C.ink);

//   label("DOCUMENT TYPE",     RX + 5, y + 24.5, 7, C.steel, true);
//   value("Tax Invoice",       RX + 32, y + 24.5, 8, C.ink);

//   // ── ITEM TABLE ─────────────────────────────────────────────
//   y += 33;

//   autoTable(doc, {
//     startY: y,
//     margin: { left: ML, right: 12 },
//     theme: "plain",
//     styles: {
//       fontSize: 8,
//       cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
//       textColor: C.ink,
//       lineColor: C.borderGray,
//       lineWidth: 0.25,
//     },
//     headStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//       fontSize: 7.5,
//       cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
//     },
//     alternateRowStyles: {
//       fillColor: C.offWhite,
//     },
//     columnStyles: {
//       0: { halign: "center", cellWidth: 9  },
//       1: { cellWidth: 55 },
//       2: { halign: "right",  cellWidth: 18 },
//       3: { halign: "right",  cellWidth: 22 },
//       4: { halign: "right",  cellWidth: 20 },
//       5: { halign: "right",  cellWidth: 18 },
//       6: { halign: "right",  cellWidth: 18 },
//       7: { halign: "right",  cellWidth: 22, fontStyle: "bold" },
//     },
//     head: [[
//       "#",
//       "Item Description (HSN)",
//       "MRP (Rs.)",
//       "Unit Price x Qty",
//       "Basic Amt (Rs.)",
//       "SGST (Rs.)",
//       "CGST (Rs.)",
//       "Net Amt (Rs.)",
//     ]],
//     body: items.map((item, i) => [
//       i + 1,
//       `${item.item_name}\n(HSN: ${item.hsn_code})`,
//       Number(item.rate).toFixed(2),
//       `${Number(item.rate).toFixed(2)} x ${item.qty}`,
//       Number(item.basic_amt).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       (item.tax_amt / 2).toFixed(2),
//       Number(item.net_amt).toFixed(2),
//     ]),
//     // Zebra footer row
//     foot: [[
//       "",
//       { content: "TOTAL", styles: { fontStyle: "bold", textColor: C.white, fillColor: C.navy } },
//       "",
//       "",
//       { content: Number(header.total_basic).toFixed(2), styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: "bold", halign: "right", fillColor: C.navy, textColor: C.white } },
//       { content: Number(header.net_amount).toFixed(2),  styles: { fontStyle: "bold", halign: "right", fillColor: C.teal,  textColor: C.white } },
//     ]],
//     footStyles: {
//       fillColor: C.navy,
//       textColor: C.white,
//       fontStyle: "bold",
//     },
//   });

//   y = doc.lastAutoTable.finalY + 6;

//   // ── AMOUNT SUMMARY CARD ────────────────────────────────────
//   const CARD_W = 80;                      // card width
//   const SX     = MR - CARD_W;            // card left edge (inside page)
//   const CARD_R = SX + CARD_W - 4;        // right text boundary (4 mm padding)
//   const SH     = 38;
//   rect(SX, y, CARD_W, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.setLineWidth(0.3);
//   doc.rect(SX, y, CARD_W, SH, "S");
//   // navy title bar
//   rect(SX, y, CARD_W, 6, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8);
//   setFg(C.white);
//   doc.text("AMOUNT SUMMARY", SX + CARD_W / 2, y + 4.2, { align: "center" });

//   let sy = y + 12;

//   // amtRow: label on left, value right-aligned inside card
//   const amtRow = (lbl, val) => {
//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(8.5);
//     setFg(C.slate);
//     doc.text(lbl, SX + 4, sy);

//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(8.5);
//     setFg(C.ink);
//     doc.text(`Rs. ${val}`, CARD_R, sy, { align: "right" });

//     sy += 6;
//   };

//   amtRow("Sub Total",  Number(header.total_basic).toFixed(2));
//   amtRow("SGST (Tax)", (header.total_tax / 2).toFixed(2));
//   amtRow("CGST (Tax)", (header.total_tax / 2).toFixed(2));

//   // divider line
//   setLn(C.borderGray);
//   doc.setLineWidth(0.25);
//   doc.line(SX + 2, sy - 2, SX + CARD_W - 2, sy - 2);
//   sy += 1;

//   // Grand Total row — full-width teal band
//   rect(SX, sy - 4, CARD_W, 9, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(9);
//   setFg(C.white);
//   doc.text("GRAND TOTAL", SX + 4, sy + 2.5);
//   doc.text(`Rs. ${Number(header.net_amount).toFixed(2)}`, CARD_R, sy + 2.5, { align: "right" });

//   // ── BANK + QR SECTION ──────────────────────────────────────
//   const BY = y;
//   rect(ML, BY, 100, SH, C.offWhite, "F");
//   setLn(C.borderGray);
//   doc.rect(ML, BY, 100, SH, "S");
//   rect(ML, BY, 100, 5, C.navy, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("BANK DETAILS", ML + 50, BY + 3.5, { align: "center" });

//   let bly = BY + 10;
//   const bankRow = (lbl, val) => {
//     label(lbl.toUpperCase() + " :", ML + 4, bly, 7.5, C.slate, true);
//     value(String(val ?? "-").toUpperCase(), ML + 32, bly, 8, C.ink, false);
//     bly += 5.5;
//   };
//   bankRow("Bank Name", company.bank_name);
//   bankRow("A/C No",    company.account_number);
//   bankRow("IFSC Code", company.ifsc_code);
//   bankRow("Branch",    company.branch_name ?? "");

//   // QR code — bottom right
//   const qrY = 255;
//   try {
//     doc.addImage(QrImage, "PNG", MR - 32, qrY, 32, 32);
//     label("Scan to Pay", MR - 32 + 16, qrY + 34, 7, C.slate, false);
//     // center label under QR
//     doc.setFontSize(7);
//     setFg(C.slate);
//     doc.text("Scan to Pay", MR - 32 + 16, qrY + 34, { align: "center" });
//   } catch(_) {}

//   // ── TERMS & CONDITIONS ─────────────────────────────────────
//   y += SH + 6;

//   hLine(y, C.teal);
//   y += 4;

//   rect(ML, y - 0.5, 40, 5.5, C.teal, "F");
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(7.5);
//   setFg(C.white);
//   doc.text("TERMS & CONDITIONS", ML + 20, y + 3.5, { align: "center" });
//   y += 7;

//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(8);
//   setFg(C.ink);
//   getTermsAndConditions(company).forEach((line, idx) => {
//     if (y < 260) {
//       // Strip any leading number/dot the array already contains
//       const cleanLine = line.replace(/^\s*\d+[\.\)]\s*/, "");
//       doc.text(`${idx + 1}.  ${cleanLine}`, ML + 2, y);
//       y += 5;
//     }
//   });

//   // ── FOOTER STRIP ───────────────────────────────────────────
//   const FY = 285;
//   rect(0, FY, PW, 12, C.navy, "F");
//   rect(0, FY, PW, 1.5, C.teal, "F");

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(7);
//   setFg([160, 180, 210]);
//   doc.text("This is a computer-generated invoice and does not require a physical signature.", PW / 2, FY + 6, { align: "center" });
//   doc.text(`${company.company_name ?? ""} • GST: ${company.gst_no ?? ""}`, PW / 2, FY + 10, { align: "center" });

//   return doc;
// };

// ================================================================
//  GST E-Invoice Generator  —  Professional Light Theme
//  Style: Clean white base · Soft blue accents · Premium borders
//  Inspired by: Zoho Books · Tally Prime · Razorpay
// ================================================================

const generateInvoicePDF = async (header, items, company) => {
  const doc = new jsPDF("p", "mm", "a4");

  // ── PAGE DIMENSIONS ──────────────────────────────────────────
  const PW = 210;         // A4 width
  const PH = 297;         // A4 height
  const ML = 14;          // margin left
  const MR = 196;         // margin right
  const CW = MR - ML;    // content width = 182 mm

  // ── COLOUR PALETTE  (light / professional) ───────────────────
  const C = {
    white       : [255, 255, 255],
    pageBg      : [247, 249, 252],  // very light grey page
    accent      : [ 37,  99, 235],  // Zoho-style blue
    accentLight : [219, 234, 254],  // pale blue fill
    accentMid   : [147, 197, 253],  // mid blue border
    headingText : [ 15,  23,  42],  // near-black
    bodyText    : [ 51,  65,  85],  // dark slate
    labelText   : [100, 116, 139],  // muted grey
    borderLight : [226, 232, 240],  // soft grey border
    rowAlt      : [248, 250, 252],  // table zebra stripe
    greenBg     : [220, 252, 231],
    greenText   : [ 21, 128,  61],
  };

  // ── HELPERS ──────────────────────────────────────────────────
  const setFg = (c) => doc.setTextColor(...c);
  const setBg = (c) => doc.setFillColor(...c);
  const setLn = (c) => doc.setDrawColor(...c);

  const fillRect = (x, y, w, h, color) => {
    setBg(color);
    doc.rect(x, y, w, h, "F");
  };

  const strokeRect = (x, y, w, h, color, lw = 0.3) => {
    setLn(color);
    doc.setLineWidth(lw);
    doc.rect(x, y, w, h, "S");
  };

  const hLine = (y, x1 = ML, x2 = MR, color = C.borderLight, lw = 0.3) => {
    setLn(color);
    doc.setLineWidth(lw);
    doc.line(x1, y, x2, y);
  };

  // Central text helper — all text goes through here
  const txt = (str, x, y, opts = {}) => {
    const { size = 9, color = C.bodyText, bold = false, align = "left" } = opts;
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    setFg(color);
    doc.text(String(str ?? "-"), x, y, { align });
  };

  // ── PAGE BACKGROUND ──────────────────────────────────────────
  fillRect(0, 0, PW, PH, C.pageBg);
  // White content card centred on page
  fillRect(ML - 2, 0, CW + 4, PH, C.white);
  // Blue rule at very top
  fillRect(0, 0, PW, 2.5, C.accent);

  // ── HEADER ───────────────────────────────────────────────────
  let y = 9;

  // Logos
  try { doc.addImage(LeftLogo,  "PNG", ML,      y, 20, 20); } catch (_) {}
  try { doc.addImage(RightLogo, "PNG", MR - 20, y, 20, 20); } catch (_) {}

  // "GST E-INVOICE" pill — perfectly centred at top
  const pillW = 48;
  const pillX = (PW - pillW) / 2;
  fillRect(pillX, y - 0.5, pillW, 6.5, C.accentLight);
  setLn(C.accentMid);
  doc.setLineWidth(0.3);
  doc.rect(pillX, y - 0.5, pillW, 6.5, "S");
  txt("GST INVOICE", PW / 2, y + 4, {
    size: 7.5, color: C.accent, bold: true, align: "center",
  });

  y += 10;

  // Company name
  const headerLines = getCompanyHeaderLines(company);
  txt(headerLines[0] ?? "Company Name", PW / 2, y, {
    size: 16, color: C.headingText, bold: true, align: "center",
  });
  y += 6;

  if (headerLines[1]) {
    txt(headerLines[1], PW / 2, y, { size: 8.5, color: C.labelText, align: "center" });
    y += 5;
  }
  if (headerLines[2]) {
    txt(headerLines[2], PW / 2, y, { size: 8.5, color: C.labelText, align: "center" });
    y += 5;
  }

  txt("Authorized Service Center", PW / 2, y, {
    size: 8, color: C.accent, bold: true, align: "center",
  });
  y += 5;

  hLine(y, ML, MR, C.borderLight, 0.4);
  y += 6;

  // ── INVOICE META BAR ─────────────────────────────────────────
  fillRect(ML, y, CW, 17, C.accentLight);
  strokeRect(ML, y, CW, 17, C.accentMid, 0.3);

  const invoiceNo   = `${header.book_code}${header.vouch_no}`;
  const invoiceDate = format(new Date(header.vouch_date), "dd/MM/yyyy");

  // Four meta columns
  txt("INVOICE NO",  ML + 4,  y + 5.5, { size: 6.5, color: C.labelText, bold: true });
  txt(invoiceNo,     ML + 4,  y + 12,  { size: 10,  color: C.accent,    bold: true });

  txt("DATE",        ML + 56, y + 5.5, { size: 6.5, color: C.labelText, bold: true });
  txt(invoiceDate,   ML + 56, y + 12,  { size: 9,   color: C.headingText });

  txt("TECHNICIAN",           ML + 104, y + 5.5, { size: 6.5, color: C.labelText, bold: true });
  txt(header.technician_name ?? "-", ML + 104, y + 12, { size: 9, color: C.headingText });

  txt("STATUS", ML + 155, y + 5.5, { size: 6.5, color: C.labelText, bold: true });
  fillRect(ML + 155, y + 7, 24, 6, C.greenBg);
  txt("PAID", ML + 167, y + 11.5, { size: 7.5, color: C.greenText, bold: true, align: "center" });

  y += 23;

  // ── PARTY CARDS ──────────────────────────────────────────────
  const cardH = 30;
  const halfW = (CW - 4) / 2;

  // Left — Bill To
  strokeRect(ML, y, halfW, cardH, C.borderLight, 0.3);
  fillRect(ML, y, 2.5, cardH, C.accent);

  txt("BILL TO",          ML + 6,  y + 6,  { size: 6.5, color: C.accent,     bold: true });
  txt(header.party_name,  ML + 6,  y + 12, { size: 10,  color: C.headingText, bold: true });
  txt("GST :",            ML + 6,  y + 18, { size: 7,   color: C.labelText,   bold: true });
  txt(header.party_gst ?? "-", ML + 19, y + 18, { size: 8, color: C.bodyText });
  txt("Phone :",          ML + 6,  y + 24, { size: 7,   color: C.labelText,   bold: true });
  txt(header.party_phone ?? "-", ML + 22, y + 24, { size: 8, color: C.bodyText });

  // Right — Invoice Details
  const RX = ML + halfW + 4;
  strokeRect(RX, y, halfW, cardH, C.borderLight, 0.3);
  fillRect(RX, y, 2.5, cardH, C.accentMid);

  txt("INVOICE DETAILS", RX + 6,  y + 6,  { size: 6.5, color: C.labelText, bold: true });
  txt("Email :",          RX + 6,  y + 13, { size: 7,   color: C.labelText, bold: true });
  txt(header.party_email ?? "-", RX + 21, y + 13, { size: 8, color: C.bodyText });
  txt("Created :",        RX + 6,  y + 19, { size: 7,   color: C.labelText, bold: true });
  txt(invoiceDate,        RX + 25, y + 19, { size: 8,   color: C.bodyText });
  txt("Doc Type :",       RX + 6,  y + 25, { size: 7,   color: C.labelText, bold: true });
  txt("Tax Invoice",      RX + 28, y + 25, { size: 8,   color: C.bodyText });

  y += cardH + 8;

  // ── ITEM TABLE ───────────────────────────────────────────────
  autoTable(doc, {
    startY : y,
    margin : { left: ML, right: ML },
    theme  : "plain",
    styles : {
      fontSize    : 8,
      cellPadding : { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      textColor   : C.bodyText,
      lineColor   : C.borderLight,
      lineWidth   : 0.25,
      font        : "helvetica",
    },
    headStyles : {
      fillColor   : C.accent,
      textColor   : C.white,
      fontStyle   : "bold",
      fontSize    : 7.5,
      cellPadding : { top: 4.5, bottom: 4.5, left: 3, right: 3 },
    },
    alternateRowStyles : { fillColor: C.rowAlt },
    columnStyles: {
      0: { halign: "center", cellWidth: 8  },
      1: { cellWidth: 54 },
      2: { halign: "right",  cellWidth: 18 },
      3: { halign: "right",  cellWidth: 22 },
      4: { halign: "right",  cellWidth: 20 },
      5: { halign: "right",  cellWidth: 18 },
      6: { halign: "right",  cellWidth: 18 },
      7: { halign: "right",  cellWidth: 24, fontStyle: "bold" },
    },
    head: [[
      "#",
      "Item Description (HSN)",
      "MRP (Rs.)",
      "Unit Price x Qty",
      "Basic Amt",
      "SGST",
      "CGST",
      "Net Amount",
    ]],
    body: items.map((item, i) => [
      i + 1,
      `${item.item_name}${item.hsn_code && item.hsn_code !== 'null' ? `\n(HSN: ${item.hsn_code})` : ''}`,
      Number(item.rate).toFixed(2),
      `${Number(item.rate).toFixed(2)} x ${item.qty}`,
      Number(item.basic_amt).toFixed(2),
      (item.tax_amt / 2).toFixed(2),
      (item.tax_amt / 2).toFixed(2),
      Number(item.net_amt).toFixed(2),
    ]),
    foot: [[
      { content: "", colSpan: 3,
        styles: { fillColor: C.accentLight } },
      { content: "TOTAL",
        styles: { fontStyle: "bold", fillColor: C.accentLight, textColor: C.accent } },
      { content: Number(header.total_basic).toFixed(2),
        styles: { fontStyle: "bold", halign: "right", fillColor: C.accentLight, textColor: C.headingText } },
      { content: (header.total_tax / 2).toFixed(2),
        styles: { fontStyle: "bold", halign: "right", fillColor: C.accentLight, textColor: C.headingText } },
      { content: (header.total_tax / 2).toFixed(2),
        styles: { fontStyle: "bold", halign: "right", fillColor: C.accentLight, textColor: C.headingText } },
      { content: `Rs. ${Number(header.net_amount).toFixed(2)}`,
        styles: { fontStyle: "bold", halign: "right", fillColor: C.accent, textColor: C.white } },
    ]],
    footStyles: {
      fillColor : C.accentLight,
      textColor : C.headingText,
      fontStyle : "bold",
      fontSize  : 8.5,
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── BANK  |  AMOUNT SUMMARY  |  QR CODE  (3-column row) ─────
  const BOT_H  = 46;
  const QR_W   = 34;                        // QR column width
  const GAP    = 4;                          // gap between columns
  const BANK_W = 82;                         // bank card width
  const AMT_W  = CW - BANK_W - QR_W - GAP * 2; // remaining width for summary
  const AMT_X  = ML + BANK_W + GAP;         // summary card left edge
  const QR_X   = AMT_X + AMT_W + GAP;       // QR column left edge
  const AMT_R  = AMT_X + AMT_W - 4;         // right text boundary inside summary card

  // ── Bank Details card ────────────────────────────────────────
  strokeRect(ML, y, BANK_W, BOT_H, C.borderLight, 0.3);
  fillRect(ML, y, BANK_W, 7.5, C.accentLight);
  hLine(y + 7.5, ML, ML + BANK_W, C.accentMid, 0.35);
  txt("BANK DETAILS", ML + BANK_W / 2, y + 5.2, {
    size: 7.5, color: C.accent, bold: true, align: "center",
  });

  let bly = y + 14;
  const bankRow = (lbl, val) => {
    txt(lbl, ML + 4, bly, { size: 7, color: C.labelText, bold: true });
    txt(String(val ?? "-").toUpperCase(), ML + 30, bly, { size: 7.5, color: C.headingText });
    bly += 6.2;
  };
  bankRow("BANK NAME :", company.bank_name);
  bankRow("A/C NO :",    company.account_number);
  bankRow("IFSC CODE :", company.ifsc_code);
  bankRow("BRANCH :",    company.branch_name ?? "");

  // ── Amount Summary card ──────────────────────────────────────
  strokeRect(AMT_X, y, AMT_W, BOT_H, C.borderLight, 0.3);
  fillRect(AMT_X, y, AMT_W, 7.5, C.accentLight);
  hLine(y + 7.5, AMT_X, AMT_X + AMT_W, C.accentMid, 0.35);
  txt("AMOUNT SUMMARY", AMT_X + AMT_W / 2, y + 5.2, {
    size: 7.5, color: C.accent, bold: true, align: "center",
  });

  let sy = y + 14;
  const amtRow = (lbl, val) => {
    txt(lbl, AMT_X + 4, sy, { size: 8, color: C.bodyText });
    txt(`Rs. ${val}`, AMT_R, sy, { size: 8, color: C.headingText, align: "right" });
    sy += 6.2;
  };

  amtRow("Sub Total",  Number(header.total_basic).toFixed(2));
  amtRow("SGST (Tax)", (header.total_tax / 2).toFixed(2));
  amtRow("CGST (Tax)", (header.total_tax / 2).toFixed(2));

  hLine(sy - 2, AMT_X + 3, AMT_X + AMT_W - 3, C.borderLight, 0.3);
  sy += 2;

  // Grand Total band inside summary card
  fillRect(AMT_X, sy - 3, AMT_W, 11, C.accent);
  txt("GRAND TOTAL", AMT_X + 4, sy + 4.5, { size: 8.5, color: C.white, bold: true });
  txt(`Rs. ${Number(header.net_amount).toFixed(2)}`, AMT_R, sy + 4.5, {
    size: 8.5, color: C.white, bold: true, align: "right",
  });

  // ── QR Code column (right side, same row) ────────────────────
  const qrSize = 26;
  const qrImgX = QR_X + (QR_W - qrSize) / 2;   // centre QR within its column
  const qrImgY = y + (BOT_H - qrSize - 8) / 2 + 3;  // vertically centre in row

  try {
    doc.addImage(QrImage, "PNG", qrImgX, qrImgY, qrSize, qrSize);
  } catch (_) {}

  txt("Scan to Pay", QR_X + QR_W / 2, qrImgY + qrSize + 4.5, {
    size: 6.5, color: C.labelText, align: "center",
  });

  y += BOT_H + 8;

  // ── TERMS & CONDITIONS ───────────────────────────────────────
  hLine(y, ML, MR, C.borderLight, 0.3);
  y += 5;

  // Section label
  fillRect(ML, y - 1.5, 50, 7, C.accentLight);
  strokeRect(ML, y - 1.5, 50, 7, C.accentMid, 0.25);
  txt("TERMS & CONDITIONS", ML + 25, y + 3.5, {
    size: 7, color: C.accent, bold: true, align: "center",
  });
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setFg(C.bodyText);
  getTermsAndConditions(company).forEach((line, idx) => {
    if (y < 272) {
      const cleanLine = line.replace(/^\s*\d+[\.\)]\s*/, "");
      doc.text(`${idx + 1}.  ${cleanLine}`, ML + 2, y);
      y += 5.2;
    }
  });

  // ── FOOTER BAR ───────────────────────────────────────────────
  const FY = 285;
  fillRect(0, FY, PW, 12, C.accent);
  fillRect(0, FY, PW, 0.8, C.accentMid);  // subtle top border on footer

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setFg(C.accentLight);
  doc.text(
    "This is a computer-generated invoice and does not require a physical signature.",
    PW / 2, FY + 5.5, { align: "center" }
  );
  doc.text(
    `${company.company_name ?? ""}   |   GST: ${company.gst_no ?? ""}`,
    PW / 2, FY + 9.8, { align: "center" }
  );

  return doc;
};





  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Sales</h1>
          <button
            onClick={() => window.location.href = '/transaction/sale/SA/new'}
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
            <h1 className="text-2xl font-bold text-gray-800">Sales Transactions</h1>
            <p className="text-gray-500 mt-1">View and manage all sales transactions</p>
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
              onClick={() => window.location.href = '/transaction/sale/SA/new'}
              className="flex items-center gap-2 px-4 py-2 bg-erp-primary text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-erp-primary/20"
            >
              <Plus className="w-5 h-5" />
              Add New Sale
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
            <p className="text-gray-500">No sales transactions found</p>
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
                    <button
                      onClick={() => setShowDeleteConfirm({ bookCode: sale.book_code, vouchNo: sale.vouch_no })}
                      className="py-2 px-3 text-sm text-red-600 bg-red-50 rounded-lg font-medium active:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border-t border-slate-100">
              <table className="w-full text-left font-inter border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold tracking-widest">
                    <th className="py-4 px-6 whitespace-nowrap">Voucher Details</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6 text-center">Volume</th>
                    <th className="py-4 px-6 text-right">Net Amount</th>
                    <th className="py-4 px-6 text-center">Payment Mode</th>
                    <th className="py-4 px-6 text-center">Created By</th>
                    <th className="py-4 px-6 text-center flex-shrink-0 w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sales.map((sale) => {
                    const amt = typeof sale.net_amount === 'number' ? sale.net_amount : Number(sale.net_amount || 0);
                    return (
                      <tr key={`${sale.book_code}-${sale.vouch_no}`} className="hover:bg-slate-50/60 transition-colors duration-200 group">
                        
                        {/* Voucher + Date */}
                        <td className="py-4 px-6 align-middle">
                          <div className="flex flex-col">
                            <span className="font-bold text-erp-primary text-[13px] whitespace-nowrap tracking-wide">
                              #{sale.book_code}-{sale.vouch_no}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-wide">
                              {format(new Date(sale.vouch_date), 'dd MMM, yyyy')}
                            </span>
                          </div>
                        </td>

                        {/* Customer Avatar + Name + Phone */}
                        <td className="py-4 px-6 align-middle">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center border border-indigo-50 shadow-sm">
                              <span className="text-erp-primary font-bold text-sm">
                                {sale.party_name ? sale.party_name.charAt(0).toUpperCase() : 'U'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-slate-800 tracking-tight">{sale.party_name}</span>
                              <span className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-wide">{sale.party_phone || 'No phone'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Quantity Badge */}
                        <td className="py-4 px-6 text-center align-middle">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tracking-wide border border-slate-200">
                            {sale.total_qty} Items
                          </span>
                        </td>

                        {/* Amount Badge */}
                        <td className="py-4 px-6 text-right align-middle">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-black tracking-wide border shadow-sm ${amt > 10000 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            ₹{amt.toFixed(2)}
                          </span>
                        </td>

                        {/* Payment Mode */}
                        <td className="py-4 px-6 text-center align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase shadow-sm border ${
                            sale.payment_mode?.toLowerCase() === 'online' 
                              ? 'bg-blue-50/50 text-erp-primary border-blue-100' 
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sale.payment_mode?.toLowerCase() === 'online' ? 'bg-erp-primary' : 'bg-slate-400'}`}></span>
                            {sale.payment_mode || 'Cash'}
                          </span>
                        </td>

                        {/* Created By */}
                        <td className="py-4 px-6 text-center align-middle">
                          <span className="inline-block px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-slate-50 text-slate-500 border border-slate-200 rounded-md">
                            {sale.created_by || 'SYSTEM'}
                          </span>
                        </td>

                        {/* Action Icons */}
                        <td className="py-4 px-6 align-middle">
                          <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => window.location.href = `/transaction/sale/${sale.book_code}/${sale.vouch_no}`}
                              className="p-2 text-slate-400 hover:text-erp-primary hover:bg-blue-50 rounded-full transition-all group/btn"
                              title="View / Edit"
                            >
                              <Eye className="w-[18px] h-[18px] group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => handlePrintSale(sale)}
                              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all group/btn"
                              title="Print"
                            >
                              <Printer className="w-[18px] h-[18px] group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => handleWhatsAppShare(sale)}
                              className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-all group/btn"
                              title="Share via WhatsApp"
                            >
                              <MessageCircle className="w-[18px] h-[18px] group-hover/btn:scale-110 transition-transform" />
                            </button>
                            {userRole === 'admin' && (
                              <button
                                onClick={() => setShowDeleteConfirm({ bookCode: sale.book_code, vouchNo: sale.vouch_no })}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all group/btn"
                                title="Delete"
                              >
                                <Trash2 className="w-[18px] h-[18px] group-hover/btn:scale-110 transition-transform" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
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
                Are you sure you want to delete sales transaction <strong>{showDeleteConfirm.bookCode}-{showDeleteConfirm.vouchNo}</strong>?
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

export default SaleList;
