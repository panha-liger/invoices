import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractInvoiceFromImage, extractInvoiceFromText } from '@/lib/extraction/extract'
import { imageToBase64, extractTextFromPDF, renderPDFThumbnail, computeFileHash } from '@/lib/extraction/pdf-to-image'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const accountId = formData.get('account_id') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileHash = computeFileHash(buffer)
    const isPDF = file.type === 'application/pdf'

    // 1. Check for exact file hash duplicate
    const { data: hashDup } = await supabase
      .from('invoices')
      .select('id')
      .eq('file_hash', fileHash)
      .single()

    if (hashDup) {
      return NextResponse.json({
        warning: 'duplicate_file',
        duplicate_of: hashDup.id,
        message: 'This exact file has already been uploaded.',
      }, { status: 409 })
    }

    // 2. Upload original file to Supabase Storage
    const now = new Date()
    const storagePath = `${accountId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    // 3. Extract with GPT-4o
    let extraction
    if (isPDF) {
      const text = await extractTextFromPDF(buffer)
      extraction = await extractInvoiceFromText(text)
    } else {
      const { base64, mimeType } = await imageToBase64(buffer)
      extraction = await extractInvoiceFromImage(base64, mimeType)
    }

    // 4. Upsert vendor
    let vendorId: string | null = null
    if (extraction.vendor_name) {
      const { data: vendor } = await supabase
        .from('vendors')
        .upsert({ name: extraction.vendor_name }, { onConflict: 'name' })
        .select('id')
        .single()
      vendorId = vendor?.id || null
    }

    // 5. Fuzzy duplicate check (same vendor + same month + amount within 1%)
    let isDuplicate = false
    let duplicateOf: string | null = null

    if (vendorId) {
      const monthStart = extraction.invoice_date.substring(0, 7) + '-01'
      const { data: candidates } = await supabase
        .from('invoices')
        .select('id, total_amount')
        .eq('vendor_id', vendorId)
        .gte('invoice_date', monthStart)

      const tolerance = extraction.total_amount * 0.01
      const match = (candidates || []).find(
        (c) => Math.abs(c.total_amount - extraction.total_amount) <= tolerance
      )
      if (match) {
        isDuplicate = true
        duplicateOf = match.id
      }
    }

    // 6. Create invoice record (status: pending — awaiting human review)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        account_id: accountId,
        vendor_id: vendorId,
        vendor_name_raw: extraction.vendor_name,
        invoice_number: extraction.invoice_number,
        invoice_date: extraction.invoice_date,
        due_date: extraction.due_date,
        currency: extraction.currency,
        subtotal: extraction.subtotal,
        tax_amount: extraction.tax_amount,
        tax_included: extraction.tax_included,
        total_amount: extraction.total_amount,
        category: extraction.category,
        category_source: 'ai',
        ai_confidence: extraction.confidence,
        ai_raw_response: extraction as unknown as Record<string, unknown>,
        status: 'pending',
        is_duplicate: isDuplicate,
        duplicate_of: duplicateOf,
        file_hash: fileHash,
        notes: extraction.notes,
      })
      .select()
      .single()

    if (invoiceError) throw new Error(`Invoice insert failed: ${invoiceError.message}`)

    // 7. Create file record
    await supabase.from('invoice_files').insert({
      invoice_id: invoice.id,
      storage_path: storagePath,
      file_name: file.name,
      file_type: file.type,
      file_size: buffer.length,
      is_primary: true,
    })

    // 8. Generate and upload PDF thumbnail
    if (isPDF) {
      try {
        const thumbnailBuffer = await renderPDFThumbnail(buffer)
        const thumbnailPath = storagePath.replace(/\.pdf$/i, '_thumb.png')
        const { error: thumbError } = await supabase.storage
          .from('invoices')
          .upload(thumbnailPath, thumbnailBuffer, { contentType: 'image/png', upsert: false })

        if (!thumbError) {
          await supabase.from('invoices').update({ thumbnail_path: thumbnailPath }).eq('id', invoice.id)
          invoice.thumbnail_path = thumbnailPath
        }
      } catch (thumbErr) {
        // Thumbnail failure is non-fatal — invoice was already saved
        console.warn('[upload] thumbnail generation failed:', thumbErr)
      }
    }

    return NextResponse.json({
      invoice,
      extraction,
      is_duplicate: isDuplicate,
      duplicate_of: duplicateOf,
    })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
