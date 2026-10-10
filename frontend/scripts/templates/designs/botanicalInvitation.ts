import { DocBuilder } from '../kit'
import { sprig } from '../decor'
import { archPolygon, polygonPath } from '../geometry'
import type { TemplateDesign } from '../registry'

// Quiet luxury: linen paper, a double hairline frame, a soft arch with greenery, script names and an RSVP code.
const W = 480
const H = 672
const LINEN = '#f5f0e6'
const ARCH = '#e4e7da'
const OLIVE = '#2e3a2a'
const SAGE = '#6f8466'
const GOLD = '#a8865a'

export const botanicalInvitation: TemplateDesign = {
  slug: 'botanical-celebration-invitation',
  title: 'Botanical celebration invitation',
  category: 'invitations',
  tags: ['wedding', 'invitation', 'botanical', 'elegant', 'minimal', 'rsvp'],
  description: 'A quiet, elegant 5 x 7 in wedding invitation: linen paper, a soft arch with greenery, script names and an RSVP QR code.',
  preset: '',
  async build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'in' })
    const p = doc.page('Invitation', { type: 'solid', color: LINEN })

    // Frame and arch.
    p.rect({ name: 'Outer frame', x: 16, y: 16, w: W - 32, h: H - 32, fill: '#00000000', stroke: GOLD, strokeWidth: 1.2, locked: true })
    p.rect({ name: 'Inner frame', x: 23, y: 23, w: W - 46, h: H - 46, fill: '#00000000', stroke: GOLD, strokeWidth: 0.6, locked: true })
    p.path({ name: 'Arch', d: polygonPath(archPolygon(110, 58, 260, 300)), fill: ARCH, locked: true })
    sprig(p, { name: 'Greenery', cx: 240, cy: 92, span: 120, leaf: SAGE, berry: GOLD })

    // Names inside the arch.
    p.text({ name: 'Families', x: 110, y: 128, w: 260, text: 'Together with their families', font: 'lora', size: 10, color: OLIVE, on: ARCH, spacing: 220, upper: true, align: 'center', lines: 1 })
    p.text({ name: 'First name', x: 110, y: 154, w: 260, text: 'Ava', font: 'pinyon', size: 72, color: OLIVE, on: ARCH, align: 'center', lh: 1.05, lines: 1 })
    p.text({ name: 'Ampersand', x: 110, y: 228, w: 260, text: '&', font: 'lora', italic: true, size: 28, color: GOLD, on: ARCH, align: 'center', decorative: true, lines: 1 })
    p.text({ name: 'Second name', x: 110, y: 254, w: 260, text: 'Noah', font: 'pinyon', size: 72, color: OLIVE, on: ARCH, align: 'center', lh: 1.05, lines: 1 })

    // The invitation.
    p.text({ name: 'Invitation line', x: 70, y: 384, w: 340, text: 'request the pleasure of your company as they celebrate their wedding', font: 'lora', italic: true, size: 14, color: OLIVE, on: LINEN, align: 'center', lh: 1.45, lines: 2 })
    p.line({ name: 'Date rule', x1: 160, y1: 440, x2: 320, y2: 440, color: GOLD, width: 0.8 })
    p.text({ name: 'Date', x: 40, y: 452, w: 400, text: 'Saturday · 14 June 2027 · half past four', font: 'lora', size: 11.5, color: OLIVE, on: LINEN, spacing: 160, upper: true, align: 'center', lines: 1 })
    p.text({ name: 'Venue', x: 40, y: 480, w: 400, text: 'The Orchard House', font: 'lora', bold: true, size: 17, color: OLIVE, on: LINEN, align: 'center', lines: 1 })
    p.text({ name: 'Address', x: 40, y: 504, w: 400, text: '12 Orchard Lane, Willowbrook', font: 'lora', size: 12, color: '#4f5f48', on: LINEN, align: 'center', lines: 1 })

    // RSVP.
    await p.qr({ name: 'RSVP code', x: 211, y: 540, size: 58, spec: { text: 'https://example.com/rsvp', fg: OLIVE, bg: LINEN } })
    p.text({ name: 'RSVP', x: 40, y: 606, w: 400, text: 'Kindly reply by 1 May', font: 'lora', italic: true, size: 12, color: OLIVE, on: LINEN, align: 'center', lines: 1 })
    return doc
  },
}
