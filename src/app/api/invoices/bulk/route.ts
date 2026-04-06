import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/invoices/bulk  { ids: string[], action: 'approve' | 'reject' | 'delete' }
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const { ids, action } = await req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
  }

  if (action === 'delete') {
    const { error } = await supabase.from('invoices').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ affected: ids.length })
  }

  if (action === 'approve' || action === 'reject') {
    const status = action === 'approve' ? 'approved' : 'rejected'
    const { error } = await supabase.from('invoices').update({ status }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ affected: ids.length })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
