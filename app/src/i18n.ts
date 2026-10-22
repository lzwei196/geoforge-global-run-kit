// Page words in English and Chinese. Texts about YOUR project (title, value names, notes) come from manifest.json instead.
// Keep the words plain: say what a reader sees, no jargon.
import type { L } from './api'

export type Lang = 'en' | 'zh'
const W = {
  en: {
    back: '← Global runs', other: '中文', search: 'Dam name, id or “lat, lon”', go: 'Go', loading: 'Loading…',
    fatal: 'The map data could not be read:', example: 'Example data: made up to show how the page works. These are not real measurements.',
    colourBy: 'Colour = a value', noValue: 'not processed yet', shown: 'dams on the map', notFound: 'No dam found. Try a name, an id or “lat, lon”.',
    dams: 'dams in the project', processed: 'processed so far', period: 'period covered', updated: 'data updated',
    periodK: 'Period covered', updatedK: 'Data updated', clickHint: 'Click a dam ↓', introEye: 'Dam', introTitle: 'Click a dam on the map', introText: 'A dam shows its details and how it has moved over time.',
    damEye: 'Dam', noSeries: 'No time series for this dam yet.', seriesErr: 'Could not read this dam’s time series.', values: 'Values', details: 'Details',
    projectEye: 'The project', by: 'by', method: 'Method', region: 'Area', runs: 'Runs', started: 'started',
    running: 'Running now', paused: 'Paused', stopped: 'Stopped', lastActivity: 'last activity', finished: 'Finished', failed: 'Ended with an error',
    unknown: 'Status unknown (feed paused)', noStatus: 'No status yet', step: 'step', error: 'error', date: 'date',
  },
  zh: {
    back: '← 全球运行', other: 'EN', search: '大坝名称、编号或“纬度, 经度”', go: '搜索', loading: '正在加载…',
    fatal: '无法读取地图数据：', example: '示例数据：仅用于展示页面功能，并非真实观测。',
    colourBy: '颜色 = 数值', noValue: '尚未处理', shown: '座大坝在图上', notFound: '没有找到大坝。请输入名称、编号或“纬度, 经度”。',
    dams: '座大坝', processed: '已处理', period: '时间范围', updated: '数据更新于',
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
