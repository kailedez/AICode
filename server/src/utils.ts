export function nowIso() {
  return new Date().toISOString()
}

export function createUid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

export function createRequestId() {
  return crypto.randomUUID().replace(/-/g, '')
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function summarize(text: string | null, maxLength = 120) {
  if (!text) return null
  return text.slice(0, maxLength)
}

export function nextNumericId(items: Array<{ id: number }>) {
  return items.length === 0 ? 1 : Math.max(...items.map((item) => item.id)) + 1
}
