import * as XLSX from 'xlsx';

/**
 * Exports data array into a formatted .xlsx Excel file WITHOUT the artificial 'Row #' column
 * @param {Array} columns - The defined column schemas [{ id, name, type }]
 * @param {Array} records - The entered row objects
 * @param {string} fileName - Suggested file name without extension
 */
export const exportToExcel = (columns, records, fileName = 'Data_Export') => {
  if (!columns || columns.length === 0) {
    alert('No columns defined to export.');
    return;
  }

  // 1. Transform records into key-value pairs matching ONLY user-defined column names (No Row #)
  const formattedData = records.map((record) => {
    const row = {};
    columns.forEach(col => {
      let val = record[col.id];
      if (val === undefined || val === null) {
        val = '';
      } else if (col.type === 'number') {
        val = val === '' ? '' : Number(val);
      } else if (col.type === 'boolean') {
        val = val ? 'YES' : 'NO';
      }
      row[col.name] = val;
    });
    return row;
  });

  // If no rows yet, export blank header row
  const exportPayload = formattedData.length > 0 ? formattedData : [
    columns.reduce((acc, col) => ({ ...acc, [col.name]: '' }), {})
  ];

  // 2. Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportPayload);

  // 3. Auto-fit column widths strictly based on user columns
  const colKeys = columns.map(c => c.name);
  worksheet['!cols'] = colKeys.map(key => {
    let maxLen = key.length;
    exportPayload.forEach(row => {
      const cellVal = row[key] ? String(row[key]) : '';
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
  });

  // 4. Create workbook and trigger download
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Records');

  const cleanFileName = (fileName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Data_Export') + '.xlsx';
  XLSX.writeFile(workbook, cleanFileName);
};
