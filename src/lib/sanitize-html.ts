/**
 * Server-side HTML sanitization for user-generated markdown content.
 * Strips dangerous tags/attributes while preserving safe formatting.
 */

const ALLOWED_TAGS = new Set([
  'h2', 'h3', 'h4', 'p', 'strong', 'em', 'li', 'ul', 'ol',
  'a', 'br', 'span', 'blockquote', 'code', 'pre',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  span: new Set(['class']),
  h2: new Set(['class']),
  h3: new Set(['class']),
  li: new Set(['class']),
  p: new Set(['class']),
  code: new Set(['class']),
  pre: new Set(['class']),
}

/**
 * Strips HTML tags/attributes not in the allowlist.
 * This is a simple regex-based sanitizer suitable for markdown-rendered HTML
 * where the input comes from admin-authored blog content (not arbitrary user HTML).
 */
export function sanitizeHtml(html: string): string {
  // Remove <script>, <style>, <iframe>, <object>, <embed>, <form> blocks entirely
  let clean = html.replace(/<(script|style|iframe|object|embed|form|base|meta|link)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  clean = clean.replace(/<(script|style|iframe|object|embed|form|base|meta|link)\b[^>]*\/?>/gi, '')

  // Remove on* event handlers from all tags
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  // Remove javascript: and data: URLs from href/src attributes
  clean = clean.replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""')
  clean = clean.replace(/(href|src)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, '$1=""')

  // Strip disallowed tags but keep their content
  clean = clean.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    const lower = tag.toLowerCase()
    if (!ALLOWED_TAGS.has(lower)) return ''

    // For allowed tags, strip disallowed attributes
    const allowed = ALLOWED_ATTRS[lower]
    if (!allowed) {
      // Tag allowed but no attributes permitted — strip all attrs
      return match.replace(/<([a-z][a-z0-9]*)\s[^>]*>/i, '<$1>')
    }

    // Keep only allowed attributes
    return match.replace(/\s+([a-z-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, (attrMatch, attrName) => {
      return allowed.has(attrName.toLowerCase()) ? attrMatch : ''
    })
  })

  return clean
}
