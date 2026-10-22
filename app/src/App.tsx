import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { clearSeries, getJSON, loadSeries, type Dams, type Live, type Manifest, type Series } from './api'
import { firstLang, hubUrl, saveLang, tr, words, type Lang } from './i18n'
import { CLASS_COLORS, NO_VALUE, RANK, divColor, fmt, range, seqColor, stateOf, when } from './format'
import { MapView } from './MapView'
import { DamPanel, ProjectPanel } from './Panels'

const LIVE_EVERY_MS = 30_000          // run status (live.json): every 30 s
const DATA_EVERY_MS = 120_000         // manifest.json: every 2 min; dams.json is read again only when updated_at changes

class Guard extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  render() { return this.state.err ? <div className="empty error">{this.state.err}</div> : this.props.children }
}

export default function App() {
  const [lang, setLang] = useState<Lang>(firstLang)
  const w = words(lang)
  const [m, setM] = useState<Manifest | null>(null)
  const [dams, setDams] = useState<Dams | null>(null)
  const [lives, setLives] = useState<Record<string, Live | null>>({})
  const [err, setErr] = useState<string | null>(null)
  const [valueId, setValueId] = useState<string | null>(null)
  const [selId, setSelId] = useState<string | null>(null)     // the open dam, by id: list positions change between updates
  const [series, setSeries] = useState<Series | null | 'loading' | 'error'>(null)
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null)
  const [focus, setFocus] = useState<{ point: [number, number]; token: number } | null>(null)
  const [q, setQ] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const detailRef = useRef<HTMLDivElement>(null)
  const stamp = useRef<string | null>(null)

  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; saveLang(lang) }, [lang])
  useEffect(() => { if (m) document.title = `${tr(m.title, lang)} · GeoForge Global Runs` }, [m, lang])

  // data: manifest every 2 min; dams again when the manifest says the data changed
  const loadData = useCallback(() => {
    getJSON<Manifest>('manifest.json').then(mm => {
      setM(mm); setErr(null)
      setValueId(v => v && mm.page.values.some(x => x.id === v) ? v : mm.page.default_value)
      if (stamp.current !== mm.updated_at) {
        return getJSON<Dams>('dams.json').then(d => { stamp.current = mm.updated_at; clearSeries(); setDams(d) })
      }
    }).catch(e => setErr(String(e.message || e)))
  }, [])
  useEffect(() => { loadData(); const t = setInterval(loadData, DATA_EVERY_MS); return () => clearInterval(t) }, [loadData])

  // run status: every 30 s; a run without a readable file shows "no status" (never "running")
  const runIds = m?.runs.map(r => r.run_id).join('|') ?? ''
  useEffect(() => {
    if (!runIds) return
    const read = () => Promise.all(runIds.split('|').map(id => getJSON<Live>(`runs/${encodeURIComponent(id)}/live.json`).catch(() => null).then(l => [id, l] as const)))
      .then(rows => { setLives(Object.fromEntries(rows)); setNow(Date.now()) })
    read(); const t = setInterval(read, LIVE_EVERY_MS); return () => clearInterval(t)
  }, [runIds])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t) }, [])

  const vdef = m?.page.values.find(v => v.id === valueId) ?? null
  const scale = useMemo(() => {
    if (!dams || !vdef) return null
    const vals = dams.values[vdef.id] ?? []
    if (vdef.kind === 'cat') {
      const nc = vdef.classes?.length ?? 0
      return { colors: dams.id.map((_, i) => { const v = vals[i]; return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < nc ? CLASS_COLORS[v % CLASS_COLORS.length] : NO_VALUE }), lo: 0, hi: 0 }
    }
    const div = vdef.scale === 'diverging', [lo, hi] = range(vals, div), f = div ? divColor : seqColor
    return { colors: dams.id.map((_, i) => { const v = vals[i]; return typeof v === 'number' && Number.isFinite(v) ? f((v - lo) / (hi - lo)) : NO_VALUE }), lo, hi }
  }, [dams, vdef])

  const sel = useMemo(() => { if (!dams || selId === null) return null; const i = dams.id.indexOf(selId); return i < 0 ? null : i }, [dams, selId])
  // new dams.json (series cache cleared): read the open dam's series again, or close it if the dam is gone
  useEffect(() => {
    if (!dams || !m || selId === null) return
    const i = dams.id.indexOf(selId)
    if (i < 0) { setSelId(null); setSeries(null); return }
    loadSeries(selId, dams.lat[i], dams.lon[i], m.page.series.tile_deg).then(setSeries).catch(() => setSeries('error'))
  }, [dams])
  // processed = the dam has the main value (page.default_value); a dam still waiting has null there
  const processed = useMemo(() => dams && m ? (dams.values[m.page.default_value] ?? []).filter(v => v !== null && v !== undefined).length : 0, [dams, m])
  const top = useMemo(() => m ? m.runs.map(r => stateOf(lives[r.run_id] ?? null, w, lang, now)).sort((a, b) => RANK[a.key] - RANK[b.key])[0] ?? null : null, [m, lives, w, lang, now])

  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3500) }
  const openDam = (i: number | null) => {
    if (i === null || !dams || !m) return
    setSelId(dams.id[i]); setSeries('loading')
    loadSeries(dams.id[i], dams.lat[i], dams.lon[i], m.page.series.tile_deg).then(setSeries).catch(() => setSeries('error'))
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const search = () => {
    if (!dams) return
    const t = q.trim(), ll = t.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/)
    let i = -1
    if (ll) {                                                  // nearest dam within 0.2°
      let bd = 0.04
      dams.id.forEach((_, k) => { const d = (dams.lat[k] - +ll[1]) ** 2 + (dams.lon[k] - +ll[2]) ** 2; if (d < bd) { bd = d; i = k } })
    } else if (t) {
      const low = t.toLowerCase()
      i = dams.id.findIndex(x => x.toLowerCase() === low)
      if (i < 0) i = dams.id.findIndex((_, k) => String(dams.name_en[k] ?? '').toLowerCase().includes(low) || String(dams.name_zh[k] ?? '').includes(t))
    }
    if (i < 0) return say(w.notFound)
    setFocus({ point: [dams.lat[i], dams.lon[i]], token: Date.now() }); openDam(i)
  }

  if (err && !m) return <div className="fatal">{w.fatal} {err}</div>
  const name = (i: number) => dams ? ((lang === 'zh' ? dams.name_zh[i] : dams.name_en[i]) || dams.name_en[i] || dams.id[i]) : ''
  return (
    <div className="app">
      <header className="top">
        <a className="back-link" href={hubUrl(lang)}>{w.back}</a>
        <div className="brand"><span className="logo" />{m ? tr(m.title, lang) : '…'}</div>
        <div className="search"><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder={w.search} aria-label={w.search} /><button onClick={search}>{w.go}</button></div>
        <button className="lang-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>{w.other}</button>
        <div className={`badge ${top?.key ?? 'unknown'}`}><i />{top ? top.text : m ? w.noStatus : w.loading}</div>
      </header>
      {m?.example && <div className="example-banner">{w.example}</div>}
      <section className="hero">
        <div className="map-wrap">
          {!dams && <div className="map loading">{w.loading}</div>}
          <Guard><MapView dams={dams} colors={scale?.colors ?? null} selected={sel} focus={focus} onPick={openDam} onHover={setHover} /></Guard>
          {m && vdef && <div className="map-side"><div className="layer-box">
            <div className="eyebrow">{w.colourBy}</div>
            <select value={vdef.id} onChange={e => setValueId(e.target.value)}>{m.page.values.map(v => <option key={v.id} value={v.id}>{tr(v.name, lang)}</option>)}</select>
            {vdef.kind === 'num' && scale && <div className="legend-seq"><div className="ramp" style={{ background: `linear-gradient(90deg, ${[0, .17, .33, .5, .67, .83, 1].map(vdef.scale === 'diverging' ? divColor : seqColor).join(',')})` }} />
              <div className="ends"><span>{fmt(scale.lo, 1, lang)}</span><span>{vdef.unit}</span><span>{fmt(scale.hi, 1, lang)}</span></div></div>}
            {vdef.kind === 'cat' && <div className="legend-cat">{(vdef.classes ?? []).map((c, k) => <span key={k}><i style={{ background: CLASS_COLORS[k % CLASS_COLORS.length] }} />{tr(c, lang)}</span>)}</div>}
            <div className="legend-row"><i style={{ background: NO_VALUE }} />{w.noValue}</div>
            {vdef.note && <div className="muted small">{tr(vdef.note, lang)}</div>}
          </div></div>}
          {hover && dams && <div className="hover" style={{ left: hover.x + 14, top: hover.y + 14 }}>
            <b>{name(hover.i)}</b><br />{vdef && (() => { const v = dams.values[vdef.id]?.[hover.i] ?? null; return `${tr(vdef.name, lang)}: ${v === null ? w.noValue : vdef.kind === 'cat' ? tr(vdef.classes?.[v], lang) : `${fmt(v, 1, lang)} ${vdef.unit}`}` })()}
          </div>}
          {toast && <div className="toast" onClick={() => setToast(null)}>{toast}</div>}
        </div>
        <div className="hero-strip">
          <div><b>{fmt(dams?.id.length, 0, lang)}</b><span>{w.dams}</span></div>
          <div><b>{fmt(processed, 0, lang)}</b><span>{w.processed}</span></div>
          <div><b>{m ? `${m.page.period[0].slice(0, 4)}–${m.page.period[1].slice(0, 4)}` : '—'}</b><span>{w.period}</span></div>
          <div><b>{m ? when(m.updated_at, lang) : '—'}</b><span>{w.updated}</span></div>
          <div className="scroll-hint">{w.clickHint}</div>
        </div>
      </section>
      <main className="body">
        <div className="panel" ref={detailRef}><Guard>
          {sel !== null && dams && m ? <DamPanel i={sel} dams={dams} m={m} s={series} lang={lang} w={w} />
            : <div className="intro"><div className="eyebrow">{w.introEye}</div><h2>{w.introTitle}</h2><p className="muted">{w.introText}</p></div>}
        </Guard></div>
        <div className="panel"><Guard>{m && <ProjectPanel m={m} lives={lives} lang={lang} w={w} />}</Guard></div>
      </main>
      <footer className="foot">{m && <>{tr(m.group, lang)} · </>}<a href={hubUrl(lang)}>GeoForge Global Runs</a></footer>
    </div>
  )
}
