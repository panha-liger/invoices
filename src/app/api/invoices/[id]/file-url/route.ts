import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params

  const { data: files, error } = await supabase
    .from('invoice_files')
    .select('storage_path, file_type, file_name')
    .eq('invoice_id', id)
    .order('is_primary', { ascending: false })
    .limit(1)

  if (error || !files?.length) {
    return NextResponse.json({ error: 'No file found' }, { status: 404 })
  }

  const file = files[0]
  const { data: signed, error: signError } = await supabase.storage
    .from('invoices')
    .createSignedUrl(file.storage_path, 60 * 60)

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  return NextResponse.json({
    url: signed.signedUrl,
    file_type: file.file_type,
    file_name: file.file_name,
  })
}
