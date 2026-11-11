// Status counts and detail lookup. These read source fields; they do not decide scientific acceptance.
import type { Series } from './api'
import { CLASS_COLORS, NO_VALUE, divColor, range, seqColor } from './format'

function safeId(v: unknown, out: string[]) {
  if (typeof v !== 'string') return
  const t = v.trim()
  if (!t || t.includes('/') || t.includes('\\') || t.includes('..')) return
  if (!out.includes(t)) out.push(t)
}

export function detailCandidates(id: string, exportId: unknown): string[] {
  const out: string[] = []
  safeId(id, out)
  safeId(exportId, out)
  return out
}

// Names a reader may already have: the stable id, the export field, and ids copied onto the detail record.
export function detailAliases(info: { dam_id?: string; export_id?: string | null; old_28_point_ids?: string[] | null; scopes?: { export_id?: string | null }[] | null } | null | undefined): string[] {
  const out: string[] = []
  if (!info) return out
  safeId(info.dam_id, out)
  safeId(info.export_id, out)
  for (const id of info.old_28_point_ids ?? []) safeId(id, out)
  for (const s of info.scopes ?? []) safeId(s?.export_id, out)
  return out
}

export function countByProcessing(classes: (string | null | undefined)[]): { processed: number; queued: number; known: number } {
  let processed = 0, queued = 0, known = 0
  for (const c of classes) {
    if (c === 'actually_processed') { processed++; known++ }
    else if (c === 'draft_queued_only') { queued++; known++ }
    else if (typeof c === 'string' && c) known++ // present but not a known class: do not call it processed
  }
  return { processed, queued, known }
}

// Displayed is the pin count. Processed/queued come from processing_class when any dam has one.
// A non-null colour class (layer_cat) is not a processed count. While classes are still loading, processed stays null.
export function heroCounts(displayed: number, classes: (string | null | undefined)[] | null, legacyProcessed: number): {
  displayed: number; processed: number | null; queued: number | null; fromStatus: boolean
} {
  if (!classes) return { displayed, processed: null, queued: null, fromStatus: false }
  const c = countByProcessing(classes)
  if (c.known === 0) return { displayed, processed: legacyProcessed, queued: null, fromStatus: false }
  return { displayed, processed: c.processed, queued: c.queued, fromStatus: true }
}

export function legacyProcessed(vals: (number | null | undefined)[] | undefined): number {
  return (vals ?? []).filter(v => v !== null && v !== undefined).length
}

export type ColourDef = { kind: 'num' | 'cat'; classes?: number; scale?: 'diverging' | 'sequential' }

// null is not 0: a missing rate stays the gray swatch, including on a diverging scale whose middle is zero.
export function colorsFor(vals: (number | null | undefined)[], def: ColourDef): { colors: string[]; lo: number; hi: number; finite: number } {
  if (def.kind === 'cat') {
    const nc = def.classes ?? 0
    const colors = vals.map(v => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < nc ? CLASS_COLORS[v % CLASS_COLORS.length] : NO_VALUE))
    return { colors, lo: 0, hi: 0, finite: colors.filter(c => c !== NO_VALUE).length }
  }
  const div = def.scale === 'diverging'
  const [lo, hi] = range(vals.map(v => (typeof v === 'number' ? v : null)), div)
  const f = div ? divColor : seqColor
  let finite = 0
  const colors = vals.map(v => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return NO_VALUE
    finite++
    return f((v - lo) / (hi - lo))
  })
  return { colors, lo, hi, finite }
}

// A missing processing percent stays missing. Do not substitute 0 or 100.
export function formatMeasured(v: unknown, unit: string, text: (n: number) => string, missing: string): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return missing
  return `${text(v)}${unit ? ' ' + unit : ''}`.trim()
}

export function seriesFromTile<T extends Series>(rows: Record<string, T> | null | undefined, keys: string[]): T | null {
  if (!rows) return null
  for (const k of keys) {
    const s = rows[k]
    if (s && Array.isArray(s.t)) return s
  }
  return null
}

// Keep every scope. A main pin does not drop a failed or diagnostic window, and does not rewrite its status.
export function scopesForDisplay<T>(scopes: T[] | null | undefined): T[] {
  if (!Array.isArray(scopes)) return []
  return scopes.filter((s): s is T => s != null)
}

export function isPublicDataPath(p: unknown): p is string {
  if (typeof p !== 'string') return false
  const s = p.trim()
  if (!s || s.includes('..') || s.startsWith('/') || s.startsWith('\\') || /^[a-zA-Z]:/.test(s) || s.includes('://')) return false
  return true
}

export type DeploymentMeta = {
  surface?: string
  local_only?: boolean
  unpublished?: boolean
  claims_scientific_validation?: boolean
  progress_href?: string
}

// Local-only wording is shown only when deployment metadata says so. The validation flag never turns into a pass.
export function showLocalOnlyNotice(dep: DeploymentMeta | null | undefined): boolean {
  return dep?.local_only === true || dep?.unpublished === true
}

export function progressHref(dep: DeploymentMeta | null | undefined): string | null {
  const h = dep?.progress_href
  if (typeof h !== 'string' || !h.startsWith('/') || h.startsWith('//')) return null
  return h
}
