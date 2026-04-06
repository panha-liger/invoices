import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateExportZip } from '@/lib/export/generate'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  try {
    const { account_id, year, month } = await req.json()

    if (!account_id || !year || !month) {
      return NextResponse.json({ error: 'account_id, year, month required' }, { status: 400 })
    }

    const monthStr = String(month).padStart(2, '0')
    const start = `${year}-${monthStr}-01`
    const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`*, account:accounts(id, name), invoice_files(*)`)
      .eq('account_id', account_id)
      .eq('status', 'approved')
      .gte('invoice_date', start)
      .lte('invoice_date', end)
      .order('invoice_date')

    if (error) throw new Error(error.message)
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ error: 'No approved invoices found for this period' }, { status: 404 })
    }

    // Download invoice files from storage
    const fileBuffers: { name: string; buffer: Buffer }[] = []

    for (const invoice of invoices) {
      const primaryFile = invoice.invoice_files?.find((f: { is_primary: boolean }) => f.is_primary)
      if (!primaryFile) continue

      const { data: fileData, error: dlError } = await supabase.storage
        .from('invoices')
        .download(primaryFile.storage_path)

      if (dlError || !fileData) continue

      const ext = primaryFile.file_name.split('.').pop() || 'pdf'
      const safeName = `${invoice.invoice_date}_${(invoice.vendor_name_raw || 'unknown').replace(/[^a-z0-9]/gi, '_')}_${invoice.id.substring(0, 8)}.${ext}`
      fileBuffers.push({ name: safeName, buffer: Buffer.from(await fileData.arrayBuffer()) })
    }

    const zipBuffer = await generateExportZip(invoices, fileBuffers)

    const accountName = (invoices[0]?.account?.name || 'account').replace(/[^a-z0-9]/gi, '_')
    const exportId = crypto.randomUUID()
    const zipPath = `${account_id}/${year}-${monthStr}-${exportId}.zip`

    await supabase.storage.from('exports').upload(zipPath, zipBuffer, {
      contentType: 'application/zip',
    })

    const { data: signedUrl } = await supabase.storage
      .from('exports')
      .createSignedUrl(zipPath, 3600)

    const totalAmount = invoices.reduce((sum: number, inv: { total_amount: number }) => sum + inv.total_amount, 0)

    const { data: exportRecord } = await supabase
      .from('exports')
      .insert({
        account_id,
        period_year: parseInt(year),
        period_month: parseInt(month),
        storage_path: zipPath,
        invoice_count: invoices.length,
        total_amount: totalAmount,
      })
      .select()
      .single()

    return NextResponse.json({
      export: exportRecord,
      download_url: signedUrl?.signedUrl,
      invoice_count: invoices.length,
      total_amount: totalAmount,
      filename: `${accountName}_${year}-${monthStr}.zip`,
    })
  } catch (err) {
    console.error('[export]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    )
  }
}
