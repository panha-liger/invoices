import OpenAI from 'openai'
import { ExtractionResult, InvoiceCategory } from '@/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a financial document parser. Extract invoice data from the provided image and return ONLY valid JSON with no markdown, no explanation.

Return this exact structure:
{
  "vendor_name": "string",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "currency": "ISO 4217 code e.g. USD, EUR, THB",
  "subtotal": number or null,
  "tax_amount": number,
  "tax_included": boolean,
  "total_amount": number,
  "category": "marketing|office|software|inventory|logistics|other",
  "confidence": 0.0 to 1.0,
  "notes": "string or null"
}

Rules:
- invoice_date must be in YYYY-MM-DD format
- tax_included: true if tax is baked into the total, false if added on top
- tax_amount: 0 if no tax found
- confidence: your certainty across ALL fields (1.0 = fully certain)
- category: infer from vendor name and line items
- NEVER guess monetary amounts — use null if unclear
- total_amount is required, use the final payable amount`

export async function extractInvoiceFromText(text: string): Promise<ExtractionResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Extract all invoice data from the following PDF text:\n\n${text}` },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No response from OpenAI')

  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return validateExtraction(JSON.parse(cleaned))
  } catch {
    throw new Error(`Failed to parse OpenAI response: ${content}`)
  }
}

export async function extractInvoiceFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractionResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: 'Extract all invoice data from this image.',
          },
        ],
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No response from OpenAI')

  // Strip markdown code blocks if model wrapped the JSON
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed: ExtractionResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Failed to parse OpenAI response: ${content}`)
  }

  return validateExtraction(parsed)
}

function validateExtraction(raw: Partial<ExtractionResult>): ExtractionResult {
  const validCategories: InvoiceCategory[] = [
    'marketing', 'office', 'software', 'inventory', 'logistics', 'other',
  ]

  return {
    vendor_name: raw.vendor_name || 'Unknown Vendor',
    invoice_number: raw.invoice_number || null,
    invoice_date: raw.invoice_date || new Date().toISOString().split('T')[0],
    due_date: raw.due_date || null,
    currency: raw.currency || 'USD',
    subtotal: raw.subtotal ?? null,
    tax_amount: raw.tax_amount ?? 0,
    tax_included: raw.tax_included ?? false,
    total_amount: raw.total_amount ?? 0,
    category: validCategories.includes(raw.category as InvoiceCategory)
      ? (raw.category as InvoiceCategory)
      : 'other',
    confidence: Math.min(1, Math.max(0, raw.confidence ?? 0.5)),
    notes: raw.notes || null,
  }
}
