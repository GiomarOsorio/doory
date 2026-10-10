import { DocBuilder, circlePath } from '../kit'
import type { TemplateDesign } from '../registry'

// Type-led gig poster: the headliner dominates, the support acts and details follow in a clear hierarchy,
// with a halftone sun for texture. Near-black, cream and one acid accent.
const W = 1728
const H = 2304
const NIGHT = '#111014'
const CREAM = '#f2ece0'
const ACID = '#d7ff3d'
const GREY = '#a9a39a'

/** Dots on a grid inside a circle, growing towards its lower right: one path, so it moves as one shape. */
function halftone(cx: number, cy: number, r: number, step: number): string {
  const parts: string[] = []
  for (let y = cy - r; y <= cy + r; y += step) {
    for (let x = cx - r; x <= cx + r; x += step) {
      const d = Math.hypot(x - cx, y - cy)
      if (d > r) continue
      const t = Math.min(1, Math.max(0, ((x - cx) + (y - cy)) / (2 * r) + 0.5))
      const dot = step * (0.08 + 0.42 * t)
      parts.push(circlePath(x, y, dot))
    }
  }
  return parts.join(' ')
}

export const concertPoster: TemplateDesign = {
  slug: 'night-bloom-concert-poster',
  title: 'Night Bloom concert poster',
  category: 'posters',
  tags: ['poster', 'concert', 'festival', 'music', 'gig', 'event', 'print'],
  description: 'A type-led gig poster for 18 x 24 in print: the headliner huge, the support acts and details in a clear hierarchy, and a halftone sun.',
  preset: '',
  featured: true,
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'in' })
    const p = doc.page('Poster', { type: 'solid', color: NIGHT })

    // Texture first, so everything else sits on top of it.
    p.path({ name: 'Halftone sun', d: halftone(1200, 1390, 470, 36), fill: ACID, locked: true })

    // Top line.
    p.text({ name: 'Festival', x: 110, y: 110, w: 900, text: 'Night Bloom Festival', font: 'archivo', bold: true, size: 46, color: CREAM, on: NIGHT, spacing: 240, upper: true, lines: 1 })
    p.text({ name: 'Edition', x: 1018, y: 110, w: 600, text: 'Vol. 04', font: 'archivo', size: 46, color: CREAM, on: NIGHT, spacing: 240, upper: true, align: 'right', lines: 1 })
    p.line({ name: 'Top rule', x1: 110, y1: 190, x2: 1618, y2: 190, color: CREAM, width: 4 })

    // Headliner.
    p.text({ name: 'Headliner', x: 96, y: 240, w: 1540, text: 'Marlow & the Echoes', font: 'anton', size: 330, color: CREAM, on: NIGHT, lh: 0.92, upper: true, lines: 2 })

    // Support acts.
    p.text({ name: 'With', x: 110, y: 930, w: 900, text: 'with', font: 'lora', italic: true, size: 70, color: ACID, on: NIGHT, lines: 1 })
    p.text({ name: 'Support acts', x: 110, y: 1020, w: 1000, text: 'Paper Tigers\nNeon Orchard\nVelvet Static', font: 'archivo', bold: true, size: 96, color: CREAM, on: NIGHT, lh: 1.08, upper: true, lines: 3 })

    // Dates and details.
    p.line({ name: 'Bottom rule', x1: 110, y1: 1880, x2: 1618, y2: 1880, color: CREAM, width: 4 })
    p.text({ name: 'Dates', x: 96, y: 1920, w: 900, text: '13–15.06', font: 'anton', size: 250, color: ACID, on: NIGHT, lh: 1, lines: 1 })
    p.text({ name: 'Details', x: 1018, y: 1940, w: 600, text: 'Riverside Park\nGates 4 PM\nTickets from $45', font: 'archivo', bold: true, size: 50, color: CREAM, on: NIGHT, lh: 1.3, align: 'right', lines: 3 })
    p.text({ name: 'Website', x: 1018, y: 2160, w: 600, text: 'nightbloom.example', font: 'archivo', size: 40, color: GREY, on: NIGHT, align: 'right', lines: 1 })
    return doc
  },
}
