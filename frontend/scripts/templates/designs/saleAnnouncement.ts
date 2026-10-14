import { DocBuilder } from '../kit'
import type { TemplateDesign } from '../registry'

// The split layout shops use for a sale post: a fashion photo on one half, the offer on the other, one loud accent on
// the sticker that sits across the seam.
const PAPER = '#f3efe7'
const INK = '#141414'
const ACCENT = '#ff5a1f'
const MUTED = '#5b5550'

export const saleAnnouncement: TemplateDesign = {
  slug: 'bold-sale-announcement',
  title: 'Bold sale announcement',
  category: 'social-media',
  tags: ['sale', 'instagram', 'promo', 'discount', 'shop', 'fashion'],
  description: 'A split sale post: a fashion photo on the left, a giant "Sale" on the right, a round discount sticker across the seam and a clear button.',
  preset: 'instagram-post',
  featured: true,
  async build() {
    const doc = new DocBuilder(this.slug, { width: 1080, height: 1080, unit: 'px', presetId: 'instagram-post' })
    const p = doc.page('Sale', { type: 'solid', color: PAPER })

    await p.photo({ name: 'Photo', file: 'sale-shopper.webp', x: 0, y: 0, w: 540, h: 1080, focusX: 0.62, focusY: 0.5 })

    // The offer.
    p.text({ name: 'Eyebrow', x: 600, y: 72, w: 420, text: 'End of season', font: 'archivo', bold: true, size: 30, color: INK, on: PAPER, lines: 1 })
    p.text({ name: 'Headline', x: 592, y: 120, w: 440, text: 'SALE', font: 'anton', size: 236, color: INK, on: PAPER, lh: 1, lines: 1 })
    p.text({ name: 'Tagline', x: 600, y: 380, w: 410, text: 'Fresh finds for every wardrobe, marked down for one weekend only.', font: 'archivo', size: 30, color: INK, on: PAPER, lh: 1.3, lines: 3 })

    // Sticker across the seam, tilted like it was slapped on.
    p.circle({ name: 'Sticker', cx: 540, cy: 690, r: 150, fill: ACCENT, angle: -12 })
    p.text({ name: 'Sticker intro', x: 420, y: 600, w: 240, text: 'Up to', font: 'archivo', bold: true, size: 28, color: INK, on: ACCENT, align: 'center', angle: -12, lines: 1 })
    p.text({ name: 'Sticker value', x: 400, y: 630, w: 280, text: '50%', font: 'anton', size: 128, color: INK, on: ACCENT, align: 'center', lh: 1, angle: -12, lines: 1 })
    p.text({ name: 'Sticker label', x: 420, y: 766, w: 240, text: 'off everything', font: 'archivo', bold: true, size: 24, color: INK, on: ACCENT, align: 'center', angle: -12, lines: 1 })

    // Call to action and details.
    p.rect({ name: 'Button', x: 732, y: 872, w: 288, h: 84, fill: INK, radius: 42 })
    p.text({ name: 'Button label', x: 732, y: 872 + 24, w: 288, text: 'Shop the sale', font: 'archivo', bold: true, size: 30, color: PAPER, on: INK, align: 'center', lines: 1 })
    p.text({ name: 'Details', x: 600, y: 990, w: 420, text: 'Sat 14 to Sun 15 June  ·  yourstore.com', font: 'archivo', size: 21, color: MUTED, on: PAPER, align: 'right', lines: 1 })
    return doc
  },
}
