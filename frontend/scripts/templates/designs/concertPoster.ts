import { segmentsPath, slicedDisc } from '../geometry'
import { DocBuilder } from '../kit'
import { RED } from '../palette'
import type { TemplateDesign } from '../registry'

const W = 1728
const H = 2304
const PAGE = { x: 0, y: 0, w: W, h: H }
const CREAM = RED[50]
const NIGHT = RED[950]
const DEEP = '#1c0510'
const SUN = { cx: 864, cy: 1130, r: 450 }
const HORIZON = 1440

export const concertPoster: TemplateDesign = {
  slug: 'night-bloom-concert-poster',
  title: 'Night Bloom concert poster',
  category: 'posters',
  tags: ['poster', 'concert', 'festival', 'music', 'retro', 'event', 'print'],
  description: 'A retro sunset festival poster for 18 x 24 in print: striped sun, perspective floor and a clear line-up.',
  preset: '',
  featured: true,
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'in' })
    const p = doc.page('Poster', { type: 'gradient', kind: 'linear', angle: 90, stops: [{ offset: 0, color: NIGHT }, { offset: 1, color: DEEP }] })

    // The night sky: stars scattered with a fixed pattern.
    const stars: ReturnType<typeof p.star>[] = []
    let seed = 7
    const next = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let i = 0; i < 22; i++) {
      const size = 14 + Math.round(next() * 22)
      stars.push(p.star({ name: `Star ${i + 1}`, cx: 90 + next() * (W - 180), cy: 700 + next() * 660 - (i % 3) * 120, size, points: 4, innerRatio: 0.2, fill: CREAM, opacity: 0.35 + next() * 0.5 }))
    }
    p.group('Stars', stars, { locked: true })

    // The sun, sliced by stripes that grow towards the horizon, and the floor it sinks into.
    p.path({
      name: 'Sun',
      d: slicedDisc(SUN.cx, SUN.cy, SUN.r, [[1215, 1225], [1262, 1276], [1312, 1330], [1366, 1388], [1420, 1446]], HORIZON, PAGE),
      fill: { angle: 90, stops: [[0, '#ffd23f'], [0.5, '#ff8a5b'], [1, RED[600]]] },
      locked: true,
    })
    const floor: [[number, number], [number, number]][] = []
    for (const y of [1460, 1488, 1522, 1566, 1626, 1704]) floor.push([[0, y], [W, y]])
    for (let k = -9; k <= 9; k++) floor.push([[864 + k * 40, HORIZON], [864 + k * 300, 1730]])
    p.path({ name: 'Floor grid', d: segmentsPath(floor, { x: 0, y: HORIZON, w: W, h: 290 }), stroke: RED[400], strokeWidth: 3, opacity: 0.75, locked: true })
    p.line({ name: 'Horizon', x1: 0, y1: HORIZON, x2: W, y2: HORIZON, color: RED[300], width: 4, locked: true })

    // Header.
    p.text({ name: 'Dates', x: 120, y: 118, w: 760, text: 'Fri 13 – Sun 15 June', font: 'josefin', bold: true, size: 38, color: RED[200], on: NIGHT, spacing: 200, upper: true, lines: 1 })
    p.text({ name: 'Ages', x: W - 120 - 760, y: 118, w: 760, text: 'All ages  ·  Rain or shine', font: 'josefin', bold: true, size: 38, color: RED[200], on: NIGHT, align: 'right', spacing: 200, upper: true, lines: 1 })
    p.line({ name: 'Header rule', x1: 120, y1: 200, x2: W - 120, y2: 200, color: RED[400], width: 3 })
    p.text({ name: 'Title', x: 60, y: 232, w: W - 120, text: 'Night Bloom', font: 'bebas', size: 340, color: CREAM, on: NIGHT, align: 'center', lh: 1, upper: true, lines: 1 })
    p.text({ name: 'Subtitle', x: 120, y: 585, w: W - 240, text: 'Three nights of live music under the open sky', font: 'josefin', bold: true, size: 36, color: RED[200], on: NIGHT, align: 'center', spacing: 240, upper: true, lines: 1 })

    // Line-up.
    p.text({ name: 'Lineup label', x: 120, y: 1775, w: W - 240, text: 'Line-up', font: 'josefin', bold: true, size: 32, color: RED[300], on: DEEP, align: 'center', spacing: 500, upper: true, lines: 1 })
    p.text({ name: 'Headliner', x: 120, y: 1822, w: W - 240, text: 'Marlow & The Echoes', font: 'bebas', size: 150, color: CREAM, on: DEEP, align: 'center', lh: 1, upper: true, lines: 1 })
    p.text({ name: 'Main acts', x: 120, y: 1974, w: W - 240, text: 'Paper Tigers  ·  Neon Orchard  ·  Velvet Static', font: 'bebas', size: 82, color: RED[200], on: DEEP, align: 'center', spacing: 60, lh: 1, upper: true, lines: 1 })
    p.text({ name: 'More acts', x: 120, y: 2068, w: W - 240, text: 'Ruby Lane  ·  Hollow Pines  ·  The Late Flowers  ·  and more to be announced', font: 'josefin', size: 30, color: RED[200], on: DEEP, align: 'center', spacing: 80, lines: 1 })

    // Footer.
    p.line({ name: 'Footer rule', x1: 120, y1: 2142, x2: W - 120, y2: 2142, color: RED[400], width: 3 })
    const columns = [
      { label: 'Where', value: 'Riverside Park, Main Lawn', align: 'left' as const },
      { label: 'Gates', value: 'Open daily from 4 PM', align: 'center' as const },
      { label: 'Tickets', value: 'From $45 at yourfestival.com', align: 'right' as const },
    ]
    columns.forEach((col, i) => {
      const x = 120 + i * 496
      p.text({ name: `${col.label} label`, x, y: 2160, w: 496, text: col.label, font: 'josefin', bold: true, size: 22, color: RED[400], on: DEEP, align: col.align, spacing: 300, upper: true, lines: 1 })
      p.text({ name: `${col.label} value`, x, y: 2196, w: 496, text: col.value, font: 'josefin', bold: true, size: 28, color: CREAM, on: DEEP, align: col.align, lines: 1 })
    })
    return doc
  },
}
