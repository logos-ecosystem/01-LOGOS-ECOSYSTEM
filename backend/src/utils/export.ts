import { Parser } from 'json2csv';
import * as XLSX from 'xlsx';

export function exportToCSV(data: any[], fields?: string[]): string {
  const parser = new Parser({ fields });
  return parser.parse(data);
}

// Alias for compatibility
export const generateCSV = exportToCSV;

export function exportToJSON(data: any[]): string {
  return JSON.stringify(data, null, 2);
}

export function exportToExcel(data: any[], sheetName: string = 'Sheet1'): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Alias for compatibility
export const generateExcel = exportToExcel;

// Generate PDF function
export async function generatePDF(data: any[], title: string = 'Report'): Promise<Buffer> {
  // For now, return a simple implementation
  // In production, you would use a library like puppeteer or pdfkit
  const content = [
    `<h1>${title}</h1>`,
    '<table border="1">',
    '<thead><tr>',
    ...Object.keys(data[0] || {}).map(key => `<th>${key}</th>`),
    '</tr></thead>',
    '<tbody>',
    ...data.map(row => 
      `<tr>${Object.values(row).map(val => `<td>${val}</td>`).join('')}</tr>`
    ),
    '</tbody>',
    '</table>'
  ].join('\n');
  
  return Buffer.from(content, 'utf-8');
}