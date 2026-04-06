import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const year = searchParams.get('year') || new Date().getFullYear().toString()

  let query = supabase
    .from('invoices')
    .select('total_amount, tax_amount, category, invoice_date, currency')
    .eq('status', 'approved')
    .gte('invoice_date', `${year}-01-01`)
    .lte('invoice_date', `${year}-12-31`)

  if (accountId) query = query.eq('account_id', accountId)

  const { data: invoices, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invoices) return NextResponse.json({ error: 'No data' }, { status: 404 })

  const totalAmount = invoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const totalTax = invoices.reduce((s, i) => s + (i.tax_amount || 0), 0)

  const categoryMap = new Map<string, { total: number; count: number }>()
  for (const inv of invoices) {
    const entry = categoryMap.get(inv.category) || { total: 0, count: 0 }
    entry.total += inv.total_amount || 0
    entry.count += 1
    categoryMap.set(inv.category, entry)
  }

  const monthMap = new Map<string, { total: number; count: number }>()
  for (const inv of invoices) {
    const month = inv.invoice_date.substring(0, 7)
    const entry = monthMap.get(month) || { total: 0, count: 0 }
    entry.total += inv.total_amount || 0
    entry.count += 1
    monthMap.set(month, entry)
  }

  return NextResponse.json({
    total_amount: totalAmount,
    invoice_count: invoices.length,
    total_tax: totalTax,
    by_category: Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total),
    by_month: Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  })
}
