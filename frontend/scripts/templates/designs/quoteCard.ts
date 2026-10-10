import { DocBuilder } from '../kit'
import type { TemplateDesign } from '../registry'

// Quiet and neutral: beige paper, one serif, one accent, and room to breathe.
const BEIGE = '#ede4d8'
const INK = '#2b2420'
const MUTED = '#6e6259'
const ACCENT = '#a4502f'

export const quoteCard: TemplateDesign = {
  slug: 'serif-quote-card',
  title: 'Serif quote card',
  category: 'social-media',
  tags: ['quote', 'instagram', 'minimal', 'neutral', 'typography'],
  description: 'A calm, neutral quote post: an oversized quotation mark, a serif quote with plenty of space and a small author line.',
  preset: 'instagram-post',
  build() {
    const doc = new DocBuilder(this.slug, { width: 1080, height: 1080, unit: 'px', presetId: 'instagram-post' })
    const p = doc.page('Quote', { type: 'solid', color: BEIGE })

    p.text({ name: 'Quotation mark', x: 92, y: 120, w: 300, text: '“', font: 'lora', bold: true, size: 360, color: ACCENT, on: BEIGE, lh: 1, decorative: true, lines: 1 })
    p.text({ name: 'Quote', x: 110, y: 400, w: 860, text: 'Good design does not shout. It quietly makes the next step feel obvious.', font: 'lora', italic: true, size: 64, color: INK, on: BEIGE, lh: 1.25, lines: 3 })

    p.line({ name: 'Rule', x1: 112, y1: 720, x2: 196, y2: 720, color: ACCENT, width: 4 })
    p.text({ name: 'Author', x: 110, y: 750, w: 700, text: 'Maya Okafor', font: 'archivo', bold: true, size: 30, color: INK, on: BEIGE, spacing: 160, upper: true, lines: 1 })
    p.text({ name: 'Role', x: 110, y: 796, w: 700, text: 'Creative director, Okafor Studio', font: 'archivo', size: 26, color: MUTED, on: BEIGE, lines: 1 })

    p.text({ name: 'Handle', x: 560, y: 980, w: 410, text: '@okafor.studio', font: 'archivo', size: 24, color: MUTED, on: BEIGE, align: 'right', spacing: 60, lines: 1 })
    return doc
  },
}
