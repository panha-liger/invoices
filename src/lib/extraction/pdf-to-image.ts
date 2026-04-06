import sharp from 'sharp'
import pdfParse from 'pdf-parse'

// Extract all text content from a PDF buffer using pdf-parse v1 (works on Vercel)
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const data = await pdfParse(pdfBuffer)
  return data.text
}

// Thumbnail generation requires native canvas — not supported in serverless
export async function renderPDFThumbnail(_pdfBuffer: Buffer): Promise<Buffer> {
  throw new Error('PDF thumbnail generation not supported in serverless environment')
}

export async function imageToBase64(imageBuffer: Buffer): Promise<{ base64: string; mimeType: string }> {
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
