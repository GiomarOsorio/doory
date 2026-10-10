import { circleInPage } from '../geometry'
import { DocBuilder, type PageBuilder } from '../kit'
import { INK, RED, WHITE } from '../palette'
import type { TemplateDesign } from '../registry'

const W = 336
const H = 192
const PAGE = { x: 0, y: 0, w: W, h: H }

/** The logo placeholder: a ring with a dot, in one colour. */
function mark(p: PageBuilder, cx: number, cy: number, r: number, color: string): void {
  const ring = p.circle({ name: 'Logo ring', cx, cy, r, fill: '#00000000', stroke: color, strokeWidth: r * 0.2 })
  const dot = p.circle({ name: 'Logo dot', cx, cy, r: r * 0.32, fill: color })
  p.group('Logo mark', [ring, dot])
}

export const businessCard: TemplateDesign = {
  slug: 'clean-business-card',
  title: 'Clean business card',
  category: 'business',
  tags: ['business card', 'print', 'contact', 'networking', 'minimal', 'qr code'],
  description: 'A 3.5 x 2 in business card, front and back: name, role and contact rows on the front, logo and a QR code on the back.',
  preset: 'business-card',
  async build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'in', presetId: 'business-card' })

    // Front.
    const front = doc.page('Front', { type: 'solid', color: WHITE })
    front.rect({ name: 'Side band', x: 0, y: 0, w: 92, h: H, fill: RED[600], locked: true })
    mark(front, 46, 96, 24, WHITE)
    front.text({ name: 'Name', x: 116, y: 30, w: 205, text: 'Jordan Ellis', font: 'manrope', bold: true, size: 22, color: INK, on: WHITE, lh: 1.1, lines: 1 })
    front.text({ name: 'Job title', x: 116, y: 60, w: 205, text: 'Product designer', font: 'inter', bold: true, size: 9, color: RED[700], on: WHITE, spacing: 220, upper: true, lines: 1 })
    front.line({ name: 'Rule', x1: 116, y1: 86, x2: 144, y2: 86, color: RED[600], width: 2 })
    const rows = [
      { icon: 'phone' as const, text: '+1 555 0142' },
      { icon: 'mail' as const, text: 'jordan@yourcompany.example' },
      { icon: 'globe' as const, text: 'yourcompany.example' },
      { icon: 'pin' as const, text: '12 Maple Avenue, Lakeside' },
    ]
    rows.forEach((row, i) => {
      const y = 100 + i * 20
      front.icon({ name: `${row.icon} icon`, icon: row.icon, x: 116, y: y - 1, size: 12, color: RED[600], width: 1.2 })
      front.text({ name: `Contact ${i + 1}`, x: 136, y, w: 190, text: row.text, font: 'inter', size: 9.5, color: INK, on: WHITE, lines: 1 })
    })

    // Back.
    const back = doc.page('Back', { type: 'solid', color: RED[600] })
    back.path({ name: 'Corner disc', d: circleInPage(W, H, 120, PAGE), fill: RED[700], locked: true })
    mark(back, 54, 66, 22, WHITE)
    back.text({ name: 'Company name', x: 90, y: 54, w: 160, text: 'Company name', font: 'manrope', bold: true, size: 17, color: WHITE, on: RED[600], lines: 1 })
    back.text({ name: 'Tagline', x: 90, y: 76, w: 160, text: 'Design with intent', font: 'inter', size: 9, color: WHITE, on: RED[600], spacing: 200, upper: true, lines: 1 })
    back.text({ name: 'Scan note', x: 32, y: 136, w: 150, text: 'Scan to see our work', font: 'inter', bold: true, size: 9.5, color: WHITE, on: RED[600], lines: 1 })
    back.rect({ name: 'QR card', x: 232, y: 90, w: 76, h: 76, fill: WHITE, radius: 8 })
    await back.qr({ name: 'QR code', x: 240, y: 98, size: 60, spec: { text: 'https://example.com/', fg: INK, bg: WHITE } })
    back.text({ name: 'Back website', x: 32, y: 152, w: 190, text: 'yourcompany.example', font: 'inter', size: 9.5, color: WHITE, on: RED[600], lines: 1 })
    return doc
  },
}
