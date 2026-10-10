import { photoBackdrop } from '../decor'
import { archMask, ringInPage } from '../geometry'
import { DocBuilder } from '../kit'
import { RED } from '../palette'
import type { TemplateDesign } from '../registry'

const PAGE = { x: 0, y: 0, w: 1080, h: 1920 }
const PEACH = '#ffd9a0'
const NIGHT = RED[950]

export const eventStory: TemplateDesign = {
  slug: 'rooftop-event-story',
  title: 'Rooftop event story',
  category: 'social-media',
  tags: ['story', 'event', 'instagram', 'party', 'music', 'invitation'],
  description: 'A vertical story for a sunset event: an arched photo slot in front of a glowing sun, the date and a call to action.',
  preset: 'instagram-story',
  build() {
    const doc = new DocBuilder(this.slug, { width: 1080, height: 1920, unit: 'px', presetId: 'instagram-story' })
    const p = doc.page('Story', { type: 'gradient', kind: 'linear', angle: 90, stops: [{ offset: 0, color: NIGHT }, { offset: 0.55, color: RED[900] }, { offset: 1, color: RED[800] }] })

    // The sun behind the arch and the rings around it.
    p.path({ name: 'Sun rings', d: [400, 470, 540].map((r) => ringInPage(540, 905, r, r - 3, PAGE)).join(' '), fill: RED[700], opacity: 0.55, locked: true })
    p.circle({ name: 'Sun', cx: 540, cy: 905, r: 315, fill: { angle: 90, stops: [[0, PEACH], [1, RED[400]]] }, locked: true })

    // Title block.
    p.text({ name: 'Eyebrow', x: 90, y: 205, w: 900, text: 'Live on the rooftop', font: 'dmSans', bold: true, size: 28, color: RED[300], on: NIGHT, align: 'center', spacing: 320, upper: true, lines: 1 })
    p.text({ name: 'Title', x: 90, y: 255, w: 900, text: 'Sunset', font: 'playfair', bold: true, size: 170, color: RED[50], on: NIGHT, align: 'center', lh: 1, lines: 1 })
    p.text({ name: 'Title italic', x: 90, y: 408, w: 900, text: 'Sessions', font: 'playfair', bold: true, italic: true, size: 170, color: PEACH, on: NIGHT, align: 'center', lh: 1, lines: 1 })

    // The photo slot: an arch, with a stand-in picture behind it.
    photoBackdrop(p, {
      name: 'Photo backdrop',
      box: { x: 280, y: 665, w: 520, h: 660 },
      shape: { kind: 'arch' },
      tones: { sky: [RED[100], RED[200]], sun: RED[50], hillFar: RED[300], hillNear: RED[400] },
    })
    p.placeholder({ name: 'Event photo', x: 280, y: 665, w: 520, h: 660, mask: archMask(520, 660) })

    // Side captions, set on their side.
    p.text({ name: 'Left caption', x: 120, y: 1250, w: 560, text: 'Live music  ·  Food  ·  Friends', font: 'dmSans', bold: true, size: 24, color: RED[200], on: RED[900], align: 'center', spacing: 260, upper: true, angle: -90, lines: 1 })
    p.text({ name: 'Right caption', x: 960, y: 695, w: 560, text: 'Free entry  ·  All welcome', font: 'dmSans', bold: true, size: 24, color: RED[200], on: RED[900], align: 'center', spacing: 260, upper: true, angle: 90, lines: 1 })

    // Sparkles.
    const sparkles: [number, number, number][] = [[175, 300, 56], [910, 350, 84], [955, 590, 40], [140, 1390, 70], [935, 1335, 48], [110, 520, 30]]
    sparkles.forEach(([cx, cy, size], i) => p.star({ name: `Sparkle ${i + 1}`, cx, cy, size, points: 4, innerRatio: 0.22, fill: i % 2 === 0 ? PEACH : RED[50] }))

    // Details.
    p.text({ name: 'Date', x: 90, y: 1385, w: 900, text: 'Friday 21 June', font: 'dmSans', bold: true, size: 62, color: RED[50], on: RED[900], align: 'center', spacing: 60, upper: true, lines: 1 })
    p.text({ name: 'Time', x: 90, y: 1470, w: 900, text: 'Doors 6 PM  ·  Music from 7 PM', font: 'dmSans', size: 34, color: PEACH, on: RED[900], align: 'center', lines: 1 })
    p.text({ name: 'Venue', x: 90, y: 1522, w: 900, text: 'The Garden Terrace, 12 Orchard Lane', font: 'dmSans', size: 30, color: RED[200], on: RED[900], align: 'center', lines: 1 })
    p.rect({ name: 'Button', x: 330, y: 1580, w: 420, h: 84, fill: PEACH, radius: 42 })
    p.text({ name: 'Button label', x: 330, y: 1580 + 24, w: 420, text: 'RSVP today', font: 'dmSans', bold: true, size: 32, color: NIGHT, on: PEACH, align: 'center', spacing: 120, upper: true, lines: 1 })
    return doc
  },
}
