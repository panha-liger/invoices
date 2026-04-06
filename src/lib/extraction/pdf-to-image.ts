import sharp from 'sharp'

// Extract all text content from a PDF buffer using pdfjs-dist (pure JS, works on Vercel)
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // Disable the worker (not needed for server-side use)
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })

  const pdf = await loadingTask.promise
  const textParts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: { str?: string }) => item.str ?? '')
      .join(' ')
    textParts.push(pageText)
  }

  await pdf.destroy()
  return textParts.join('\n')
}

// Thumbnail generation requires native canvas — skip on serverless
export async function renderPDFThumbnail(_pdfBuffer: Buffer): Promise<Buffer> {
  throw new Error('PDF thumbnail generation not supported in serverless environment')
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
