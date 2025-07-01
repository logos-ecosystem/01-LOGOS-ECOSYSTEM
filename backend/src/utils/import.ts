import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

export async function importFromCSV(buffer: Buffer): Promise<any[]> {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true
  });
  return records;
}

// Alias for compatibility
export const parseCSV = importFromCSV;

export async function importFromExcel(buffer: Buffer): Promise<any[]> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

export async function importFromJSON(buffer: Buffer): Promise<any[]> {
  const jsonString = buffer.toString('utf-8');
  return JSON.parse(jsonString);
}