import { DocBuilder } from '../kit'
import type { IconName } from '../icons'
import type { TemplateDesign } from '../registry'

// Type-first and minimal: off-white and ink with one accent, and a giant initial on the back.
const W = 336
const H = 192
const PAPER = '#f4f1ea'
const INK = '#141414'
const MUTED = '#55504a'
const ACCENT = '#ff5a1f'
const GREY = '#bdb7ae'

export const businessCard: TemplateDesign = {
  slug: 'clean-business-card',
  title: 'Clean business card',
  category: 'business',
  tags: ['business card', 'contact', 'print', 'minimal', 'personal brand'],
  description: 'A type-first two-sided business card: your name large on the front with the contact details, and a giant initial with a QR code on the back.',
  preset: 'business-card',
  async build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'px', presetId: 'business-card' })

    // Front.
    const front = doc.page('Front', { type: 'solid', color: PAPER })
    front.rect({ name: 'Accent', x: 24, y: 26, w: 22, h: 6, fill: ACCENT })
    front.text({ name: 'Name', x: 22, y: 40, w: 290, text: 'Jordan Ellis', font: 'oswald', bold: true, size: 30, color: INK, on: PAPER, upper: true, lh: 1.1, lines: 1 })
    front.text({ name: 'Role', x: 24, y: 80, w: 290, text: 'Product designer', font: 'archivo', bold: true, size: 9, color: MUTED, on: PAPER, spacing: 260, upper: true, lines: 1 })
    const rows: { icon: IconName; text: string }[] = [
      { icon: 'phone', text: '+1 555 0142' },
      { icon: 'mail', text: 'jordan@yourcompany.example' },
      { icon: 'globe', text: 'yourcompany.example' },
    ]
    rows.forEach((row, i) => {
      const y = 116 + i * 18
      front.icon({ name: `${row.text} icon`, icon: row.icon, x: 24, y: y + 1, size: 10, color: ACCENT, width: 2.2 })
      front.text({ name: row.text, x: 40, y, w: 270, text: row.text, font: 'archivo', size: 9, color: INK, on: PAPER, lines: 1 })
    })

    // Back.
    const back = doc.page('Back', { type: 'solid', color: INK })
    back.text({ name: 'Initial', x: 6, y: -34, w: 220, text: 'J', font: 'oswald', bold: true, size: 250, color: ACCENT, on: INK, lh: 1, decorative: true, lines: 1 })
    back.text({ name: 'Company', x: 150, y: 28, w: 162, text: 'Your Company', font: 'oswald', bold: true, size: 16, color: PAPER, on: INK, upper: true, align: 'right', spacing: 60, lines: 1 })
    back.text({ name: 'Website', x: 150, y: 50, w: 162, text: 'yourcompany.example', font: 'archivo', size: 9, color: GREY, on: INK, align: 'right', lines: 1 })
    await back.qr({ name: 'QR code', x: 252, y: 108, size: 60, spec: { text: 'https://example.com/', fg: INK, bg: PAPER } })
    return doc
  },
}
