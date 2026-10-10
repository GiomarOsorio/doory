/**
 * Stand-ins drawn behind photo slots. An empty slot is an editing aid and never appears in an export or a thumbnail,
 * so each one gets a quiet picture of its own (sky, sun and hills, or a person) in the template's colours; the photo the
 * user adds covers it exactly.
 */
import type { FabricObject } from 'fabric'
import type { PageBuilder } from './kit'
import { archPolygon, clipToConvex, ellipsePolygon, leafPath, polygonPath, roundedRectPolygon, type Rect } from './geometry'

type Point = readonly [number, number]

export type FrameShape = { kind: 'rect'; radius?: number } | { kind: 'circle' } | { kind: 'arch' }


export interface BackdropTones {
  /** Top and bottom colour of the sky. */
  sky: readonly [string, string]
  sun: string
  hillFar: string
  hillNear: string
}

export function frameOutline(box: Rect, shape: FrameShape): Point[] {
  if (shape.kind === 'circle') return ellipsePolygon(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2)
  if (shape.kind === 'arch') return archPolygon(box.x, box.y, box.w, box.h)
  return roundedRectPolygon(box.x, box.y, box.w, box.h, shape.radius ?? 0)
}

function hill(box: Rect, baseline: number, amplitude: number, waves: number, phase: number): Point[] {
  const points: Point[] = [[box.x - 2, box.y + box.h + 2]]
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const x = box.x - 2 + ((box.w + 4) * i) / steps
    points.push([x, box.y + baseline * box.h - amplitude * box.h * Math.sin(phase + (i / steps) * waves * Math.PI)])
  }
  points.push([box.x + box.w + 2, box.y + box.h + 2])
  return points
}

/** A landscape stand-in for a rectangular, arched or round photo slot, as one locked group. */
export function photoBackdrop(p: PageBuilder, o: { name: string; box: Rect; shape: FrameShape; tones: BackdropTones }): void {
  const { box, tones } = o
  const outline = frameOutline(box, o.shape)
  const members: FabricObject[] = [
    p.path({
      name: 'Sky',
      d: polygonPath(outline),
      fill: { angle: 90, stops: [[0, tones.sky[0]], [1, tones.sky[1]]] },
    }),
  ]
  const short = Math.min(box.w, box.h)
  const sun = ellipsePolygon(box.x + box.w * 0.66, box.y + box.h * 0.34, short * 0.13, short * 0.13, 72)
  const sunClipped = clipToConvex(sun, outline)
  if (sunClipped.length > 2) members.push(p.path({ name: 'Sun', d: polygonPath(sunClipped), fill: tones.sun }))
  const far = clipToConvex(hill(box, 0.7, 0.07, 1.6, 0.4), outline)
  const near = clipToConvex(hill(box, 0.84, 0.06, 1.2, 2.2), outline)
  if (far.length > 2) members.push(p.path({ name: 'Far hills', d: polygonPath(far), fill: tones.hillFar }))
  if (near.length > 2) members.push(p.path({ name: 'Near hills', d: polygonPath(near), fill: tones.hillNear }))
  p.group(o.name, members, { locked: true })
}

/** A person stand-in (head and shoulders) for a round avatar slot, as one locked group. */
export function avatarBackdrop(p: PageBuilder, o: { name: string; cx: number; cy: number; d: number; bg: readonly [string, string]; figure: string }): void {
  const r = o.d / 2
  const outline = ellipsePolygon(o.cx, o.cy, r, r)
  // Clipped to a hair outside the round frame so no seam of the page colour shows between figure and frame.
  const shoulders = clipToConvex(ellipsePolygon(o.cx, o.cy + r * 1.02, r * 0.78, r * 0.62), ellipsePolygon(o.cx, o.cy, r + 1, r + 1))
  const members: FabricObject[] = [
    p.path({ name: 'Background', d: polygonPath(outline), fill: { angle: 45, stops: [[0, o.bg[0]], [1, o.bg[1]]] } }),
    p.circle({ name: 'Head', cx: o.cx, cy: o.cy - r * 0.18, r: r * 0.27, fill: o.figure }),
    p.path({ name: 'Shoulders', d: polygonPath(shoulders), fill: o.figure }),
  ]
  p.group(o.name, members, { locked: true })
}

/** A horizontal sprig of leaves and berries growing out from its centre, as one locked group. */
export function sprig(p: PageBuilder, o: { name: string; cx: number; cy: number; span: number; leaf: string; berry: string; flip?: boolean }): void {
  const half = o.span / 2
  const dir = o.flip ? -1 : 1
  const stem = `M ${o.cx - half} ${o.cy} Q ${o.cx} ${o.cy + dir * 7} ${o.cx + half} ${o.cy}`
  const members: FabricObject[] = [p.path({ name: 'Stem', d: stem, stroke: o.leaf, strokeWidth: 1.6, round: true })]
  const leaves: string[] = []
  const steps = 5
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.6) / (steps + 0.4)
      const x = o.cx + side * half * t
      const y = o.cy + dir * 7 * 0.5 * (1 - t * t) * 1.0
      const length = 30 - i * 3.2
      const turn = side === 1 ? 0 : 180
      leaves.push(leafPath([x, y], turn + side * dir * -34, length, length * 0.24))
      leaves.push(leafPath([x, y], turn + side * dir * 34, length, length * 0.24))
    }
  }
  members.push(p.path({ name: 'Leaves', d: leaves.join(' '), fill: o.leaf }))
  members.push(p.circle({ name: 'Berry left', cx: o.cx - half - 3, cy: o.cy, r: 3.6, fill: o.berry }))
  members.push(p.circle({ name: 'Berry right', cx: o.cx + half + 3, cy: o.cy, r: 3.6, fill: o.berry }))
  members.push(p.circle({ name: 'Berry centre', cx: o.cx, cy: o.cy + dir * 3.5, r: 4.4, fill: o.berry }))
  p.group(o.name, members, { locked: true })
}

/** A head-and-shoulders stand-in that fills a rectangular (rounded) portrait slot, as one locked group. */
export function portraitBackdrop(p: PageBuilder, o: { name: string; box: Rect; radius: number; bg: readonly [string, string]; figure: string }): void {
  const { box } = o
  const outline = roundedRectPolygon(box.x, box.y, box.w, box.h, o.radius)
  const cx = box.x + box.w / 2
  const shoulders = clipToConvex(ellipsePolygon(cx, box.y + box.h * 1.02, box.w * 0.46, box.h * 0.34), outline)
  const members: FabricObject[] = [
    p.path({ name: 'Background', d: polygonPath(outline), fill: { angle: 60, stops: [[0, o.bg[0]], [1, o.bg[1]]] } }),
    p.circle({ name: 'Head', cx, cy: box.y + box.h * 0.4, r: box.w * 0.19, fill: o.figure }),
    p.path({ name: 'Shoulders', d: polygonPath(shoulders), fill: o.figure }),
  ]
  p.group(o.name, members, { locked: true })
}
