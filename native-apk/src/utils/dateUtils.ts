export const formatDisplayDate = (dateString: any): string => {
  if (!dateString) return '';
  
  // Try parsing as ISO or standard date string
  const date = new Date(dateString);
  
  // Check if valid
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // If new Date() failed, try to manually parse DD-MM-YYYY or DD/MM/YYYY
  if (typeof dateString === 'string') {
    const parts = dateString.split(/[-/]/);
    if (parts.length === 3) {
      // Assuming it's already in DD-MM-YYYY format
      // Just normalize the separator to -
      if (parts[2].length === 4) {
         return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
      // If it's YYYY-MM-DD
      if (parts[0].length === 4) {
         return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      }
    }
  }

  // Fallback to original
  return String(dateString).slice(0, 10);
};
