// @ts-ignore
import * as XLSX from 'xlsx/dist/xlsx.mini.min.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Platform } from 'react-native';

/**
 * Utility to export an array of JSON objects to an Excel file.
 * @param exportData Array of objects representing rows.
 * @param sheetName Name of the sheet.
 * @param filename Name of the file (e.g. 'Report.xlsx').
 */
export const exportToExcel = (exportData: any[], sheetName: string, filename: string) => {
  if (Platform.OS !== 'web') {
    alert('Excel export is currently supported on the web platform only.');
    return;
  }
  
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};

/**
 * Utility to export an array of JSON objects to a PDF file using autoTable.
 * @param title The title of the PDF.
 * @param subtitle Additional information below the title (e.g., date range).
 * @param head Array of column headers.
 * @param body Array of arrays representing rows.
 * @param foot Array representing the footer row (optional).
 */
export const exportToPDF = (
  title: string,
  subtitle: string,
  head: any[][],
  body: any[][],
  foot?: any[][]
) => {
  if (Platform.OS !== 'web') {
    alert('PDF export is currently supported on the web platform only.');
    return;
  }

  const doc = new jsPDF();
  
  doc.setFontSize(14);
  doc.text(title, 14, 20);
  
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, 14, 30);
  }

  autoTable(doc, {
    startY: subtitle ? 40 : 30,
    head,
    body,
    foot,
  });

  window.open(doc.output('bloburl'));
};
