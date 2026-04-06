import sharp from 'sharp'
import { PDFParse } from 'pdf-parse'

// Extract all text content from a PDF buffer
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdfBuffer })
  const result = await parser.getText()
  await parser.destroy()
  return result.text
}

// Render first page of PDF as a PNG buffer (for thumbnail)
export async function renderPDFThumbnail(pdfBuffer: Buffer): Promise<Buffer> {
  const parser = new PDFParse({ data: pdfBuffer })
  const result = await parser.getScreenshot({ desiredWidth: 800, partial: [1] })
  await parser.destroy()
  const page = result.pages[0]
  if (!page?.data) throw new Error('Failed to render PDF thumbnail')
  return page.data as Buffer
}

export async function imageToBase64(imageBuffer: Buffer): Promise<{ base64: string; mimeType: string }> {
  // Normalize to JPEG, max 2048px on longest side (reduces token cost)
  const processed = await sharp(imageBuffer)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer()

  return {
    base64: processed.toString('base64'),
    mimeType: 'image/jpeg',
  }
}

export function computeFileHash(buffer: Buffer): string {
  const { createHash } = require('crypto')
  return createHash('sha256').update(buffer).digest('hex')
}
