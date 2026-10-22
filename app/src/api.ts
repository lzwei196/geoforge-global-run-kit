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
  progress?: { done: number; total?: number; what: L }
}

async function get(path: string): Promise<Response> {
  const r = await fetch(DATA + path, { cache: 'no-store' })
  if (!r.ok) throw new Error(`${path}: ${r.status}`)
  return r
}
export const getJSON = async <T,>(path: string): Promise<T> => (await get(path)).json()

const tiles = new Map<string, Promise<Record<string, Series>>>()
export const tileName = (lat: number, lon: number, deg: number) => `${Math.floor(lat / deg) * deg}_${Math.floor(lon / deg) * deg}`
export function loadSeries(id: string, lat: number, lon: number, deg: number): Promise<Series | null> {
  const t = tileName(lat, lon, deg)
  if (!tiles.has(t)) tiles.set(t, getJSON<Record<string, Series>>(`series/${t}.json`).catch(e => { tiles.delete(t); throw e }))
  return tiles.get(t)!.then(rows => rows[id] ?? null)
}
export const clearSeries = () => tiles.clear()
