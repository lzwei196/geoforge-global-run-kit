import { useMemo, useState } from 'react'
import type { Series } from './api'
import type { Lang } from './i18n'
import { fmt } from './format'

// One dam's displacement over time: a line, a light band for ± error (when given), a zero line and a hover readout.
const W = 720, H = 260, PL = 52, PR = 16, PT = 14, PB = 30

function niceTicks(lo: number, hi: number, n = 5): number[] {
  const span = hi - lo || 1, raw = span / n, mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => span / s <= n) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10))
  return out
}

export function SeriesChart({ s, unit, lang, labels }: { s: Series; unit: string; lang: Lang; labels: { error: string; date: string; none: string } }) {
  const [hi, setHi] = useState<number | null>(null)
  const pts = useMemo(() => s.t.map((t, k) => ({ t: Date.parse(t), d: s.d[k], e: s.e?.[k] ?? null, day: t }))
    .filter(p => Number.isFinite(p.t) && typeof p.d === 'number' && Number.isFinite(p.d)) as { t: number; d: number; e: number | null; day: string }[], [s])
  if (pts.length < 2) return <div className="empty">{labels.none}</div>
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t
  const lows = pts.map(p => p.d - (p.e ?? 0)), highs = pts.map(p => p.d + (p.e ?? 0))
  let y0 = Math.min(0, ...lows), y1 = Math.max(0, ...highs)
  const pad = (y1 - y0) * 0.08 || 1; y0 -= pad; y1 += pad
  const X = (t: number) => PL + ((t - t0) / (t1 - t0 || 1)) * (W - PL - PR)
  const Y = (v: number) => PT + (1 - (v - y0) / (y1 - y0)) * (H - PT - PB)
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.d).toFixed(1)}`).join('')
  const hasErr = pts.some(p => p.e !== null)
  const band = hasErr ? pts.map((p, k) => `${k ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.d + (p.e ?? 0)).toFixed(1)}`).join('') +
    pts.slice().reverse().map(p => `L${X(p.t).toFixed(1)} ${Y(p.d - (p.e ?? 0)).toFixed(1)}`).join('') + 'Z' : ''
  const years: number[] = []
  for (let y = new Date(t0).getUTCFullYear() + 1; y <= new Date(t1).getUTCFullYear(); y++) years.push(y)
  const every = Math.max(1, Math.ceil(years.length / 8))
  const h = hi === null ? null : pts[hi]
  const move = (e: React.MouseEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * (W - PL - PR) + PL
    let best = 0, bd = Infinity
    pts.forEach((p, k) => { const dd = Math.abs(X(p.t) - x); if (dd < bd) { bd = dd; best = k } })
    setHi(best)
  }
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {niceTicks(y0, y1).map(v => <g key={v}><line className="grid" x1={PL} x2={W - PR} y1={Y(v)} y2={Y(v)} /><text className="tick" x={PL - 6} y={Y(v) + 4} textAnchor="end">{fmt(v, 1, lang)}</text></g>)}
        {years.filter((_, k) => k % every === 0).map(y => { const x = X(Date.UTC(y, 0, 1)); return <text key={y} className="tick" x={x} y={H - 10} textAnchor="middle">{y}</text> })}
        <line className="zero" x1={PL} x2={W - PR} y1={Y(0)} y2={Y(0)} />
        {band && <path className="band" d={band} />}
        <path className="series" d={line} />
        <text className="axis-label" x={PL - 44} y={PT + 4}>{unit}</text>
        {h && <g><line className="hover-line" x1={X(h.t)} x2={X(h.t)} y1={PT} y2={H - PB} /><circle cx={X(h.t)} cy={Y(h.d)} r={4} className="hover-dot" /></g>}
        <rect x={PL} y={PT} width={W - PL - PR} height={H - PT - PB} fill="transparent" onMouseMove={move} onMouseLeave={() => setHi(null)} />
      </svg>
      <div className="chart-read">{h ? <>{labels.date} <b>{h.day}</b> · <b>{fmt(h.d, 1, lang)} {unit}</b>{h.e !== null && <> · {labels.error} ± {fmt(h.e, 1, lang)} {unit}</>}</> : ' '}</div>
    </div>
  )
}
