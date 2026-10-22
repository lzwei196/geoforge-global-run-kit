import type { Dams, Live, Manifest, Series } from './api'
import type { Lang, Words } from './i18n'
import { tr } from './i18n'
import { SeriesChart } from './Chart'
import { fmt, stateOf, when } from './format'

function Row({ k, v, note }: { k: string; v: React.ReactNode; note?: string }) {
  return <div><dt>{k}</dt><dd>{v}{note && <span className="note">{note}</span>}</dd></div>
}

export function DamPanel({ i, dams, m, s, lang, w }: { i: number; dams: Dams; m: Manifest; s: Series | null | 'loading' | 'error'; lang: Lang; w: Words }) {
  const name = (lang === 'zh' ? dams.name_zh[i] : dams.name_en[i]) || dams.name_en[i] || dams.id[i]
  const p = m.page
  return (
    <>
      <div className="panel-head"><div><div className="eyebrow">{w.damEye}</div><h2>{name}<small>{dams.id[i]} · {dams.lat[i].toFixed(3)}°, {dams.lon[i].toFixed(3)}°</small></h2></div></div>
      <div className="inputs">
        <div className="card input-card"><div className="card-head"><h3>{w.values}</h3></div><dl>
          {p.values.map(v => {
            const x = dams.values[v.id]?.[i] ?? null
            const shown = x === null ? w.noValue : v.kind === 'cat' ? tr(v.classes?.[x], lang) || '—' : `${fmt(x, 2, lang)} ${v.unit}`
            return <Row key={v.id} k={tr(v.name, lang)} v={shown} note={tr(v.note, lang) || undefined} />
          })}
        </dl></div>
        {p.fields.length > 0 && <div className="card input-card"><div className="card-head"><h3>{w.details}</h3></div><dl>
          {p.fields.map(f => { const x = dams.fields[f.id]?.[i]; return <Row key={f.id} k={tr(f.name, lang)} v={x === null || x === undefined || x === '' ? '—' : `${typeof x === 'number' && !Number.isInteger(x) ? fmt(x, 2, lang) : String(x)}${f.unit ? ' ' + f.unit : ''}`} /> })}
        </dl></div>}
      </div>
      <div className="card"><div className="card-head"><h3>{tr(p.series.what, lang)}</h3><span className="source">{p.series.unit}</span></div>
        {s === 'loading' ? <div className="empty">{w.loading}</div>
          : s === 'error' ? <div className="empty error">{w.seriesErr}</div>
          : s === null || s.t.length < 2 ? <div className="empty">{w.noSeries}</div>
          : <SeriesChart s={s} unit={p.series.unit} lang={lang} labels={{ error: w.error, date: w.date }} />}
      </div>
    </>
  )
}

export function ProjectPanel({ m, lives, lang, w }: { m: Manifest; lives: Record<string, Live | null>; lang: Lang; w: Words }) {
  return (
    <>
      <div className="panel-head"><div><div className="eyebrow">{w.projectEye}</div><h2>{tr(m.title, lang)}<small>{w.by} {tr(m.group, lang)}</small></h2></div></div>
      <p className="lead">{tr(m.text, lang)}</p>
      <div className="card input-card"><dl>
        <Row k={w.region} v={tr(m.page.region, lang)} />
        <Row k={w.method} v={tr(m.page.method, lang)} />
        <Row k={w.periodK} v={`${m.page.period[0]} – ${m.page.period[1]}`} />
        <Row k={w.updatedK} v={when(m.updated_at, lang)} />
      </dl></div>
      <div className="card"><div className="card-head"><h3>{w.runs}</h3></div>
        <ul className="runs">{m.runs.map(r => { const s = stateOf(lives[r.run_id] ?? null, w, lang); return (
          <li key={r.run_id}><i className={`sdot ${s.key}`} /><div><b>{tr(r.name, lang)}</b><span className="muted small"> · {w.started} {r.started}</span><div className="small">{s.text}</div></div></li>
        ) })}</ul>
      </div>
    </>
  )
}
