import { DocBuilder, type PageBuilder } from '../kit'
import { avatarBackdrop, photoBackdrop } from '../decor'
import type { IconName } from '../icons'
import type { TemplateDesign } from '../registry'

// Cream and ink with one deep green: an editorial cover, a slide of big numbers and a dark closing slide.
const W = 1920
const H = 1080
const CREAM = '#f5f0e6'
const INK = '#16211c'
const MUTED = '#55605a'
const GREEN = '#1d6b4f'
const PALE = '#dfe9e1'
const CARD = '#ffffff'
const NIGHT = '#16352a'

function logo(p: PageBuilder, on: string, color: string, mark: string): void {
  p.rect({ name: 'Logo mark', x: 96, y: 84, w: 40, h: 40, fill: mark, radius: 12 })
  p.text({ name: 'Company name', x: 150, y: 88, w: 500, text: 'Fieldnote', font: 'archivo', bold: true, size: 28, color, on, lines: 1 })
}

export const pitchDeck: TemplateDesign = {
  slug: 'modern-pitch-deck',
  title: 'Modern pitch deck',
  category: 'presentations',
  tags: ['presentation', 'pitch', 'startup', 'deck', 'business', 'investor'],
  description: 'A calm, editorial 16:9 pitch deck in cream, ink and deep green: a cover with a photo, a slide of big numbers and a closing slide.',
  preset: 'presentation',
  featured: true,
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'px', presetId: 'presentation' })

    // 1. Cover.
    const cover = doc.page('Cover', { type: 'solid', color: CREAM }, 'Say who you are and why this matters in one sentence.')
    logo(cover, CREAM, INK, GREEN)
    cover.text({ name: 'Eyebrow', x: 96, y: 330, w: 900, text: 'Seed round  ·  2027', font: 'archivo', bold: true, size: 26, color: GREEN, on: CREAM, spacing: 240, upper: true, lines: 1 })
    cover.text({ name: 'Title', x: 90, y: 380, w: 1000, text: 'Ideas that move people forward.', font: 'lora', size: 118, color: INK, on: CREAM, lh: 1.05, lines: 2 })
    cover.text({ name: 'Subtitle', x: 96, y: 790, w: 820, text: 'Fieldnote turns scattered team knowledge into one place everyone can find and trust.', font: 'archivo', size: 30, color: MUTED, on: CREAM, lh: 1.45, lines: 2 })
    cover.text({ name: 'Presenter', x: 96, y: 950, w: 900, text: 'Jordan Ellis, founder and CEO', font: 'archivo', bold: true, size: 24, color: INK, on: CREAM, lines: 1 })
    photoBackdrop(cover, { name: 'Cover photo stand-in', box: { x: 1180, y: 84, w: 644, h: 912 }, shape: { kind: 'rect', radius: 32 }, tones: { sky: ['#e3ece4', '#c7dccd'], sun: '#f5f0e6', hillFar: '#6d9c80', hillNear: '#1d6b4f' } })
    cover.placeholder({ name: 'Cover photo', x: 1180, y: 84, w: 644, h: 912, mask: 'rounded', maskRadius: 0.05 })
    cover.circle({ name: 'Accent dot', cx: 1180, cy: 860, r: 74, fill: GREEN })
    cover.icon({ name: 'Accent arrow', icon: 'arrowRight', x: 1146, y: 826, size: 68, color: CREAM, width: 2.6 })

    // 2. Why now: three numbers.
    const why = doc.page('Why now', { type: 'solid', color: CREAM }, 'Three facts that make this the right moment. Replace the sample figures with your own and name the source.')
    logo(why, CREAM, INK, GREEN)
    why.text({ name: 'Eyebrow', x: 96, y: 220, w: 900, text: 'Why now', font: 'archivo', bold: true, size: 26, color: GREEN, on: CREAM, spacing: 240, upper: true, lines: 1 })
    why.text({ name: 'Title', x: 92, y: 262, w: 1500, text: 'Three shifts make this the moment', font: 'lora', size: 76, color: INK, on: CREAM, lines: 1 })
    const stats: { icon: IconName; value: string; label: string; text: string }[] = [
      { icon: 'briefcase', value: '62%', label: 'Work is scattered across too many tools', text: 'Teams lose hours every week looking for the latest version of anything.' },
      { icon: 'user', value: '3.2×', label: 'People expect software to feel simple', text: 'They compare every product with the easiest one they use.' },
      { icon: 'clock', value: '14 min', label: 'Getting started takes minutes', text: 'What once took a consultant can now run before the first meeting ends.' },
    ]
    stats.forEach((s, i) => {
      const x = 96 + i * 584
      why.rect({ name: `Card ${i + 1}`, x, y: 440, w: 552, h: 480, fill: CARD, radius: 28 })
      why.circle({ name: `Icon disc ${i + 1}`, cx: x + 76, cy: 516, r: 36, fill: PALE })
      why.icon({ name: `Icon ${i + 1}`, icon: s.icon, x: x + 56, y: 496, size: 40, color: GREEN, width: 2 })
      why.text({ name: `Value ${i + 1}`, x: x + 40, y: 580, w: 480, text: s.value, font: 'archivo', bold: true, size: 110, color: GREEN, on: CARD, lh: 1, lines: 1 })
      why.text({ name: `Label ${i + 1}`, x: x + 40, y: 712, w: 470, text: s.label, font: 'archivo', bold: true, size: 30, color: INK, on: CARD, lh: 1.25 })
      why.text({ name: `Text ${i + 1}`, x: x + 40, y: 800, w: 470, text: s.text, font: 'archivo', size: 23, color: MUTED, on: CARD, lh: 1.45, lines: 2 })
    })
    why.text({ name: 'Source', x: 96, y: 976, w: 1200, text: 'Sample figures: replace them with your own and name the source.', font: 'archivo', size: 20, color: MUTED, on: CREAM, lines: 1 })

    // 3. Thank you.
    const end = doc.page('Thank you', { type: 'solid', color: NIGHT }, 'Close with how to reach you.')
    logo(end, NIGHT, CREAM, PALE)
    end.text({ name: 'Title', x: 90, y: 320, w: 1100, text: 'Thank you', font: 'lora', size: 170, color: CREAM, on: NIGHT, lh: 1, lines: 1 })
    end.text({ name: 'Subtitle', x: 96, y: 520, w: 900, text: 'Let’s build what comes next, together.', font: 'archivo', size: 36, color: PALE, on: NIGHT, lines: 1 })
    const contacts: { icon: IconName; text: string }[] = [
      { icon: 'mail', text: 'hello@fieldnote.example' },
      { icon: 'globe', text: 'fieldnote.example' },
      { icon: 'phone', text: '+1 555 0100' },
    ]
    contacts.forEach((c, i) => {
      end.icon({ name: `${c.text} icon`, icon: c.icon, x: 96, y: 680 + i * 70, size: 34, color: PALE, width: 2 })
      end.text({ name: c.text, x: 150, y: 682 + i * 70, w: 800, text: c.text, font: 'archivo', bold: true, size: 30, color: CREAM, on: NIGHT, lines: 1 })
    })
    avatarBackdrop(end, { name: 'Portrait stand-in', cx: 1550, cy: 520, d: 540, bg: ['#2c5a47', '#1d6b4f'], figure: '#dfe9e1' })
    end.placeholder({ name: 'Portrait', x: 1280, y: 250, w: 540, h: 540, mask: 'circle' })
    end.circle({ name: 'Ring', cx: 1550, cy: 520, r: 300, fill: '#00000000', stroke: GREEN, strokeWidth: 3 })
    return doc
  },
}
