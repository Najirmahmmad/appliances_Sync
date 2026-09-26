import { Alert, Platform } from 'react-native';

/**
 * Utility to export an array of JSON objects to an Excel file.
 * Native Stub.
 */
export const exportToExcel = (exportData: any[], sheetName: string, filename: string) => {
  if (Platform.OS !== 'web') {
    Alert.alert('Not Supported', 'Excel export is currently supported on the web platform only.');
    return;
  }
};

/**
 * Utility to export an array of JSON objects to a PDF file using autoTable.
 * Native Stub.
 */
export const exportToPDF = (
  title: string,
  subtitle: string,
  head: any[][],
  body: any[][],
  foot?: any[][]
) => {
  if (Platform.OS !== 'web') {
    Alert.alert('Not Supported', 'PDF export is currently supported on the web platform only.');
    return;
  }
};
