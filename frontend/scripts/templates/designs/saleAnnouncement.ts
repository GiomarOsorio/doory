import { DocBuilder } from '../kit'
import { raysInPage } from '../geometry'
import { INK, RED, WHITE } from '../palette'
import type { TemplateDesign } from '../registry'

const GOLD = '#ffd23f'
const PAGE = { x: 0, y: 0, w: 1080, h: 1080 }

export const saleAnnouncement: TemplateDesign = {
  slug: 'bold-sale-announcement',
  title: 'Bold sale announcement',
  category: 'social-media',
  tags: ['sale', 'instagram', 'promo', 'discount', 'shop'],
  description: 'A loud, high-contrast sale post: giant headline, starburst discount badge and a clear call to action.',
  preset: 'instagram-post',
  featured: true,
  build() {
    const doc = new DocBuilder(this.slug, { width: 1080, height: 1080, unit: 'px', presetId: 'instagram-post' })
    const p = doc.page('Sale', { type: 'solid', color: RED[600] })

    // Backdrop: rays that fan out from the badge, locked so they never get in the way of editing.
    p.path({ name: 'Sunburst rays', d: raysInPage(860, 760, 7.5, PAGE, 3), fill: RED[700], locked: true })

    // Eyebrow pill.
    p.rect({ name: 'Eyebrow pill', x: 70, y: 64, w: 330, h: 60, fill: INK, radius: 30 })
    p.text({ name: 'Eyebrow', x: 70, y: 64 + 15, w: 330, text: 'End of season', font: 'dmSans', bold: true, size: 25, color: RED[50], on: INK, align: 'center', spacing: 160, upper: true, lines: 1 })

    // Headline and supporting line.
    p.text({ name: 'Headline', x: 60, y: 140, w: 960, text: 'SALE', font: 'anton', size: 540, color: RED[50], on: [RED[600], RED[700]], lh: 1, lines: 1 })
    p.text({ name: 'Tagline', x: 70, y: 700, w: 560, text: 'Fresh finds for every wardrobe, all marked down.', font: 'dmSans', bold: true, size: 40, color: WHITE, on: [RED[600], RED[700]], lh: 1.2, lines: 2 })

    // Footer.
    p.rect({ name: 'Footer band', x: 0, y: 900, w: 1080, h: 180, fill: RED[50], locked: true })
    p.text({ name: 'Dates', x: 70, y: 930, w: 560, text: 'Saturday 14 – Sunday 15 June', font: 'dmSans', bold: true, size: 32, color: INK, on: RED[50], lines: 1 })
    p.text({ name: 'Website', x: 70, y: 980, w: 560, text: 'yourstore.com  ·  In store and online', font: 'dmSans', size: 26, color: '#5c5155', on: RED[50], lines: 1 })
    p.rect({ name: 'Button', x: 700, y: 935, w: 310, h: 90, fill: RED[600], radius: 45 })
    p.text({ name: 'Button label', x: 700, y: 935 + 26, w: 310, text: 'Shop now', font: 'dmSans', bold: true, size: 34, color: WHITE, on: RED[600], align: 'center', lines: 1 })

    // Badge, last so it overlaps the footer band.
    p.star({ name: 'Badge burst', cx: 860, cy: 745, size: 350, points: 22, innerRatio: 0.9, fill: GOLD, angle: 12 })
    p.text({ name: 'Badge intro', x: 710, y: 646, w: 300, text: 'Up to', font: 'dmSans', bold: true, size: 28, color: INK, on: GOLD, align: 'center', spacing: 160, upper: true, lines: 1 })
    p.text({ name: 'Badge value', x: 710, y: 681, w: 300, text: '50%', font: 'anton', size: 130, color: INK, on: GOLD, align: 'center', lh: 1, lines: 1 })
    p.text({ name: 'Badge label', x: 710, y: 805, w: 300, text: 'Off', font: 'dmSans', bold: true, size: 36, color: INK, on: GOLD, align: 'center', spacing: 200, upper: true, lines: 1 })
    return doc
  },
}
