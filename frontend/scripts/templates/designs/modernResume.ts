import { avatarBackdrop } from '../decor'
import type { FabricObject } from 'fabric'
import { DocBuilder, type PageBuilder } from '../kit'
import { INK, MUTED, RED, WHITE } from '../palette'
import type { TemplateDesign } from '../registry'

const W = 794
const H = 1123
const SIDE = 270
const SIDEBAR = RED[900]
const X0 = 348
const COL = 392

interface Job {
  role: string
  company: string
  dates: string
  bullets: string[]
}

const JOBS: Job[] = [
  {
    role: 'Senior Product Designer',
    company: 'Harbor & Pine Studio',
    dates: '2022 – Present',
    bullets: [
      'Led the redesign of the core product used by 40,000 customers and lifted task completion by 18%.',
      'Built a shared design system now used by five product teams.',
      'Mentored three designers and ran the weekly critique.',
    ],
  },
  {
    role: 'Product Designer',
    company: 'Fernlight Software',
    dates: '2019 – 2022',
    bullets: ['Shipped a mobile onboarding flow that cut drop-off by a third.', 'Worked with engineers to release 30+ accessible components.'],
  },
  {
    role: 'Junior Designer',
    company: 'Studio Quill',
    dates: '2017 – 2019',
    bullets: ['Designed websites and brand identities for more than 20 small businesses.'],
  },
]

function sideHeading(p: PageBuilder, y: number, label: string): void {
  p.text({ name: `${label} heading`, x: 34, y, w: 202, text: label, font: 'montserrat', bold: true, size: 12, color: RED[200], on: SIDEBAR, spacing: 260, upper: true, lines: 1 })
  p.line({ name: `${label} rule`, x1: 34, y1: y + 24, x2: 236, y2: y + 24, color: RED[700], width: 1.5 })
}

function mainHeading(p: PageBuilder, y: number, label: string): void {
  p.text({ name: `${label} heading`, x: X0, y, w: COL, text: label, font: 'montserrat', bold: true, size: 13, color: RED[700], on: WHITE, spacing: 260, upper: true, lines: 1 })
  p.line({ name: `${label} rule`, x1: X0, y1: y + 26, x2: X0 + COL, y2: y + 26, color: RED[200], width: 1.5 })
}

export const modernResume: TemplateDesign = {
  slug: 'modern-resume',
  title: 'Modern resume',
  category: 'resumes',
  tags: ['resume', 'cv', 'a4', 'job', 'career', 'professional', 'print'],
  description: 'A two-column A4 resume: a dark sidebar with photo, contact, skills and languages, and a timeline of experience.',
  preset: 'a4',
  featured: false,
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'mm', presetId: 'a4' })
    const p = doc.page('Resume', { type: 'solid', color: WHITE })

    p.rect({ name: 'Sidebar', x: 0, y: 0, w: SIDE, h: H, fill: SIDEBAR, locked: true })

    // Photo.
    p.circle({ name: 'Photo ring', cx: SIDE / 2, cy: 130, r: 84, fill: '#00000000', stroke: RED[400], strokeWidth: 2.5 })
    avatarBackdrop(p, { name: 'Photo backdrop', cx: SIDE / 2, cy: 130, d: 150, bg: [RED[300], RED[400]], figure: RED[100] })
    p.placeholder({ name: 'Profile photo', x: SIDE / 2 - 75, y: 55, w: 150, h: 150, mask: 'circle' })

    // Contact.
    sideHeading(p, 246, 'Contact')
    const contact: { icon: 'phone' | 'mail' | 'pin' | 'globe'; text: string; lines: number }[] = [
      { icon: 'phone', text: '+1 555 0142', lines: 1 },
      { icon: 'mail', text: 'jordan@yourmail.example', lines: 1 },
      { icon: 'pin', text: '12 Maple Avenue, Lakeside', lines: 1 },
      { icon: 'globe', text: 'yourportfolio.example', lines: 1 },
    ]
    contact.forEach((row, i) => {
      const y = 290 + i * 36
      p.icon({ name: `${row.icon} icon`, icon: row.icon, x: 34, y: y - 1, size: 18, color: RED[300], width: 1.8 })
      p.text({ name: `Contact ${i + 1}`, x: 64, y, w: 190, text: row.text, font: 'inter', size: 12, color: WHITE, on: SIDEBAR, lines: row.lines })
    })

    // Skills with level bars.
    sideHeading(p, 452, 'Skills')
    const skills: [string, number][] = [['Product design', 0.95], ['UX research', 0.85], ['Prototyping', 0.9], ['Design systems', 0.9], ['Facilitation', 0.75], ['HTML and CSS', 0.65]]
    skills.forEach(([label, level], i) => {
      const y = 496 + i * 44
      p.text({ name: `Skill ${i + 1}`, x: 34, y, w: 202, text: label, font: 'inter', size: 12, color: WHITE, on: SIDEBAR, lines: 1 })
      p.rect({ name: `Skill ${i + 1} track`, x: 34, y: y + 22, w: 202, h: 6, fill: RED[800], radius: 3 })
      p.rect({ name: `Skill ${i + 1} level`, x: 34, y: y + 22, w: Math.round(202 * level), h: 6, fill: RED[300], radius: 3 })
    })

    // Languages with dots.
    sideHeading(p, 782, 'Languages')
    const languages: [string, number][] = [['English', 5], ['Spanish', 4], ['French', 2]]
    languages.forEach(([label, level], i) => {
      const y = 826 + i * 34
      p.text({ name: `Language ${i + 1}`, x: 34, y, w: 120, text: label, font: 'inter', size: 12, color: WHITE, on: SIDEBAR, lines: 1 })
      for (let dot = 0; dot < 5; dot++) {
        p.circle({ name: `Language ${i + 1} dot ${dot + 1}`, cx: 160 + dot * 18 + 5, cy: y + 8, r: 5, fill: dot < level ? RED[300] : RED[800] })
      }
    })

    // Interests as tags.
    sideHeading(p, 944, 'Interests')
    const tags = ['Typography', 'Hiking', 'Pottery', 'Film photography']
    let tx = 34
    let ty = 988
    tags.forEach((tag, i) => {
      const w = Math.round(p.measure({ name: tag, x: 0, y: 0, w: 300, text: tag, font: 'inter', size: 11.5, color: WHITE, on: RED[800] }).widest + 26)
      if (tx + w > 236) {
        tx = 34
        ty += 36
      }
      p.rect({ name: `Interest ${i + 1} tag`, x: tx, y: ty, w, h: 28, fill: RED[800], radius: 14 })
      p.text({ name: `Interest ${i + 1}`, x: tx, y: ty + 7, w, text: tag, font: 'inter', size: 11.5, color: WHITE, on: RED[800], align: 'center', lines: 1 })
      tx += w + 8
    })

    // Name and profile.
    p.text({ name: 'Name', x: X0 - 4, y: 54, w: COL + 40, text: 'Jordan Ellis', font: 'montserrat', bold: true, size: 44, color: INK, on: WHITE, lh: 1.1, lines: 1 })
    p.text({ name: 'Job title', x: X0, y: 112, w: COL, text: 'Product designer', font: 'montserrat', size: 15, color: RED[700], on: WHITE, spacing: 300, upper: true, lines: 1 })
    mainHeading(p, 168, 'Profile')
    const profile = p.text({ name: 'Profile text', x: X0, y: 206, w: COL, text: 'Designer with seven years of experience turning complex problems into simple, accessible products. I work closely with research and engineering, and I care about clear writing and consistent systems.', font: 'inter', size: 12, color: MUTED, on: WHITE, lh: 1.6 })

    // Experience: a timeline with one block per job.
    let y = profile.bottom + 34
    mainHeading(p, y, 'Experience')
    y += 52
    const timelineTop = y + 8
    let lastDot = y + 8
    let firstDot: FabricObject | null = null
    JOBS.forEach((job, i) => {
      const dot = p.circle({ name: `Timeline dot ${i + 1}`, cx: 322, cy: y + 10, r: 6, fill: RED[600] })
      firstDot ??= dot
      lastDot = y + 10
      p.text({ name: `Role ${i + 1}`, x: X0, y, w: 250, text: job.role, font: 'montserrat', bold: true, size: 15, color: INK, on: WHITE, lines: 1 })
      p.text({ name: `Dates ${i + 1}`, x: X0 + 250, y: y + 2, w: COL - 250, text: job.dates, font: 'inter', size: 11.5, color: MUTED, on: WHITE, align: 'right', lines: 1 })
      p.text({ name: `Company ${i + 1}`, x: X0, y: y + 24, w: COL, text: job.company, font: 'inter', bold: true, size: 12.5, color: RED[700], on: WHITE, lines: 1 })
      y += 54
      job.bullets.forEach((bullet, k) => {
        p.circle({ name: `Bullet ${i + 1}.${k + 1}`, cx: X0 + 3, cy: y + 9, r: 2.5, fill: RED[600] })
        const text = p.text({ name: `Achievement ${i + 1}.${k + 1}`, x: X0 + 14, y, w: COL - 14, text: bullet, font: 'inter', size: 12, color: MUTED, on: WHITE, lh: 1.5 })
        y += text.h + 7
      })
      y += 18
    })
    const timeline = p.line({ name: 'Timeline', x1: 322, y1: timelineTop, x2: 322, y2: lastDot, color: RED[200], width: 2 })
    if (firstDot) p.placeBelow(timeline, firstDot)

    // Education.
    mainHeading(p, y, 'Education')
    y += 50
    p.text({ name: 'Degree', x: X0, y, w: 270, text: 'BA Interaction Design', font: 'montserrat', bold: true, size: 15, color: INK, on: WHITE, lines: 1 })
    p.text({ name: 'Study dates', x: X0 + 250, y: y + 2, w: COL - 250, text: '2013 – 2017', font: 'inter', size: 11.5, color: MUTED, on: WHITE, align: 'right', lines: 1 })
    p.text({ name: 'School', x: X0, y: y + 24, w: COL, text: 'Lakeshore University', font: 'inter', bold: true, size: 12.5, color: RED[700], on: WHITE, lines: 1 })
    y += 76
    mainHeading(p, y, 'Certifications')
    y += 50
    const certs: [string, string, string][] = [['Accessibility Specialist', 'Inclusive Design Institute', '2021'], ['Facilitation Fundamentals', 'Workshop Collective', '2020']]
    certs.forEach(([title, issuer, year], i) => {
      p.text({ name: `Certificate ${i + 1}`, x: X0, y, w: 270, text: title, font: 'montserrat', bold: true, size: 15, color: INK, on: WHITE, lines: 1 })
      p.text({ name: `Certificate ${i + 1} year`, x: X0 + 250, y: y + 2, w: COL - 250, text: year, font: 'inter', size: 11.5, color: MUTED, on: WHITE, align: 'right', lines: 1 })
      p.text({ name: `Certificate ${i + 1} issuer`, x: X0, y: y + 24, w: COL, text: issuer, font: 'inter', bold: true, size: 12.5, color: RED[700], on: WHITE, lines: 1 })
      y += 62
    })
    if (y > H - 40) doc.problems.push(`resume content ends at ${y}, past the bottom margin`)
    return doc
  },
}
