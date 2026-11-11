// Page words in English and Chinese. Texts about YOUR project (title, value names, notes) come from manifest.json instead.
// Keep the words plain: say what a reader sees, no jargon.
import type { L } from './api'

export type Lang = 'en' | 'zh'
const W = {
  en: {
    back: '← Global runs', other: '中文', search: 'Dam name, id or “lat, lon”', go: 'Go', loading: 'Loading…',
    fatal: 'The map data could not be read:', example: 'Example data: made up to show how the page works. These are not real measurements.',
    colourBy: 'Colour = a value', noValue: 'no outward number', missing: 'missing', shown: 'dams on the map', notFound: 'No dam found. Try a name, an id or “lat, lon”.',
    dams: 'dams in the project', displayed: 'displayed', processed: 'actually processed', processedLegacy: 'processed so far', queued: 'queued only', period: 'period covered', updated: 'data updated',
    progress: 'Progress', localPreview: 'Local preview',
    noImages: 'No cloud map in this package.', noPoints: 'No monitoring points in this package.', noDetail: 'No point detail in this package.', noScopes: 'No scope list in this package.',
    scopesTitle: 'Scopes (batch / window / orbit)', pointsTitle: 'Monitoring / reference points', cloudTitle: 'Cloud maps',
    acceptance: 'Scientific acceptance', processing: 'Processing status', fieldVal: 'Field validation', displayLayer: 'Display layer',
    qcNote: 'Pack QC flag only. Not scientific acceptance and not field validation.', valNote: 'Not a field-validation pass.',
    noFill: 'No outward number on this map. Empty rates are not filled from diagnostic values, crest medians, or a processing percent.',
    batch: 'Batch', window: 'Window', exportId: 'Export', source: 'Source', flags: 'Flags', qualityNote: 'Quality note', refPoint: 'Reference', monitorPoint: 'Max / monitor',
    periodK: 'Period covered', updatedK: 'Data updated', clickHint: 'Click a dam ↓', introEye: 'Dam', introTitle: 'Click a dam on the map', introText: 'A dam shows its details and how it has moved over time.',
    damEye: 'Dam', noSeries: 'No time series for this dam yet.', seriesErr: 'Could not read this dam’s time series.', values: 'Values', details: 'Details',
    projectEye: 'The project', by: 'by', method: 'Method', region: 'Area', runs: 'Runs', started: 'started',
    running: 'Running now', paused: 'Paused', stopped: 'Stopped', lastActivity: 'last activity', finished: 'Finished', failed: 'Ended with an error',
    unknown: 'Status unknown (feed paused)', noStatus: 'No status yet', step: 'step', error: 'error', date: 'date',
  },
  zh: {
    back: '← 全球运行', other: 'EN', search: '大坝名称、编号或“纬度, 经度”', go: '搜索', loading: '正在加载…',
    fatal: '无法读取地图数据：', example: '示例数据：仅用于展示页面功能，并非真实观测。',
    colourBy: '颜色 = 数值', noValue: '无对外数字', missing: '缺失', shown: '座大坝在图上', notFound: '没有找到大坝。请输入名称、编号或“纬度, 经度”。',
    dams: '座大坝', displayed: '图上显示', processed: '实际已处理', processedLegacy: '已处理', queued: '仅排队', period: '时间范围', updated: '数据更新于',
    progress: '处理进展', localPreview: '本地预览',
    noImages: '本包没有云图。', noPoints: '本包没有监测点。', noDetail: '本包没有点位详情。', noScopes: '本包没有范围清单。',
    scopesTitle: '范围（批次 / 窗口 / 轨道）', pointsTitle: '监测点 / 参考点', cloudTitle: '云图',
    acceptance: '科学验收', processing: '处理状态', fieldVal: '现场验证', displayLayer: '显示分层',
    qcNote: '仅为数据包质检标记，不是科学验收，也不是现场验证通过。', valNote: '不是现场验证通过。',
    noFill: '本图无对外数字。空速率不用诊断值、坝顶中位数或处理百分比填补。',
    batch: '批次', window: '窗口', exportId: '导出', source: '来源', flags: '标记', qualityNote: '质量说明', refPoint: '参考点', monitorPoint: '最大点 / 监测点',
    periodK: '时间范围', updatedK: '数据更新于', clickHint: '点击大坝 ↓', introEye: '大坝', introTitle: '点击地图上的大坝', introText: '可查看大坝的信息及其随时间的形变。',
    damEye: '大坝', noSeries: '这座大坝暂时没有时间序列。', seriesErr: '无法读取这座大坝的时间序列。', values: '数值', details: '基本信息',
    projectEye: '项目', by: '来自', method: '方法', region: '范围', runs: '运行', started: '开始',
    running: '正在运行', paused: '已暂停', stopped: '已停止', lastActivity: '最近活动', finished: '已完成', failed: '出错结束',
    unknown: '状态未知（数据暂停更新）', noStatus: '暂无状态', step: '步骤', error: '误差', date: '日期',
  },
}
export type Words = typeof W.en
export const words = (lang: Lang): Words => W[lang]
export const tr = (l: L | undefined, lang: Lang) => (l ? l[lang] || l.en : '')

// Known source tokens only. An unknown token is shown as written; it is not relabelled as accepted or processed.
const SCIENCE: Record<string, L> = {
  '待验收': { en: 'Pending scientific acceptance', zh: '待科学验收' },
  '已数值核验_现场验证未建立': { en: 'Numerically verified; field validation not established', zh: '已数值核验，现场验证未建立' },
  '质量未通过': { en: 'Quality not passed', zh: '质量未通过' },
  '仅排队草稿': { en: 'Queued draft only', zh: '仅排队草稿' },
  '多窗口并存_不可推广全坝': { en: 'Multiple windows coexist; not dam-wide', zh: '多窗口并存，不可推广全坝' },
}
const PROCESSING: Record<string, L> = {
  actually_processed: { en: 'Actually processed', zh: '实际已处理' },
  draft_queued_only: { en: 'Queued only', zh: '仅排队' },
}
const FIELD_VAL: Record<string, L> = {
  not_established: { en: 'Field validation not established', zh: '现场验证未建立' },
}
const LAYER: Record<string, L> = {
  main: { en: 'Main display layer only. Not scientific acceptance.', zh: '主图层仅用于显示，不是科学验收。' },
  diag: { en: 'Diagnostic display layer. Not the main rate layer.', zh: '诊断层仅用于显示，不是主速率层。' },
  draft: { en: 'Draft display layer only.', zh: '草稿层仅用于显示。' },
}
function gloss(table: Record<string, L>, code: string | null | undefined, lang: Lang): string {
  if (!code) return '—'
  const g = table[code]
  if (!g) return code
  const text = g[lang] || g.en
  return text === code ? code : `${text} (${code})`
}
export const scienceLabel = (code: string | null | undefined, lang: Lang) => gloss(SCIENCE, code, lang)
export const processingLabel = (code: string | null | undefined, lang: Lang) => gloss(PROCESSING, code, lang)
export const fieldLabel = (code: string | null | undefined, lang: Lang) => gloss(FIELD_VAL, code, lang)
export const layerLabel = (code: string | null | undefined, lang: Lang) => gloss(LAYER, code, lang)

// first language: ?lang=zh|en, else ?from=cn (sent by the Chinese Global Runs page), else the reader's last choice, else English
export function firstLang(): Lang {
  const q = new URLSearchParams(window.location.search)
  if (q.get('lang') === 'zh' || q.get('lang') === 'en') return q.get('lang') as Lang
  if (q.get('from') === 'cn') return 'zh'
  try { const s = localStorage.getItem('gr-lang'); if (s === 'zh' || s === 'en') return s } catch { /* storage off */ }
  return 'en'
}
export function saveLang(l: Lang) { try { localStorage.setItem('gr-lang', l) } catch { /* storage off */ } }

// the "back" button always goes to the GeoForge Global Runs page in the page's language
export const hubUrl = (l: Lang) => l === 'zh' ? 'https://geoforgehhu.com/cn/global-runs.html' : 'https://geoforgehhu.com/global-runs.html'
