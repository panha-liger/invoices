import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      account:accounts(id, name),
      vendor:vendors(id, name),
      invoice_files(*)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // Signed URL for thumbnail
  let thumbnail_url: string | null = null
  if (data.thumbnail_path) {
    const { data: signed } = await supabase.storage
      .from('invoices')
      .createSignedUrl(data.thumbnail_path, 60 * 60)
    thumbnail_url = signed?.signedUrl ?? null
  }

  // Signed URL for the primary file (PDF/image viewer)
  let file_url: string | null = null
  const primaryFile = data.invoice_files?.find((f: { is_primary: boolean }) => f.is_primary) ?? data.invoice_files?.[0]
  if (primaryFile?.storage_path) {
    const { data: signed } = await supabase.storage
      .from('invoices')
      .createSignedUrl(primaryFile.storage_path, 60 * 60)
    file_url = signed?.signedUrl ?? null
  }

  return NextResponse.json({ ...data, thumbnail_url, file_url })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  const body = await req.json()

  const { data: current } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowedFields = [
    'vendor_name_raw', 'vendor_id', 'invoice_number', 'invoice_date', 'due_date',
    'currency', 'subtotal', 'tax_amount', 'tax_included', 'total_amount',
    'category', 'status', 'notes',
  ]

  const updates: Record<string, unknown> = {}
  const edits: { invoice_id: string; field_name: string; old_value: string | null; new_value: string | null }[] = []

  for (const field of allowedFields) {
    if (field in body && body[field] !== current[field]) {
      updates[field] = body[field]
      if (field === 'category') updates['category_source'] = 'manual'
      edits.push({
        invoice_id: id,
        field_name: field,
        old_value: current[field] !== null ? String(current[field]) : null,
        new_value: body[field] !== null ? String(body[field]) : null,
      })
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: 'No changes' })
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (edits.length > 0) {
    await supabase.from('invoice_edits').insert(edits)
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params

  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Invoice deleted' })
}
