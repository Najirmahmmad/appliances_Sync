import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
// For latin1 support, sometimes we need to override it even if it exists
global.Buffer = Buffer;

// ============================================================
//  Professional GST Invoice PDF Generator
//  Ported from /client SaleList.jsx — generateInvoicePDF()
//  Works on React Native Web via jsPDF (web-only utility)
// ============================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { invoiceImages } from './invoiceAssets';

// ── Colour palette (matches /client) ─────────────────────────
const C = {
  white       : [255, 255, 255] as [number,number,number],
  pageBg      : [247, 249, 252] as [number,number,number],
  accent      : [ 37,  99, 235] as [number,number,number],
  accentLight : [219, 234, 254] as [number,number,number],
  accentMid   : [147, 197, 253] as [number,number,number],
  headingText : [ 15,  23,  42] as [number,number,number],
  bodyText    : [ 51,  65,  85] as [number,number,number],
  labelText   : [100, 116, 139] as [number,number,number],
  borderLight : [226, 232, 240] as [number,number,number],
  rowAlt      : [248, 250, 252] as [number,number,number],
  greenBg     : [220, 252, 231] as [number,number,number],
  greenText   : [ 21, 128,  61] as [number,number,number],
};

const getCompanyHeaderLines = (company: any): string[] => {
  const lines: string[] = [];
  if (company.company_name) lines.push(company.company_name);
  if (company.address) lines.push(company.address);
  const panGst = [];
  if (company.pan_number) panGst.push(`PAN No.: ${company.pan_number}`);
  if (company.gst_number) panGst.push(`GST No.: ${company.gst_number}`);
  if (panGst.length) lines.push(panGst.join(' | '));
  const contact = [];
  if (company.phone_number) contact.push(`Mobile: ${company.phone_number}`);
  if (company.email_address) contact.push(`Email: ${company.email_address}`);
  if (contact.length) lines.push(contact.join(' | '));
  return lines;
};

const getTermsAndConditions = (company: any): string[] => {
  return Object.keys(company)
    .filter(k => k.startsWith('footer') && company[k])
    .map((k, i) => `${i + 1}. ${company[k]}`);
};

const formatDate = (d: string | Date): string => {
  try {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return String(d).slice(0, 10);
  }
};

export const generateSaleInvoicePDF = (header: any, items: any[], company: any): jsPDF => {
  const doc = new jsPDF('p', 'mm', 'a4');

  const PW = 210;
  const PH = 297;
  const ML = 14;
  const MR = 196;
  const CW = MR - ML;

  const setFg = (c: [number,number,number]) => doc.setTextColor(...c);
  const setBg = (c: [number,number,number]) => doc.setFillColor(...c);
  const setLn = (c: [number,number,number]) => doc.setDrawColor(...c);

  const fillRect = (x: number, y: number, w: number, h: number, color: [number,number,number]) => {
    setBg(color); doc.rect(x, y, w, h, 'F');
  };
  const strokeRect = (x: number, y: number, w: number, h: number, color: [number,number,number], lw = 0.3) => {
    setLn(color); doc.setLineWidth(lw); doc.rect(x, y, w, h, 'S');
  };
  const hLine = (y: number, x1 = ML, x2 = MR, color: [number,number,number] = C.borderLight, lw = 0.3) => {
    setLn(color); doc.setLineWidth(lw); doc.line(x1, y, x2, y);
  };
  const txt = (str: any, x: number, y: number, opts: { size?: number; color?: [number,number,number]; bold?: boolean; align?: 'left'|'center'|'right' } = {}) => {
    const { size = 9, color = C.bodyText, bold = false, align = 'left' } = opts;
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    setFg(color);
    doc.text(String(str ?? '-'), x, y, { align });
  };

  // ── Background ─────────────────────────────────────────────
  fillRect(0, 0, PW, PH, C.pageBg);
  fillRect(ML - 2, 0, CW + 4, PH, C.white);
  fillRect(0, 0, PW, 2.5, C.accent);

  // ── Header ─────────────────────────────────────────────────
  let y = 9;
  const pillW = 48;
  const pillX = (PW - pillW) / 2;
  fillRect(pillX, y - 0.5, pillW, 6.5, C.accentLight);
  setLn(C.accentMid); doc.setLineWidth(0.3); doc.rect(pillX, y - 0.5, pillW, 6.5, 'S');
  txt('GST INVOICE', PW / 2, y + 4, { size: 7.5, color: C.accent, bold: true, align: 'center' });
  
  if (invoiceImages.logoLeft) {
    doc.addImage(invoiceImages.logoLeft, 'JPEG', ML, y, 32, 16);
  }
  if (invoiceImages.logoRight) {
    doc.addImage(invoiceImages.logoRight, 'PNG', MR - 32, y, 32, 16);
  }
  
  y += 10;

  const headerLines = getCompanyHeaderLines(company);
  txt(headerLines[0] ?? 'Company Name', PW / 2, y, { size: 16, color: C.headingText, bold: true, align: 'center' });
  y += 6;
  if (headerLines[1]) { txt(headerLines[1], PW / 2, y, { size: 8.5, color: C.labelText, align: 'center' }); y += 5; }
  if (headerLines[2]) { txt(headerLines[2], PW / 2, y, { size: 8.5, color: C.labelText, align: 'center' }); y += 5; }
  txt('Authorized Service Center', PW / 2, y, { size: 8, color: C.accent, bold: true, align: 'center' });
  y += 5;
  hLine(y, ML, MR, C.borderLight, 0.4);
  y += 6;

  // ── Invoice meta bar ───────────────────────────────────────
  fillRect(ML, y, CW, 17, C.accentLight);
  strokeRect(ML, y, CW, 17, C.accentMid, 0.3);
  const invoiceNo   = `${header.book_code}${header.vouch_no}`;
  const invoiceDate = formatDate(header.vouch_date);
  txt('INVOICE NO',  ML + 4,  y + 5.5, { size: 6.5, color: C.labelText, bold: true });
  txt(invoiceNo,     ML + 4,  y + 12,  { size: 10,  color: C.accent,    bold: true });
  txt('DATE',        ML + 56, y + 5.5, { size: 6.5, color: C.labelText, bold: true });
  txt(invoiceDate,   ML + 56, y + 12,  { size: 9,   color: C.headingText });
  txt('TECHNICIAN',            ML + 104, y + 5.5, { size: 6.5, color: C.labelText, bold: true });
  txt(header.technician_name ?? '-', ML + 104, y + 12, { size: 9, color: C.headingText });
  txt('STATUS', ML + 155, y + 5.5, { size: 6.5, color: C.labelText, bold: true });
  fillRect(ML + 155, y + 7, 24, 6, C.greenBg);
  txt('PAID', ML + 167, y + 11.5, { size: 7.5, color: C.greenText, bold: true, align: 'center' });
  y += 23;

  // ── Party cards ────────────────────────────────────────────
  const cardH = 30;
  const halfW = (CW - 4) / 2;
  strokeRect(ML, y, halfW, cardH, C.borderLight, 0.3);
  fillRect(ML, y, 2.5, cardH, C.accent);
  txt('BILL TO',          ML + 6, y + 6,  { size: 6.5, color: C.accent,     bold: true });
  txt(header.party_name,  ML + 6, y + 12, { size: 10,  color: C.headingText, bold: true });
  txt('GST :',            ML + 6, y + 18, { size: 7,   color: C.labelText,   bold: true });
  txt(header.party_gst ?? '-', ML + 19, y + 18, { size: 8, color: C.bodyText });
  txt('Phone :',          ML + 6, y + 24, { size: 7,   color: C.labelText,   bold: true });
  txt(header.party_phone ?? '-', ML + 22, y + 24, { size: 8, color: C.bodyText });
  const RX = ML + halfW + 4;
  strokeRect(RX, y, halfW, cardH, C.borderLight, 0.3);
  fillRect(RX, y, 2.5, cardH, C.accentMid);
  txt('INVOICE DETAILS', RX + 6, y + 6,  { size: 6.5, color: C.labelText, bold: true });
  txt('Email :',          RX + 6, y + 13, { size: 7,   color: C.labelText, bold: true });
  txt(header.party_email ?? '-', RX + 21, y + 13, { size: 8, color: C.bodyText });
  txt('Created :',        RX + 6, y + 19, { size: 7,   color: C.labelText, bold: true });
  txt(invoiceDate,        RX + 25, y + 19, { size: 8,   color: C.bodyText });
  txt('Doc Type :',       RX + 6, y + 25, { size: 7,   color: C.labelText, bold: true });
  txt('Tax Invoice',      RX + 28, y + 25, { size: 8,   color: C.bodyText });
  y += cardH + 8;

  // ── Item table ─────────────────────────────────────────────
  autoTable(doc, {
    startY : y,
    margin : { left: ML, right: ML },
    theme  : 'plain',
    styles : { fontSize: 8, cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 }, textColor: C.bodyText, lineColor: C.borderLight, lineWidth: 0.25, font: 'helvetica' },
    headStyles : { fillColor: C.accent, textColor: C.white, fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 4.5, bottom: 4.5, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: C.rowAlt },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8  },
      1: { cellWidth: 54 },
      2: { halign: 'right',  cellWidth: 18 },
      3: { halign: 'right',  cellWidth: 22 },
      4: { halign: 'right',  cellWidth: 20 },
      5: { halign: 'right',  cellWidth: 18 },
      6: { halign: 'right',  cellWidth: 18 },
      7: { halign: 'right',  cellWidth: 24, fontStyle: 'bold' },
    },
    head: [['#', 'Item Description (HSN)', 'MRP (Rs.)', 'Unit Price x Qty', 'Basic Amt', 'SGST', 'CGST', 'Net Amount']],
    body: items.map((item: any, i: number) => [
      i + 1,
      `${item.item_name}\n(HSN: ${item.hsn_code})`,
      Number(item.rate).toFixed(2),
      `${Number(item.rate).toFixed(2)} x ${item.qty}`,
      Number(item.basic_amt).toFixed(2),
      (item.tax_amt / 2).toFixed(2),
      (item.tax_amt / 2).toFixed(2),
      Number(item.net_amt).toFixed(2),
    ]),
    foot: [[
      { content: '', colSpan: 3, styles: { fillColor: C.accentLight as any } },
      { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: C.accentLight as any, textColor: C.accent as any } },
      { content: Number(header.total_basic).toFixed(2), styles: { fontStyle: 'bold', halign: 'right', fillColor: C.accentLight as any, textColor: C.headingText as any } },
      { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: 'bold', halign: 'right', fillColor: C.accentLight as any, textColor: C.headingText as any } },
      { content: (header.total_tax / 2).toFixed(2),     styles: { fontStyle: 'bold', halign: 'right', fillColor: C.accentLight as any, textColor: C.headingText as any } },
      { content: `Rs. ${Number(header.net_amount).toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: C.accent as any, textColor: C.white as any } },
    ]],
    footStyles: { fillColor: C.accentLight as any, textColor: C.headingText as any, fontStyle: 'bold', fontSize: 8.5 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Bottom row: Bank + Summary ──────────────────────────────
  const BOT_H = 46;
  const BANK_W = 82;
  const GAP = 4;
  const AMT_W = CW - BANK_W - GAP;
  const AMT_X = ML + BANK_W + GAP;
  const AMT_R = AMT_X + AMT_W - 4;

  strokeRect(ML, y, BANK_W, BOT_H, C.borderLight, 0.3);
  fillRect(ML, y, BANK_W, 7.5, C.accentLight);
  hLine(y + 7.5, ML, ML + BANK_W, C.accentMid, 0.35);
  txt('BANK DETAILS', ML + BANK_W / 2, y + 5.2, { size: 7.5, color: C.accent, bold: true, align: 'center' });
  let bly = y + 14;
  const bankRow = (lbl: string, val: string) => {
    txt(lbl, ML + 4, bly, { size: 7, color: C.labelText, bold: true });
    txt(String(val ?? '-').toUpperCase(), ML + 30, bly, { size: 7.5, color: C.headingText });
    bly += 6.2;
  };
  bankRow('BANK NAME :', company.bank_name);
  bankRow('A/C NO :',    company.account_number);
  bankRow('IFSC CODE :', company.ifsc_code);
  bankRow('BRANCH :',    company.branch_name ?? '');

  strokeRect(AMT_X, y, AMT_W, BOT_H, C.borderLight, 0.3);
  fillRect(AMT_X, y, AMT_W, 7.5, C.accentLight);
  hLine(y + 7.5, AMT_X, AMT_X + AMT_W, C.accentMid, 0.35);
  txt('AMOUNT SUMMARY', AMT_X + AMT_W / 2, y + 5.2, { size: 7.5, color: C.accent, bold: true, align: 'center' });
  let sy = y + 14;
  const amtRow = (lbl: string, val: string) => {
    txt(lbl, AMT_X + 4, sy, { size: 8, color: C.bodyText });
    txt(`Rs. ${val}`, AMT_R, sy, { size: 8, color: C.headingText, align: 'right' });
    sy += 6.2;
  };
  amtRow('Sub Total',  Number(header.total_basic).toFixed(2));
  amtRow('SGST (Tax)', (header.total_tax / 2).toFixed(2));
  amtRow('CGST (Tax)', (header.total_tax / 2).toFixed(2));
  hLine(sy - 2, AMT_X + 3, AMT_X + AMT_W - 3, C.borderLight, 0.3);
  sy += 2;
  fillRect(AMT_X, sy - 3, AMT_W, 11, C.accent);
  txt('GRAND TOTAL', AMT_X + 4, sy + 4.5, { size: 8.5, color: C.white, bold: true });
  txt(`Rs. ${Number(header.net_amount).toFixed(2)}`, AMT_R, sy + 4.5, { size: 8.5, color: C.white, bold: true, align: 'right' });
  y += BOT_H + 8;

  // ── Terms & Conditions ─────────────────────────────────────
  hLine(y, ML, MR, C.borderLight, 0.3); y += 5;
  fillRect(ML, y - 1.5, 50, 7, C.accentLight);
  strokeRect(ML, y - 1.5, 50, 7, C.accentMid, 0.25);
  txt('TERMS & CONDITIONS', ML + 25, y + 3.5, { size: 7, color: C.accent, bold: true, align: 'center' });
  
  if (invoiceImages.qrCode) {
    doc.addImage(invoiceImages.qrCode, 'JPEG', MR - 24, y - 5, 24, 24);
  }

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setFg(C.bodyText);
  getTermsAndConditions(company).forEach((line, idx) => {
    if (y < 272) {
      const cleanLine = line.replace(/^\s*\d+[.)]\s*/, '');
      doc.text(`${idx + 1}.  ${cleanLine}`, ML + 2, y);
      y += 5.2;
    }
  });

  // ── Footer bar ─────────────────────────────────────────────
  const FY = 285;
  fillRect(0, FY, PW, 12, C.accent);
  fillRect(0, FY, PW, 0.8, C.accentMid);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setFg(C.accentLight);
  doc.text('This is a computer-generated invoice and does not require a physical signature.', PW / 2, FY + 5.5, { align: 'center' });
  doc.text(`${company.company_name ?? ''}   |   GST: ${company.gst_no ?? ''}`, PW / 2, FY + 9.8, { align: 'center' });

  return doc;
};
