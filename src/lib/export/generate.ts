import JSZip from 'jszip'
import Papa from 'papaparse'
import { Invoice } from '@/types'

export function generateCSV(invoices: Invoice[]): string {
  const rows = invoices.map((inv) => ({
    'Invoice ID': inv.id,
    'Vendor': inv.vendor_name_raw || '',
    'Invoice Number': inv.invoice_number || '',
    'Date': inv.invoice_date,
    'Due Date': inv.due_date || '',
    'Currency': inv.currency,
    'Subtotal': inv.subtotal ?? '',
    'Tax Amount': inv.tax_amount,
    'Tax Included': inv.tax_included ? 'Yes' : 'No',
    'Total Amount': inv.total_amount,
    'Category': inv.category,
    'Status': inv.status,
    'Account': inv.account?.name || '',
    'Notes': inv.notes || '',
  }))

  return Papa.unparse(rows)
}

export async function generateExportZip(
  invoices: Invoice[],
  fileBuffers: { name: string; buffer: Buffer }[]
): Promise<Buffer> {
  const zip = new JSZip()

  // Add CSV summary
  const csv = generateCSV(invoices)
  zip.file('summary.csv', csv)

  // Add invoice files
  const invoicesFolder = zip.folder('invoices')!
  for (const { name, buffer } of fileBuffers) {
    invoicesFolder.file(name, buffer)
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }) as Promise<Buffer>
}
