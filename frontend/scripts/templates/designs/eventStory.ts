import { DocBuilder } from '../kit'
import type { TemplateDesign } from '../registry'

// A photo-led story: the people at the top, fading into a dusk panel that carries the title and the details. The
// date sits on the photo like a ticket stub; everything that matters stays inside the story's safe zone.
const NIGHT = '#221a33'
const CREAM = '#fbf1e6'
const PEACH = '#ffb98a'
const LILAC = '#cdbfe8'

export const eventStory: TemplateDesign = {
  slug: 'rooftop-event-story',
  title: 'Rooftop event story',
  category: 'social-media',
  tags: ['story', 'event', 'instagram', 'party', 'music', 'sunset'],
  description: 'A photo-led event story: friends at sunset fading into a dusk panel with a serif title, the date, time and place, and an RSVP button.',
  preset: 'instagram-story',
  featured: true,
  async build() {
    const doc = new DocBuilder(this.slug, { width: 1080, height: 1920, unit: 'px', presetId: 'instagram-story' })
    const p = doc.page('Story', { type: 'solid', color: NIGHT })

    // The photo, and the fade that lets the panel take over.
    await p.photo({ name: 'Photo', file: 'rooftop-friends.webp', x: 0, y: 0, w: 1080, h: 1240, focusX: 0.42, focusY: 0.5 })
    p.rect({ name: 'Fade', x: 0, y: 860, w: 1080, h: 382, fill: { angle: 90, stops: [[0, '#221a3300'], [1, NIGHT]] } })

    // The date, like a ticket stub on the photo.
    p.rect({ name: 'Date card', x: 812, y: 270, w: 196, h: 212, fill: CREAM, radius: 24 })
    p.text({ name: 'Month', x: 812, y: 294, w: 196, text: 'June', font: 'archivo', bold: true, size: 34, color: NIGHT, on: CREAM, align: 'center', lines: 1 })
    p.text({ name: 'Day', x: 812, y: 332, w: 196, text: '21', font: 'playfair', bold: true, size: 120, color: NIGHT, on: CREAM, align: 'center', lh: 1, lines: 1 })

    // Title.
    p.text({ name: 'Title', x: 72, y: 1150, w: 940, text: 'Sunset', font: 'playfair', bold: true, size: 184, color: CREAM, on: NIGHT, lh: 1, lines: 1 })
    p.text({ name: 'Title second line', x: 72, y: 1330, w: 940, text: 'Sessions', font: 'playfair', italic: true, size: 184, color: PEACH, on: NIGHT, lh: 1, lines: 1 })

    // Details.
    p.text({ name: 'When', x: 76, y: 1540, w: 920, text: 'Friday, 6 PM till late. Free entry.', font: 'archivo', bold: true, size: 38, color: CREAM, on: NIGHT, lines: 1 })
    p.text({ name: 'Where', x: 76, y: 1594, w: 920, text: 'The Garden Terrace, 12 Orchard Lane', font: 'archivo', size: 32, color: LILAC, on: NIGHT, lines: 1 })
    p.rect({ name: 'Button', x: 76, y: 1658, w: 300, h: 88, fill: PEACH, radius: 44 })
    p.text({ name: 'Button label', x: 76, y: 1658 + 24, w: 300, text: 'RSVP', font: 'archivo', bold: true, size: 36, color: NIGHT, on: PEACH, align: 'center', lines: 1 })
    return doc
  },
}
