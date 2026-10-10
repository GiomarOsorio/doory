import { DocBuilder } from '../kit'
import { archMask } from '../geometry'
import { photoBackdrop } from '../decor'
import type { TemplateDesign } from '../registry'

// Warm, modern and minimal: cream paper, coffee brown, an arched photo and one caramel sticker.
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
  description: 'A warm, minimal café opening flyer for US Letter: an arched photo, a serif headline, an opening-day offer and the details in one row.',
  preset: 'letter',
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'in', presetId: 'letter' })
    const p = doc.page('Flyer', { type: 'solid', color: CREAM })

    p.text({ name: 'Name', x: 0, y: 54, w: W, text: 'Corner Bloom Café', font: 'archivo', bold: true, size: 18, color: BROWN, on: CREAM, spacing: 420, upper: true, align: 'center', lines: 1 })

    // Arched photo with the offer sticker on its shoulder.
    photoBackdrop(p, { name: 'Photo stand-in', box: { x: 178, y: 104, w: 460, h: 470 }, shape: { kind: 'arch' }, tones: { sky: ['#f6dcc0', '#efc59c'], sun: '#fff6ea', hillFar: '#c9945f', hillNear: '#8c5a36' } })
    p.placeholder({ name: 'Photo', x: 178, y: 104, w: 460, h: 470, mask: archMask(460, 470) })
    p.circle({ name: 'Offer sticker', cx: 640, cy: 196, r: 84, fill: CARAMEL, angle: 10 })
    p.text({ name: 'Offer value', x: 566, y: 152, w: 148, text: 'Free', font: 'playfair', bold: true, size: 40, color: BROWN, on: CARAMEL, align: 'center', angle: 10, lines: 1 })
    p.text({ name: 'Offer terms', x: 566, y: 200, w: 148, text: 'coffee for our first 100 guests', font: 'archivo', bold: true, size: 13, color: BROWN, on: CARAMEL, align: 'center', lh: 1.2, angle: 10, lines: 2 })

    // Headline and copy.
    p.text({ name: 'Headline', x: 0, y: 604, w: W, text: 'Grand', font: 'playfair', size: 108, color: BROWN, on: CREAM, align: 'center', lh: 1, lines: 1 })
    p.text({ name: 'Headline second line', x: 0, y: 706, w: W, text: 'Opening', font: 'playfair', italic: true, size: 108, color: BROWN, on: CREAM, align: 'center', lh: 1, lines: 1 })
    p.text({ name: 'Tagline', x: 148, y: 834, w: 520, text: 'Fresh coffee, warm pastries and a seat by the window. Come and say hello.', font: 'archivo', size: 17, color: MUTED, on: CREAM, align: 'center', lh: 1.5, lines: 2 })

    // Details in one row.
    p.line({ name: 'Details rule', x1: 70, y1: 912, x2: 746, y2: 912, color: BROWN, width: 1.2 })
    const columns = [
      { icon: 'calendar' as const, text: 'Saturday 12 July' },
      { icon: 'clock' as const, text: '8 AM – 6 PM' },
      { icon: 'pin' as const, text: '24 Orchard Lane' },
    ]
    columns.forEach((col, i) => {
      const x = 70 + i * 228
      p.icon({ name: `${col.text} icon`, icon: col.icon, x, y: 942, size: 20, color: CARAMEL, width: 2 })
      p.text({ name: col.text, x: x + 30, y: 943, w: 190, text: col.text, font: 'archivo', bold: true, size: 15, color: BROWN, on: CREAM, lines: 1 })
    })
    p.text({ name: 'Website', x: 0, y: 1000, w: W, text: 'cornerbloom.example  ·  @cornerbloomcafe', font: 'archivo', size: 13, color: MUTED, on: CREAM, align: 'center', spacing: 60, lines: 1 })
    return doc
  },
}
