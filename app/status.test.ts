import assert from 'node:assert/strict'
import test from 'node:test'
import { NO_VALUE, stateOf } from './src/format.ts'
import { words } from './src/i18n.ts'
import {
  DIAGNOSTIC_PAGE_HREF_PATTERN, colorsFor, countByProcessing, detailAliases, detailCandidates,
  diagnosticPageHref, diagnosticPageLabel, formatMeasured, heroCounts,
  isPublicDataPath, legacyProcessed, progressHref, scopesForDisplay, seriesFromTile, showLocalOnlyNotice,
} from './src/status.ts'

test('detail candidates prefer the stable id, then the export alias, and reject paths', () => {
  assert.deepEqual(detailCandidates('pubugou', 'CN-Pubugou-A026'), ['pubugou', 'CN-Pubugou-A026'])
  assert.deepEqual(detailCandidates('longbeiwan', null), ['longbeiwan'])
  assert.deepEqual(detailCandidates('jiudianxia', 'CN-Jiudianxia-D062'), ['jiudianxia', 'CN-Jiudianxia-D062'])
  assert.deepEqual(detailCandidates('x', '../secret'), ['x'])
  assert.deepEqual(detailCandidates('x', '/opt/internal/a'), ['x'])
  assert.deepEqual(detailCandidates('same', 'same'), ['same'])
  assert.deepEqual(detailAliases({
    dam_id: 'pubugou', export_id: 'CN-Pubugou-A026',
    old_28_point_ids: ['CN-Pubugou-A026', 'DRAFT-Pubugou-D062'],
    scopes: [{ export_id: 'CN-Pubugou-A026' }, { export_id: 'DRAFT-Pubugou-D062' }],
  }), ['pubugou', 'CN-Pubugou-A026', 'DRAFT-Pubugou-D062'])
})

test('queued dams are not processed, and a filled colour class is not the count', () => {
  const classes = [...Array(30).fill('actually_processed'), ...Array(3).fill('draft_queued_only')]
  const c = countByProcessing(classes)
  assert.equal(c.processed, 30)
  assert.equal(c.queued, 3)
  assert.equal(c.known, 33)
  const hero = heroCounts(33, classes, legacyProcessed(Array(33).fill(2)))
  assert.deepEqual(hero, { displayed: 33, processed: 30, queued: 3, fromStatus: true })
  assert.equal(hero.processed, 30)
  assert.notEqual(hero.processed, 33)
})

test('without processing_class the legacy non-null count remains, and loading does not flash it', () => {
  assert.equal(heroCounts(8, null, 5).processed, null)
  assert.equal(heroCounts(8, [null, null], 5).fromStatus, false)
  assert.equal(heroCounts(8, [null, null], 5).processed, 5)
  assert.equal(legacyProcessed([1, null, 0, undefined]), 2)
})

test('null is not zero on a diverging scale, and null proc is not 100', () => {
  const missing = colorsFor([null, undefined], { kind: 'num', scale: 'diverging' })
  const zero = colorsFor([0], { kind: 'num', scale: 'diverging' })
  assert.equal(missing.colors[0], NO_VALUE)
  assert.equal(missing.colors[1], NO_VALUE)
  assert.notEqual(zero.colors[0], NO_VALUE)
  assert.equal(missing.finite, 0)
  assert.equal(zero.finite, 1)
  const rated = colorsFor([null, -20.93], { kind: 'num', scale: 'diverging' })
  assert.equal(rated.colors[0], NO_VALUE)
  assert.notEqual(rated.colors[1], NO_VALUE)
  assert.equal(formatMeasured(null, '%', n => String(n), 'no outward number'), 'no outward number')
  assert.equal(formatMeasured(undefined, '%', n => String(n), 'no outward number'), 'no outward number')
  assert.equal(formatMeasured(100, '%', n => String(n), 'no outward number'), '100 %')
})

test('quality failures and limited scopes stay intact on a main pin', () => {
  const scopes = [
    { scope: '冻结运行期窗口', science_acceptance_status: '已数值核验_现场验证未建立', diagnostic_only: false },
    { scope: '全日期严格通过', science_acceptance_status: '质量未通过', diagnostic_only: false },
    { scope: 'diag export', science_acceptance_status: '待验收', diagnostic_only: true, platform_ready: false },
  ]
  const shown = scopesForDisplay(scopes)
  assert.equal(shown.length, 3)
  assert.deepEqual(shown.map(s => s.science_acceptance_status), ['已数值核验_现场验证未建立', '质量未通过', '待验收'])
  assert.equal(shown[2].diagnostic_only, true)
  assert.equal(scopesForDisplay(null).length, 0)
})

test('series lookup uses the stable id before an export alias', () => {
  const rows = { xiaolangdi: { t: ['2020-01-01'], d: [1] }, 'CN-Xiaolangdi-A113-A2': { t: ['1999-01-01'], d: [9] } }
  assert.equal(seriesFromTile(rows, ['xiaolangdi', 'CN-Xiaolangdi-A113-A2'])?.t[0], '2020-01-01')
  assert.equal(seriesFromTile(rows, ['missing', 'CN-Xiaolangdi-A113-A2'])?.t[0], '1999-01-01')
  assert.equal(seriesFromTile(rows, ['longbeiwan']), null)
  assert.equal(seriesFromTile(undefined, ['a']), null)
})

test('deployment metadata does not claim validation and only allows a site path', () => {
  assert.equal(showLocalOnlyNotice({ local_only: false, unpublished: false, claims_scientific_validation: true }), false)
  assert.equal(showLocalOnlyNotice({ local_only: true }), true)
  assert.equal(showLocalOnlyNotice(null), false)
  assert.equal(progressHref({ progress_href: '/progress/' }), '/progress/')
  assert.equal(progressHref({ progress_href: 'https://example.test/progress' }), null)
  assert.equal(progressHref({ progress_href: '//evil.test' }), null)
  assert.equal(isPublicDataPath('dam_detail/pubugou/velocity.png'), true)
  assert.equal(isPublicDataPath('/opt/internal/velocity.png'), false)
  assert.equal(isPublicDataPath('../secret.png'), false)
  assert.equal(isPublicDataPath(null), false)
})

test('a diagnostic page link is optional and only a same-origin /diagnostics path', () => {
  assert.equal(DIAGNOSTIC_PAGE_HREF_PATTERN, '^/diagnostics/[A-Za-z0-9][A-Za-z0-9._-]+/?$')
  assert.equal(diagnosticPageHref('/diagnostics/pubugou-pack'), '/diagnostics/pubugou-pack')
  assert.equal(diagnosticPageHref('/diagnostics/Ab.cd_1-2/'), '/diagnostics/Ab.cd_1-2/')
  assert.equal(diagnosticPageHref('/diagnostics/a1'), '/diagnostics/a1')
  const rejected = [
    undefined, null, 1, '', '   ',
    '/diagnostics/a', '/diagnostics/', '/diagnostics', 'diagnostics/pack',
    '//diagnostics/pack', '//evil.test/diagnostics/pack',
    '/diagnostics/../secret', '/diagnostics/foo/../bar', '/diagnostics/foo..bar', '/diagnostics/foo\\bar',
    '/diagnostics/foo/bar', '/diagnostics/foo//', '/diagnostics//pack',
    'https://example.test/diagnostics/pack', 'http://example.test/diagnostics/pack',
    '/diagnostics/pack?x=1', '/diagnostics/pack#frag', '/diagnostics/pack/?q=1',
    '/progress/', '/diagnostics/pack pack', ' /diagnostics/pack', '/diagnostics/pack ',
    '/Diagnostics/pack', '/diagnostics/.pack', '/diagnostics/-pack', '/diagnostics/pack%2e%2e',
    '/diagnostics/pack\n', '/diagnostics/pack\r', '/diagnostics/pack\u2028',
  ]
  for (const bad of rejected) assert.equal(diagnosticPageHref(bad), null, String(bad))
  assert.equal(diagnosticPageHref(undefined), null)
  assert.equal(diagnosticPageLabel(undefined, 'fallback'), 'fallback')
  assert.equal(diagnosticPageLabel(null, 'fallback'), 'fallback')
  assert.equal(diagnosticPageLabel('  ', 'fallback'), 'fallback')
  assert.equal(diagnosticPageLabel('<b>hi</b>', 'fallback'), 'fallback')
  assert.equal(diagnosticPageLabel('see <pack>', 'fallback'), 'fallback')
  assert.equal(diagnosticPageLabel('line\nbreak', 'fallback'), 'fallback')
  assert.equal(diagnosticPageLabel('  Independent note  ', 'fallback'), 'Independent note')
})

test('a live feed without done is not shown as 100 percent', () => {
  const w = words('en')
  const text = stateOf({
    run_id: 'china_pilot_2026_10', status: 'finished', process_alive: false,
    exported_at: '2026-10-30T12:02:57+08:00', last_activity: '2026-10-30T12:02:57+08:00',
    progress: { what: { en: 'unique dams', zh: '坝' } },
  }, w, 'en').text
  assert.equal(text, w.finished)
  assert.equal(text.includes('100'), false)
  const running = stateOf({
    run_id: 'r', status: 'running', process_alive: true,
    exported_at: new Date().toISOString(), last_activity: new Date().toISOString(),
    progress: { what: { en: 'dams', zh: '坝' } },
  }, w, 'en').text
  assert.equal(running.includes('100'), false)
  assert.equal(running.startsWith(w.running), true)
})
