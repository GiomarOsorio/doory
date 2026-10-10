import { DocBuilder } from '../kit'
import { photoBackdrop } from '../decor'
import type { TemplateDesign } from '../registry'

// Photo-led story at dusk: a big rounded photo, a serif title and the details inside the safe zone.
const NIGHT = '#1f1836'
const DUSK = '#3d2453'
const CREAM = '#fbf1e6'
const PEACH = '#ffb98a'
const LILAC = '#cdbfe8'

export const eventStory: TemplateDesign = {
  slug: 'rooftop-event-story',
  title: 'Rooftop event story',
  category: 'social-media',
  tags: ['story', 'event', 'instagram', 'party', 'music', 'sunset'],
  description: 'A photo-led event story at dusk: a big rounded photo, a serif title, the date, time and place, and an RSVP button inside the safe zone.',
  preset: 'instagram-story',
  featured: true,
  build() {
    const doc = new DocBuilder(this.slug, { width: 1080, height: 1920, unit: 'px', presetId: 'instagram-story' })
    const p = doc.page('Story', { type: 'gradient', kind: 'linear', angle: 90, stops: [{ offset: 0, color: NIGHT }, { offset: 1, color: DUSK }] })

    // The photo, and a tag over its lower edge.
    photoBackdrop(p, { name: 'Photo stand-in', box: { x: 60, y: 200, w: 960, h: 860 }, shape: { kind: 'rect', radius: 51.6 }, tones: { sky: ['#ffcfa8', '#f49a9a'], sun: '#fff3e3', hillFar: '#c96f99', hillNear: '#7a3d7c' } })
    p.placeholder({ name: 'Photo', x: 60, y: 200, w: 960, h: 860, mask: 'rounded', maskRadius: 0.06 })
    p.rect({ name: 'Tag', x: 100, y: 1010, w: 470, h: 76, fill: CREAM, radius: 38 })
    p.text({ name: 'Tag label', x: 100, y: 1010 + 21, w: 470, text: 'Live on the rooftop', font: 'archivo', bold: true, size: 28, color: NIGHT, on: CREAM, spacing: 180, upper: true, align: 'center', lines: 1 })

    // Title.
    p.text({ name: 'Title', x: 80, y: 1110, w: 920, text: 'Sunset', font: 'playfair', bold: true, size: 190, color: CREAM, on: [NIGHT, DUSK], lh: 1, lines: 1 })
    p.text({ name: 'Title second line', x: 80, y: 1290, w: 920, text: 'Sessions', font: 'playfair', italic: true, size: 190, color: PEACH, on: [NIGHT, DUSK], lh: 1, lines: 1 })

    // Details.
    p.text({ name: 'When', x: 84, y: 1496, w: 920, text: 'Fri 21 June  ·  6 PM till late  ·  Free entry', font: 'archivo', bold: true, size: 36, color: CREAM, on: [NIGHT, DUSK], lines: 1 })
    p.text({ name: 'Where', x: 84, y: 1548, w: 920, text: 'The Garden Terrace, 12 Orchard Lane', font: 'archivo', size: 32, color: LILAC, on: [NIGHT, DUSK], lines: 1 })
    p.rect({ name: 'Button', x: 84, y: 1606, w: 400, h: 92, fill: PEACH, radius: 48 })
    p.text({ name: 'Button label', x: 84, y: 1606 + 26, w: 400, text: 'RSVP today', font: 'archivo', bold: true, size: 34, color: NIGHT, on: PEACH, spacing: 120, upper: true, align: 'center', lines: 1 })
    return doc
  },
}
