import { DocBuilder } from '../kit'
import type { TemplateDesign } from '../registry'

// Editorial black and white with one loud accent: one giant word, one sticker, one button.
const PAPER = '#f3efe7'
const INK = '#141414'
const ACCENT = '#ff5a1f'
const MUTED = '#5b5550'

export const saleAnnouncement: TemplateDesign = {
  slug: 'bold-sale-announcement',
  title: 'Bold sale announcement',
  category: 'social-media',
  tags: ['sale', 'instagram', 'promo', 'discount', 'shop', 'minimal'],
  description: 'An editorial sale post: one giant word, a round discount sticker in a single loud accent and a clear button.',
  preset: 'instagram-post',
  featured: true,
  build() {
    const doc = new DocBuilder(this.slug, { width: 1080, height: 1080, unit: 'px', presetId: 'instagram-post' })
    const p = doc.page('Sale', { type: 'solid', color: PAPER })

    // Masthead.
    p.text({ name: 'Eyebrow', x: 64, y: 64, w: 480, text: 'End of season', font: 'archivo', bold: true, size: 26, color: INK, on: PAPER, spacing: 220, upper: true, lines: 1 })
    p.text({ name: 'Channel', x: 536, y: 64, w: 480, text: 'Online & in store', font: 'archivo', size: 26, color: INK, on: PAPER, spacing: 120, upper: true, align: 'right', lines: 1 })
    p.line({ name: 'Masthead rule', x1: 64, y1: 118, x2: 1016, y2: 118, color: INK, width: 3 })

    // The word.
    p.text({ name: 'Headline', x: 46, y: 132, w: 990, text: 'SALE', font: 'anton', size: 500, color: INK, on: PAPER, lh: 1, lines: 1 })

    // Sticker in the accent, tilted like it was slapped on.
    p.circle({ name: 'Sticker', cx: 820, cy: 690, r: 176, fill: ACCENT, angle: -12 })
    p.text({ name: 'Sticker intro', x: 680, y: 586, w: 280, text: 'Up to', font: 'archivo', bold: true, size: 30, color: INK, on: ACCENT, align: 'center', spacing: 200, upper: true, angle: -12, lines: 1 })
    p.text({ name: 'Sticker value', x: 660, y: 618, w: 320, text: '50%', font: 'anton', size: 150, color: INK, on: ACCENT, align: 'center', lh: 1, angle: -12, lines: 1 })
    p.text({ name: 'Sticker label', x: 680, y: 772, w: 280, text: 'Off everything', font: 'archivo', bold: true, size: 24, color: INK, on: ACCENT, align: 'center', spacing: 160, upper: true, angle: -12, lines: 1 })

    // Copy and call to action.
    p.text({ name: 'Tagline', x: 64, y: 690, w: 520, text: 'Fresh finds for every wardrobe, marked down for one weekend only.', font: 'archivo', size: 38, color: INK, on: PAPER, lh: 1.25, lines: 3 })
    p.rect({ name: 'Button', x: 64, y: 878, w: 380, h: 92, fill: INK, radius: 46 })
    p.text({ name: 'Button label', x: 64, y: 878 + 27, w: 340, text: 'Shop the sale', font: 'archivo', bold: true, size: 32, color: PAPER, on: INK, align: 'center', lines: 1 })
    p.icon({ name: 'Button arrow', icon: 'arrowRight', x: 368, y: 878 + 30, size: 32, color: ACCENT, width: 3 })
    p.text({ name: 'Details', x: 64, y: 1000, w: 952, text: 'Sat 14 – Sun 15 June  ·  yourstore.com', font: 'archivo', size: 24, color: MUTED, on: PAPER, spacing: 40, lines: 1 })
    return doc
  },
}
