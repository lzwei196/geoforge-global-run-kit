import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Dams } from './api'

// Leaflet map + one canvas with every dam as a dot. A canvas (not one marker per dam) keeps tens of thousands of dams fast.
export function MapView({ dams, colors, selected, focus, onPick, onHover }: {
  dams: Dams | null
  colors: string[] | null                       // one colour per dam, same order as dams.id
  selected: number | null
  focus: { point: [number, number]; token: number } | null
  onPick: (i: number | null) => void
  onHover: (h: { i: number; x: number; y: number } | null) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawRef = useRef<() => void>(() => {})
  const st = useRef({ onPick, onHover }); st.current = { onPick, onHover }
  const dotPx = useRef<{ i: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!box.current || mapRef.current) return
    const map = L.map(box.current, { zoomControl: false, minZoom: 2, maxZoom: 14, zoomSnap: 1, wheelPxPerZoomLevel: 90, maxBounds: [[-75, -200], [85, 200]] })
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
    L.tileLayer(`${esri}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 16, attribution: 'Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors' }).addTo(map)
    L.tileLayer(`${esri}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 16, pane: 'shadowPane' }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map)
    map.setView([33, 105], 4)                                       // China first; change to your area
    const c = document.createElement('canvas'); c.className = 'dot-canvas'
    map.getPanes().overlayPane.appendChild(c); canvasRef.current = c
    mapRef.current = map
    let raf = 0
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => drawRef.current()) }
    map.on('move zoom resize viewreset zoomend moveend', schedule)
    const near = (p: L.Point) => {                               // nearest dot within 8 px
      let best: number | null = null, bd = 64
      for (const d of dotPx.current) { const dd = (d.x - p.x) ** 2 + (d.y - p.y) ** 2; if (dd < bd) { bd = dd; best = d.i } }
      return best
    }
    map.on('click', (e: L.LeafletMouseEvent) => st.current.onPick(near(e.containerPoint)))
    map.on('mousemove', (e: L.LeafletMouseEvent) => { const i = near(e.containerPoint); st.current.onHover(i === null ? null : { i, x: e.containerPoint.x, y: e.containerPoint.y }) })
    map.on('mouseout', () => st.current.onHover(null))
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(box.current)
    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
  }, [])

  drawRef.current = () => {
    const map = mapRef.current, c = canvasRef.current
    if (!map || !c) return
    const size = map.getSize(), dpr = window.devicePixelRatio || 1
    L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]))
    c.width = size.x * dpr; c.height = size.y * dpr
    c.style.width = `${size.x}px`; c.style.height = `${size.y}px`
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size.x, size.y)
    const out: { i: number; x: number; y: number }[] = []
    if (dams && colors) {
      const z = map.getZoom(), r = z < 4 ? 2.4 : z < 6 ? 3.4 : z < 9 ? 4.6 : 6
      for (let i = 0; i < dams.id.length; i++) {
        const p = map.latLngToContainerPoint([dams.lat[i], dams.lon[i]])
        if (p.x < -10 || p.y < -10 || p.x > size.x + 10 || p.y > size.y + 10) continue
        out.push({ i, x: p.x, y: p.y })
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 2 * Math.PI); ctx.fillStyle = colors[i]; ctx.fill()
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(8,12,18,.85)'; ctx.stroke()
      }
      if (selected !== null && selected < dams.id.length) {
        const p = map.latLngToContainerPoint([dams.lat[selected], dams.lon[selected]])
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, 2 * Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke()
      }
    }
    dotPx.current = out
  }

  useEffect(() => { drawRef.current() }, [dams, colors, selected])
  useEffect(() => {
    const map = mapRef.current
    if (map && focus) map.flyTo(focus.point, Math.max(map.getZoom(), 9), { duration: 0.8 })
  }, [focus?.token])

  return <div ref={box} className="map" />
}
