// The files this page reads. They sit in ./data/ next to index.html; docs/DATA_FORMAT.md describes every field.
// Write them with your own pipeline (tools/make_example_data.py shows the shapes) and check them with tools/check_data.py.
export const DATA = `${import.meta.env.BASE_URL}data/`

export type L = { en: string; zh: string }                       // every text the reader sees comes in both languages
export type ValueDef = {
  id: string; name: L; unit: string; kind: 'num' | 'cat'
  scale?: 'diverging' | 'sequential'                             // diverging: 0 in the middle (e.g. a displacement rate)
  classes?: L[]                                                   // kind 'cat': class names; the dam's value is the class index
  note?: L
}
export type FieldDef = { id: string; name: L; unit?: string }
export type FeedRun = { run_id: string; name: L; started: string }
export type Manifest = {
  feed_version: 1; project_id: string; example?: boolean; updated_at: string
  group: L; title: L; text: L; tags: { en: string[]; zh: string[] }; facts?: L[]; map_url?: string
  runs: FeedRun[]
  page: {
    region: L; method: L; period: [string, string]
    values: ValueDef[]; default_value: string; fields: FieldDef[]
    series: { unit: string; what: L; tile_deg: number }
  }
}
// all dams, one array per column (same order everywhere); null = no value yet
export type Dams = {
  id: string[]; lat: number[]; lon: number[]; name_en: string[]; name_zh: string[]
  values: Record<string, (number | null)[]>
  fields: Record<string, (string | number | null)[]>
}
export type Series = { t: string[]; d: (number | null)[]; e?: (number | null)[] }   // dates YYYY-MM-DD, value, optional ± error
export type Live = {
  run_id: string; status: 'running' | 'paused' | 'stopped' | 'finished' | 'failed'; process_alive: boolean
  exported_at: string; last_activity: string; step?: L; note?: L
  // done is optional: a feed may publish unique-dam counts without a percent. Missing done is not 100.
  progress?: { done?: number; total?: number; what: L }
}
export type Scope = {
  scope?: string; record_id?: string; export_id?: string | null; batch_key?: string | null
  period_start?: string | null; period_end?: string | null; processing_status?: string
  science_acceptance_status?: string; field_validation?: string; qc_layer?: string; pack_qc?: string | null
  diagnostic_only?: boolean; platform_ready?: boolean; formal_reliable_increment?: number
  quality_note?: string; source_stream?: string
}
export type DamPoint = {
  name?: string; role?: string; lat?: number | null; lon?: number | null
  row?: number | null; col?: number | null; tcoh?: number | null; source?: string | null
}
export type DamInfo = {
  dam_id?: string; export_id?: string | null; label?: string; note?: string
  science_acceptance_status?: string; field_validation?: string; processing_class?: string
  viewer_layer?: string; viewer_layer_meaning?: string; dam_level_rule?: string
  formal_reliable_increment?: number; d062_identity_note?: string | null
  old_28_point_ids?: string[] | null
  images?: { velocity?: string | null; cumulative?: string | null } | null
  no_cumulative?: boolean; points?: DamPoint[] | null; scopes?: Scope[] | null
}
export type Deployment = {
  surface?: string; local_only?: boolean; unpublished?: boolean
  claims_scientific_validation?: boolean; progress_href?: string
}

async function get(path: string): Promise<Response> {
  const r = await fetch(DATA + path, { cache: 'no-store' })
  if (!r.ok) throw new Error(`${path}: ${r.status}`)
  return r
}
export const getJSON = async <T,>(path: string): Promise<T> => (await get(path)).json()

export function isNotFound(e: unknown): boolean {
  return /: 404\b/.test(String((e as Error)?.message || e))
}

const tiles = new Map<string, Promise<Record<string, Series>>>()
export const tileName = (lat: number, lon: number, deg: number) => `${Math.floor(lat / deg) * deg}_${Math.floor(lon / deg) * deg}`
// keys: stable dam id first, then an export alias. A missing tile is an empty series, not a hard error.
export function loadSeries(lat: number, lon: number, deg: number, keys: string[]): Promise<Series | null> {
  const t = tileName(lat, lon, deg)
  if (!tiles.has(t)) {
    const p = getJSON<Record<string, Series>>(`series/${t}.json`).then(rows => rows, e => {
      if (isNotFound(e)) return {}
      tiles.delete(t)
      throw e
    })
    tiles.set(t, p)
  }
  return tiles.get(t)!.then(rows => {
    for (const k of keys) {
      const s = rows[k]
      if (s && Array.isArray(s.t)) return s
    }
    return null
  })
}
export const clearSeries = () => tiles.clear()

const details = new Map<string, Promise<DamInfo | null>>()
// Try the stable dam id, then the export alias. A 404 on one name is not a missing dam if another name exists.
export function loadDetail(candidates: string[]): Promise<DamInfo | null> {
  const key = candidates.join('\n')
  if (!details.has(key)) {
    details.set(key, (async () => {
      for (const id of candidates) {
        try { return await getJSON<DamInfo>(`dam_detail/${encodeURIComponent(id)}/info.json`) }
        catch { /* next alias */ }
      }
      return null
    })())
  }
  return details.get(key)!
}
export const clearDetails = () => details.clear()

export function loadDeployment(): Promise<Deployment | null> {
  return fetch(`${import.meta.env.BASE_URL}deployment.json`, { cache: 'no-store' })
    .then(r => (r.ok ? r.json() as Promise<Deployment> : null))
    .catch(() => null)
}
