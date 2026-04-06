import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const month = searchParams.get('month') // YYYY-MM
  const duplicatesOnly = searchParams.get('duplicates') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('invoices')
    .select(`
      *,
      account:accounts(id, name),
      vendor:vendors(id, name),
      invoice_files(id, storage_path, file_name, file_type, is_primary)
    `, { count: 'exact' })
    .order('invoice_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (accountId) query = query.eq('account_id', accountId)
  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (duplicatesOnly) query = query.eq('is_duplicate', true)
  if (month) {
    const [year, m] = month.split('-')
    const start = `${year}-${m}-01`
    const end = new Date(parseInt(year), parseInt(m), 0).toISOString().split('T')[0]
    query = query.gte('invoice_date', start).lte('invoice_date', end)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoices: data, total: count, page, limit })
}
