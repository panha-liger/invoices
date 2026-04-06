export type AccountName = 'RE:AI' | 'neWwave'

export type InvoiceCategory =
  | 'marketing'
  | 'office'
  | 'software'
  | 'inventory'
  | 'logistics'
  | 'other'

export type InvoiceStatus = 'pending' | 'reviewed' | 'approved' | 'rejected'

export type CategorySource = 'ai' | 'manual'

export interface Account {
  id: string
  name: AccountName
  created_at: string
}

export interface Vendor {
  id: string
  name: string
  created_at: string
}

export interface Invoice {
  id: string
  account_id: string
  vendor_id: string | null
  vendor_name_raw: string | null
  invoice_number: string | null
  invoice_date: string
  due_date: string | null
  currency: string
  subtotal: number | null
  tax_amount: number
  tax_included: boolean
  total_amount: number
  category: InvoiceCategory
  category_source: CategorySource
  ai_confidence: number | null
  ai_raw_response: Record<string, unknown> | null
  status: InvoiceStatus
  is_duplicate: boolean
  duplicate_of: string | null
  file_hash: string | null
  thumbnail_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  account?: Account
  vendor?: Vendor
  invoice_files?: InvoiceFile[]
  thumbnail_url?: string | null
  file_url?: string | null
}

export interface InvoiceFile {
  id: string
  invoice_id: string
  storage_path: string
  file_name: string
  file_type: string
  file_size: number | null
  is_primary: boolean
  created_at: string
}

export interface InvoiceEdit {
  id: string
  invoice_id: string
  edited_by: string | null
  field_name: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

export interface Export {
  id: string
  account_id: string | null
  period_year: number
  period_month: number
  storage_path: string | null
  invoice_count: number | null
  total_amount: number | null
  created_by: string | null
  created_at: string
}

// AI extraction result (before saving)
export interface ExtractionResult {
  vendor_name: string
  invoice_number: string | null
  invoice_date: string
  due_date: string | null
  currency: string
  subtotal: number | null
  tax_amount: number
  tax_included: boolean
  total_amount: number
  category: InvoiceCategory
  confidence: number
  notes: string | null
}

export interface DashboardSummary {
  total_amount: number
  invoice_count: number
  by_category: { category: InvoiceCategory; total: number; count: number }[]
  by_month: { month: string; total: number; count: number }[]
  total_tax: number
}
