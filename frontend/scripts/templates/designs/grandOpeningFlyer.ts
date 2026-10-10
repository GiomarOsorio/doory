import { photoBackdrop } from '../decor'
import { DocBuilder } from '../kit'
import { INK, MUTED, RED, WHITE } from '../palette'
import type { TemplateDesign } from '../registry'

const W = 816
const H = 1056
const GOLD = '#ffd23f'
const PEACH = '#ffd9a0'

export const grandOpeningFlyer: TemplateDesign = {
  slug: 'grand-opening-flyer',
  title: 'Grand opening flyer',
  category: 'flyers',
  tags: ['flyer', 'grand opening', 'cafe', 'shop', 'local business', 'print'],
  description: 'A US Letter flyer for a new shop or cafe: striped awning, big serif headline, photo slot, details and a coupon bar.',
  preset: 'letter',
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'in', presetId: 'letter' })
    const p = doc.page('Flyer', { type: 'solid', color: RED[50] })

    // Awning: eight stripes, each with a scalloped lower edge.
    const stripe = W / 8
    const awning = Array.from({ length: 8 }, (_, i) => {
      const x0 = i * stripe
      const x1 = x0 + stripe
      const r = stripe / 2
      return p.path({ name: `Awning stripe ${i + 1}`, d: `M ${x0} 0 H ${x1} V 112 A ${r} ${r} 0 0 1 ${x0} 112 Z`, fill: i % 2 === 0 ? RED[600] : WHITE })
    })
    p.group('Awning', awning, { locked: true })

    // Headline.
    p.text({ name: 'Eyebrow', x: 70, y: 196, w: 480, text: 'You are invited to our', font: 'poppins', bold: true, size: 16, color: RED[700], on: RED[50], spacing: 240, upper: true, lines: 1 })
    p.text({ name: 'Headline', x: 70, y: 222, w: 520, text: 'Grand', font: 'playfair', bold: true, size: 112, color: INK, on: RED[50], lh: 1, lines: 1 })
    p.text({ name: 'Headline italic', x: 70, y: 330, w: 520, text: 'Opening', font: 'playfair', bold: true, italic: true, size: 112, color: RED[600], on: RED[50], lh: 1, lines: 1 })
    p.text({ name: 'Tagline', x: 70, y: 474, w: 430, text: 'Fresh coffee, warm pastries and a seat by the window. Come and say hello.', font: 'poppins', size: 19, color: MUTED, on: RED[50], lh: 1.5, lines: 2 })

    // Photo slot with its stand-in picture.
    photoBackdrop(p, {
      name: 'Photo backdrop',
      box: { x: 70, y: 556, w: 676, h: 224 },
      shape: { kind: 'rect', radius: 28 },
      tones: { sky: ['#ffeedd', PEACH], sun: RED[50], hillFar: '#ffb199', hillNear: RED[400] },
    })
    p.placeholder({ name: 'Shop photo', x: 70, y: 556, w: 676, h: 224, mask: 'rounded', maskRadius: 28 / 224 })

    // Offer burst, overlapping the corner of the headline area.
    p.star({ name: 'Offer burst', cx: 650, cy: 330, size: 210, points: 20, innerRatio: 0.9, fill: GOLD, angle: 10 })
    p.text({ name: 'Offer value', x: 550, y: 278, w: 200, text: 'Free', font: 'playfair', bold: true, size: 50, color: INK, on: GOLD, align: 'center', lh: 1, lines: 1 })
    p.text({ name: 'Offer item', x: 550, y: 332, w: 200, text: 'coffee', font: 'poppins', bold: true, size: 22, color: INK, on: GOLD, align: 'center', spacing: 200, upper: true, lines: 1 })
    p.text({ name: 'Offer terms', x: 575, y: 364, w: 150, text: 'for our first 100 guests', font: 'poppins', size: 13, color: INK, on: GOLD, align: 'center', lines: 1 })

    // Details.
    const cols = [
      { icon: 'calendar' as const, label: 'When', value: 'Saturday 12 July', sub: 'Doors open at 9 AM' },
      { icon: 'clock' as const, label: 'Opening day', value: '9 AM – 6 PM', sub: 'Live music at noon' },
      { icon: 'pin' as const, label: 'Where', value: '24 Orchard Lane', sub: 'Corner Bloom Café' },
    ]
    cols.forEach((col, i) => {
      const x = 70 + i * 232
      p.icon({ name: `${col.label} icon`, icon: col.icon, x, y: 818, size: 30, color: RED[600], width: 2.2 })
      p.text({ name: `${col.label} label`, x: x + 42, y: 816, w: 180, text: col.label, font: 'poppins', bold: true, size: 12, color: RED[700], on: RED[50], spacing: 200, upper: true, lines: 1 })
      p.text({ name: `${col.label} value`, x: x + 42, y: 834, w: 180, text: col.value, font: 'poppins', bold: true, size: 16, color: INK, on: RED[50], lines: 1 })
      p.text({ name: `${col.label} note`, x: x + 42, y: 858, w: 180, text: col.sub, font: 'poppins', size: 13, color: MUTED, on: RED[50], lines: 1 })
      if (i > 0) p.line({ name: `Divider ${i}`, x1: x - 18, y1: 818, x2: x - 18, y2: 884, color: RED[200], width: 2 })
    })

    // Coupon bar and footer.
    p.rect({ name: 'Coupon bar', x: 70, y: 920, w: 676, h: 72, fill: RED[600], radius: 36 })
    p.text({ name: 'Coupon', x: 70, y: 920 + 21, w: 676, text: 'Bring this flyer for a free pastry with any drink', font: 'poppins', bold: true, size: 20, color: WHITE, on: RED[600], align: 'center', lines: 1 })
    p.text({ name: 'Website', x: 70, y: 1008, w: 676, text: 'cornerbloom.example  ·  @cornerbloomcafe', font: 'poppins', size: 14, color: MUTED, on: RED[50], align: 'center', spacing: 40, lines: 1 })
    return doc
  },
}
