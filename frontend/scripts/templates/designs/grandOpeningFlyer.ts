import { DocBuilder } from '../kit'
import type { TemplateDesign } from '../registry'

// One big coffee photo on top, the name and the news on cream underneath, the details in one row: the way café flyers
// that people actually pin up are built. One caramel sticker carries the offer.
const W = 816
const H = 1056
const CREAM = '#f4ece1'
const BROWN = '#3b2418'
const MUTED = '#6f5546'
const CARAMEL = '#dc9459'

export const grandOpeningFlyer: TemplateDesign = {
  slug: 'grand-opening-flyer',
  title: 'Grand opening flyer',
  category: 'flyers',
  tags: ['flyer', 'opening', 'cafe', 'coffee', 'shop', 'print', 'minimal'],
  description: 'A café opening flyer for US Letter: a large coffee photo, the café name and "Grand Opening" in a serif, an opening-day offer and the details in one row.',
  preset: 'letter',
  async build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'in', presetId: 'letter' })
    const p = doc.page('Flyer', { type: 'solid', color: CREAM })

    await p.photo({ name: 'Photo', file: 'cafe-latte.webp', x: 0, y: 0, w: W, h: 560, focusX: 0.45, focusY: 0.42 })

    // The offer sticker on the photo's lower edge.
    p.circle({ name: 'Offer sticker', cx: 668, cy: 556, r: 86, fill: CARAMEL, angle: 8 })
    p.text({ name: 'Offer value', x: 592, y: 510, w: 152, text: 'Free', font: 'playfair', bold: true, size: 42, color: BROWN, on: CARAMEL, align: 'center', angle: 8, lines: 1 })
    p.text({ name: 'Offer terms', x: 592, y: 560, w: 152, text: 'coffee for the first 100 guests', font: 'archivo', bold: true, size: 13, color: BROWN, on: CARAMEL, align: 'center', lh: 1.2, angle: 8, lines: 2 })

    // Name and headline.
    p.text({ name: 'Name', x: 64, y: 604, w: 520, text: 'Corner Bloom Café', font: 'playfair', italic: true, size: 30, color: MUTED, on: CREAM, lines: 1 })
    p.text({ name: 'Headline', x: 60, y: 646, w: 700, text: 'Grand Opening', font: 'playfair', bold: true, size: 84, color: BROWN, on: CREAM, lh: 1, lines: 1 })
    p.text({ name: 'Tagline', x: 64, y: 752, w: 470, text: 'Fresh coffee, warm pastries and a seat by the window. Come and say hello.', font: 'archivo', size: 18, color: MUTED, on: CREAM, lh: 1.5, lines: 2 })

    // Details in one row.
    p.line({ name: 'Details rule', x1: 64, y1: 860, x2: 752, y2: 860, color: BROWN, width: 1.2 })
    const columns = [
      { icon: 'calendar' as const, text: 'Saturday 12 July' },
      { icon: 'clock' as const, text: '8 AM to 6 PM' },
      { icon: 'pin' as const, text: '24 Orchard Lane' },
    ]
    columns.forEach((col, i) => {
      const x = 64 + i * 232
      p.icon({ name: `${col.text} icon`, icon: col.icon, x, y: 892, size: 20, color: CARAMEL, width: 2 })
      p.text({ name: col.text, x: x + 30, y: 893, w: 194, text: col.text, font: 'archivo', bold: true, size: 15, color: BROWN, on: CREAM, lines: 1 })
    })
    p.text({ name: 'Website', x: 64, y: 980, w: 688, text: 'cornerbloom.example  ·  @cornerbloomcafe', font: 'archivo', size: 13, color: MUTED, on: CREAM, lines: 1 })
    return doc
  },
}
