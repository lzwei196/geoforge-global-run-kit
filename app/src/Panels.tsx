import { useState } from 'react'
import { DATA, type DamInfo, type Dams, type Deployment, type Live, type Manifest, type Scope, type Series } from './api'
import type { Lang, Words } from './i18n'
import { fieldLabel, layerLabel, processingLabel, scienceLabel, tr } from './i18n'
import { SeriesChart } from './Chart'
import { fmt, stateOf, when } from './format'
import { isPublicDataPath, scopesForDisplay, showLocalOnlyNotice } from './status'

function Row({ k, v, note, valueId }: { k: string; v: React.ReactNode; note?: string; valueId?: string }) {
  return <div data-value-id={valueId}><dt>{k}</dt><dd>{v}{note && <span className="note">{note}</span>}</dd></div>
}

function toneOf(info: DamInfo): string {
  if (info.science_acceptance_status === '质量未通过') return 'bad'
  if (info.processing_class === 'draft_queued_only' || info.science_acceptance_status === '仅排队草稿') return 'queued'
  return 'pending'
}

function flagText(s: Scope): string {
  const diag = s.diagnostic_only === true ? 'true' : s.diagnostic_only === false ? 'false' : '—'
  const ready = s.platform_ready === true ? 'true' : s.platform_ready === false ? 'false' : '—'
  const inc = s.formal_reliable_increment === undefined || s.formal_reliable_increment === null ? '—' : String(s.formal_reliable_increment)
  return `diagnostic_only=${diag} · platform_ready=${ready} · formal_reliable_increment=${inc}`
}

function Clouds({ info, w }: { info: DamInfo; w: Words }) {
  const imgs = info.images
  const velocity = isPublicDataPath(imgs?.velocity) ? imgs.velocity : null
  const cumulative = !info.no_cumulative && isPublicDataPath(imgs?.cumulative) ? imgs.cumulative : null
  const [dead, setDead] = useState<{ v?: boolean; c?: boolean }>({})
  const showV = !!velocity && !dead.v
  const showC = !!cumulative && !dead.c
  if (!velocity && !cumulative) return <div className="empty">{w.noImages}</div>
  return (
    <div className="cloud-grid">
      {showV && <figure><img src={`${DATA}${velocity}`} alt="velocity" onError={() => setDead(d => ({ ...d, v: true }))} /><figcaption>velocity</figcaption></figure>}
      {showC && <figure><img src={`${DATA}${cumulative}`} alt="cumulative" onError={() => setDead(d => ({ ...d, c: true }))} /><figcaption>cumulative</figcaption></figure>}
      {!showV && !showC && <div className="empty">{w.noImages}</div>}
    </div>
  )
}

function ScopeList({ scopes, lang, w }: { scopes: Scope[]; lang: Lang; w: Words }) {
  if (!scopes.length) return <div className="empty">{w.noScopes}</div>
  return (
    <div className="scope-list">
      {scopes.map((s, n) => (
        <article key={s.record_id || `${s.scope ?? 'scope'}-${n}`} className={`scope${s.science_acceptance_status === '质量未通过' ? ' bad' : ''}${s.diagnostic_only ? ' diag' : ''}`} data-acceptance={s.science_acceptance_status ?? ''} data-diagnostic={s.diagnostic_only ? 'true' : 'false'} data-platform-ready={s.platform_ready ? 'true' : 'false'} data-scope={s.scope ?? ''}>
          <header><b>{s.scope || '—'}</b><span>{scienceLabel(s.science_acceptance_status, lang)}</span></header>
          <dl>
            {s.batch_key ? <Row k={w.batch} v={s.batch_key} /> : null}
            {(s.period_start || s.period_end) ? <Row k={w.window} v={`${s.period_start ?? '—'} – ${s.period_end ?? '—'}`} /> : null}
            {s.export_id ? <Row k={w.exportId} v={s.export_id} /> : null}
            <Row k={w.processing} v={s.processing_status || '—'} />
            <Row k={w.fieldVal} v={fieldLabel(s.field_validation, lang)} />
            <Row k="qc_layer" v={s.qc_layer || '—'} />
            {s.pack_qc ? <Row k="pack_qc" v={s.pack_qc} /> : null}
            <Row k={w.flags} v={flagText(s)} />
            {s.quality_note ? <Row k={w.qualityNote} v={s.quality_note} /> : null}
            {s.source_stream ? <Row k={w.source} v={s.source_stream} /> : null}
            {s.record_id ? <Row k="id" v={s.record_id} /> : null}
          </dl>
        </article>
      ))}
    </div>
  )
}

export function DamPanel({ i, dams, m, s, info, lang, w }: {
  i: number; dams: Dams; m: Manifest; s: Series | null | 'loading' | 'error'
  info: DamInfo | null | 'loading'; lang: Lang; w: Words
}) {
  const name = (lang === 'zh' ? dams.name_zh[i] : dams.name_en[i]) || dams.name_en[i] || dams.id[i]
  const p = m.page
  const los = dams.values.los?.[i]
  const losMissing = los === null || los === undefined
  const loaded = info && info !== 'loading' ? info : null
  const scopes = scopesForDisplay(loaded?.scopes)
  return (
    <>
      <div className="panel-head"><div><div className="eyebrow">{w.damEye}</div><h2>{name}<small>{dams.id[i]} · {dams.lat[i].toFixed(3)}°, {dams.lon[i].toFixed(3)}°</small></h2></div></div>
      {info === 'loading' ? <div className="empty">{w.loading}</div>
        : !loaded ? <div className="empty" data-detail="missing">{w.noDetail}</div>
        : <div className={`status-banner ${toneOf(loaded)}`} data-processing={loaded.processing_class ?? ''} data-acceptance={loaded.science_acceptance_status ?? ''} data-layer={loaded.viewer_layer ?? ''}>
            {loaded.label && <div className="status-label">{loaded.label}</div>}
            <div><b>{w.acceptance}.</b> {scienceLabel(loaded.science_acceptance_status, lang)}</div>
            <div><b>{w.processing}.</b> {processingLabel(loaded.processing_class, lang)}</div>
            <div><b>{w.fieldVal}.</b> {fieldLabel(loaded.field_validation, lang)}</div>
            <div><b>{w.displayLayer}.</b> {layerLabel(loaded.viewer_layer, lang)}</div>
            {loaded.dam_level_rule && !(loaded.note && loaded.note.includes(loaded.dam_level_rule)) && <div>{loaded.dam_level_rule}</div>}
            {loaded.note && <div>{loaded.note}</div>}
            {loaded.d062_identity_note && <div>{loaded.d062_identity_note}</div>}
            {loaded.viewer_layer_meaning && <div className="muted small">{loaded.viewer_layer_meaning}</div>}
            {typeof loaded.formal_reliable_increment === 'number' && <div className="muted small">formal_reliable_increment={loaded.formal_reliable_increment}</div>}
          </div>}
      <div className="inputs">
        <div className="card input-card"><div className="card-head"><h3>{w.values}</h3></div><dl>
          {p.values.map(v => {
            const x = dams.values[v.id]?.[i] ?? null
            const shown = x === null || x === undefined
              ? (v.kind === 'cat' ? w.missing : w.noValue)
              : v.kind === 'cat' ? tr(v.classes?.[x], lang) || '—' : `${fmt(x, 2, lang)}${v.unit ? ' ' + v.unit : ''}`
            return <Row key={v.id} valueId={v.id} k={tr(v.name, lang)} v={shown} note={tr(v.note, lang) || undefined} />
          })}
        </dl></div>
        {p.fields.length > 0 && <div className="card input-card"><div className="card-head"><h3>{w.details}</h3></div><dl>
          {p.fields.map(f => {
            const x = dams.fields[f.id]?.[i]
            const text = x === null || x === undefined || x === '' ? '—' : `${typeof x === 'number' && !Number.isInteger(x) ? fmt(x, 2, lang) : String(x)}${f.unit ? ' ' + f.unit : ''}`
            const note = text !== '—' && f.id === 'QC' ? w.qcNote : text !== '—' && f.id === 'VAL' ? w.valNote : undefined
            return <Row key={f.id} valueId={f.id} k={tr(f.name, lang)} v={text} note={note} />
          })}
        </dl></div>}
      </div>
      {losMissing && <div className="muted small no-fill">{w.noFill}</div>}
      <div className="card"><div className="card-head"><h3>{w.scopesTitle}</h3></div>
        {info === 'loading' ? <div className="empty">{w.loading}</div>
          : !loaded ? <div className="empty" data-detail="missing">{w.noDetail}</div>
          : <ScopeList scopes={scopes} lang={lang} w={w} />}
      </div>
      <div className="card"><div className="card-head"><h3>{w.pointsTitle}</h3></div>
        {info === 'loading' ? <div className="empty">{w.loading}</div>
          : !loaded ? <div className="empty" data-detail="missing">{w.noDetail}</div>
          : !(loaded.points && loaded.points.length) ? <div className="empty">{w.noPoints}</div>
          : <dl className="point-list">{loaded.points.map((pt, n) => (
              <div key={n}><dt>{pt.role === 'reference' ? w.refPoint : w.monitorPoint}</dt><dd>
                {pt.name || '—'}{' · '}{pt.lat != null && pt.lon != null ? `${pt.lat.toFixed(5)}N, ${pt.lon.toFixed(5)}E` : '—'}
                {pt.row != null && pt.col != null ? ` · rc=(${pt.row},${pt.col})` : ''}
                {pt.tcoh != null ? ` · tcoh=${fmt(pt.tcoh, 2, lang)}` : ''}
                {pt.source ? <span className="note">{pt.source}</span> : null}
              </dd></div>
            ))}</dl>}
      </div>
      <div className="card"><div className="card-head"><h3>{w.cloudTitle}</h3></div>
        {info === 'loading' ? <div className="empty">{w.loading}</div>
          : !loaded ? <div className="empty" data-detail="missing">{w.noDetail}</div>
          : <Clouds info={loaded} w={w} />}
      </div>
      <div className="card"><div className="card-head"><h3>{tr(p.series.what, lang)}</h3><span className="source">{p.series.unit}</span></div>
        {s === 'loading' ? <div className="empty">{w.loading}</div>
          : s === 'error' ? <div className="empty error">{w.seriesErr}</div>
          : s === null || s.t.length < 2 ? <div className="empty">{w.noSeries}</div>
          : <SeriesChart s={s} unit={p.series.unit} lang={lang} labels={{ error: w.error, date: w.date, none: w.noSeries }} />}
      </div>
    </>
  )
}

export function ProjectPanel({ m, lives, deployment, lang, w }: { m: Manifest; lives: Record<string, Live | null>; deployment: Deployment | null; lang: Lang; w: Words }) {
  return (
    <>
      <div className="panel-head"><div><div className="eyebrow">{w.projectEye}</div><h2>{tr(m.title, lang)}<small>{w.by} {tr(m.group, lang)}</small></h2></div></div>
      <p className="lead">{tr(m.text, lang)}</p>
      <div className="card input-card"><dl>
        <Row k={w.region} v={tr(m.page.region, lang)} />
        <Row k={w.method} v={tr(m.page.method, lang)} />
        <Row k={w.periodK} v={`${m.page.period[0]} – ${m.page.period[1]}`} />
        <Row k={w.updatedK} v={when(m.updated_at, lang)} />
        {showLocalOnlyNotice(deployment) && <Row k={lang === 'zh' ? '部署' : 'Deploy'} v={w.localPreview} />}
      </dl></div>
      <div className="card"><div className="card-head"><h3>{w.runs}</h3></div>
        <ul className="runs">{m.runs.map(r => { const s = stateOf(lives[r.run_id] ?? null, w, lang); return (
          <li key={r.run_id}><i className={`sdot ${s.key}`} /><div><b>{tr(r.name, lang)}</b><span className="muted small"> · {w.started} {r.started}</span><div className="small">{s.text}</div></div></li>
        ) })}</ul>
      </div>
    </>
  )
}
