#!/usr/bin/env python3
"""Open the built map against the public fixture and check status semantics.

The fixture directory is only read. This does not deploy anything.
"""
import hashlib
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

SITE = os.environ.get('SITE', 'http://127.0.0.1:8871')
FIXTURE = Path(os.environ.get('FIXTURE', '/tmp/fixture'))
OUT = Path(os.environ.get('ARTIFACTS', '/opt/cursor/artifacts'))
CHROME = os.environ.get('CHROME', '/usr/local/bin/google-chrome')


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def assert_fixture_untouched(served: Path):
    for rel in ('data/dams.json', 'data/manifest.json', 'handoff/meta.json', 'handoff/inventory.json', 'map-handoff/meta.json', 'map-handoff/dams.json'):
        a, b = FIXTURE / rel, served / rel
        if sha256(a) != sha256(b):
            raise SystemExit(f'fixture bytes changed: {rel}')


def cell(page, name):
    return page.locator(f'[data-count="{name}"] b').inner_text().strip()


def label(page, name):
    return page.locator(f'[data-count="{name}"] span').inner_text().strip()


def open_query(page, text):
    heading = page.locator('main .panel').first.locator('h2')
    previous = heading.inner_text() if heading.count() else ''
    page.locator('.search input').fill(text)
    page.locator('.search button').click()
    page.wait_for_function(
        """(prev) => {
          const h = document.querySelector('.panel h2');
          return !!(h && h.innerText && h.innerText !== prev);
        }""",
        arg=previous,
        timeout=15000,
    )
    page.locator('.status-banner').wait_for(timeout=15000)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    dams = json.loads((FIXTURE / 'data/dams.json').read_text())
    info_404 = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1100}, locale='zh-CN')
        page.on('response', lambda r: info_404.append((r.status, r.url)) if '/dam_detail/' in r.url and r.url.endswith('/info.json') and r.status >= 400 else None)
        served = os.environ.get('SERVED')
        if served:
            assert_fixture_untouched(Path(served))
        page.goto(SITE + '/?lang=zh', wait_until='domcontentloaded')
        page.locator('.dot-canvas').wait_for()
        page.locator('[data-count="processed"] b').wait_for()
        page.wait_for_function("document.querySelector('[data-count=processed] b')?.textContent?.trim() === '30'", timeout=20000)
        assert cell(page, 'displayed') == '33', cell(page, 'displayed')
        assert cell(page, 'processed') == '30', cell(page, 'processed')
        assert cell(page, 'queued') == '3', cell(page, 'queued')
        assert label(page, 'displayed') == '图上显示'
        assert label(page, 'processed') == '实际已处理'
        assert label(page, 'queued') == '仅排队'
        assert cell(page, 'processed') != cell(page, 'displayed')
        body = page.locator('body').inner_text()
        for banned in ('Local kit', 'not processed yet', '本地 kit', '本地预览 · 未上', '100%'):
            if banned in body:
                raise SystemExit(f'banned text visible: {banned}')
        assert page.locator('.legend-row').inner_text().strip() == '缺失'
        assert page.locator('a.progress-link').get_attribute('href') == '/progress/'
        page.locator('.hero').screenshot(path=str(OUT / 'map-root-zh.png'))

        # LOS: null rates stay unlabeled as a number, and the gray swatch stays. The two real rates keep the ramp.
        page.locator('.layer-box select').select_option('los')
        page.locator('.legend-seq').wait_for()
        assert '无对外数字' in page.locator('.legend-row').inner_text()
        page.locator('.map-wrap').screenshot(path=str(OUT / 'map-los-layer.png'))

        # Processing percent is null for every dam: no ramp and no 100.
        page.locator('.layer-box select').select_option('proc')
        assert page.locator('.legend-seq').count() == 0
        assert '100' not in page.locator('.layer-box').inner_text()
        page.locator('.layer-box select').select_option('los')

        open_query(page, 'Pubugou')
        banner = page.locator('.status-banner')
        assert banner.get_attribute('data-layer') == 'main'
        assert banner.get_attribute('data-acceptance') == '待验收'
        assert banner.get_attribute('data-processing') == 'actually_processed'
        text = page.locator('.panel').first.inner_text()
        assert '20.93' in page.locator('[data-value-id="los"]').inner_text()
        assert '-240.7' in page.locator('[data-value-id="cum"]').inner_text() or '240.7' in page.locator('[data-value-id="cum"]').inner_text()
        assert '待验收' in text
        assert '现场验证未建立' in text
        assert '不是科学验收' in text
        assert 'DRAFT-Pubugou-D062' in text
        assert 'CN-Pubugou-A026' in text
        assert 'D062 是轨道号' in text
        assert '分层：主图层（platform_ready）' not in text
        assert page.locator('.scope').count() == 3
        page.locator('.status-banner').screenshot(path=str(OUT / 'map-main-pending-pubugou.png'))

        open_query(page, 'Ertan')
        assert page.locator('.status-banner').get_attribute('data-processing') == 'draft_queued_only'
        assert page.locator('.status-banner').get_attribute('data-acceptance') == '仅排队草稿'
        assert page.locator('[data-value-id="los"]').inner_text().strip().endswith('无对外数字') or '无对外数字' in page.locator('[data-value-id="los"]').inner_text()
        assert '0 mm/yr' not in page.locator('[data-value-id="los"]').inner_text()
        assert '100' not in page.locator('[data-value-id="proc"]').inner_text()
        # the queued scope keeps its own source status; it is not rewritten and not counted above
        assert cell(page, 'processed') == '30'
        assert cell(page, 'queued') == '3'
        assert '待验收' in page.locator('.scope').first.inner_text()
        page.locator('.panel').first.screenshot(path=str(OUT / 'map-queued-ertan.png'))

        open_query(page, 'Longtan')
        assert page.locator('.status-banner').get_attribute('data-processing') == 'draft_queued_only'
        open_query(page, 'Sanxia')
        assert page.locator('.status-banner').get_attribute('data-acceptance') == '仅排队草稿'

        open_query(page, '龙背湾')
        scopes = page.locator('.scope')
        assert scopes.count() == 2
        joined = ' '.join(scopes.nth(i).inner_text() for i in range(2))
        assert '已数值核验_现场验证未建立' in joined
        assert '质量未通过' in joined
        assert '2016-09-30' in joined and '2017-05-04' in joined
        assert '无对外数字' in page.locator('[data-value-id="los"]').inner_text()
        assert 'mm/yr' not in page.locator('[data-value-id="los"]').inner_text()
        assert '本包没有云图' in page.locator('.panel').first.inner_text()
        assert '本包没有监测点' in page.locator('.panel').first.inner_text()
        assert '暂时没有时间序列' in page.locator('.panel').first.inner_text()
        assert page.locator('[data-detail="missing"]').count() == 0
        page.locator('.scope-list').screenshot(path=str(OUT / 'map-new-point-scopes-longbeiwan.png'))

        for name, layer, lat in (
            ('狮子坪', 'draft', '31.539'),
            ('九甸峡', 'diag', '34.922'),
            ('梨园', 'diag', '27.675'),
            ('毛尔盖', 'diag', '32.074'),
            ('普西桥', 'draft', '23.144'),
        ):
            open_query(page, name)
            assert page.locator('.status-banner').get_attribute('data-layer') == layer, name
            assert lat in page.locator('main .panel').first.locator('h2').inner_text(), name
            assert page.locator('.scope').count() >= 1, name
            assert page.locator('[data-detail="missing"]').count() == 0, name
            assert '本包没有云图' in page.locator('.panel').first.inner_text()
            assert 'mm/yr' not in page.locator('[data-value-id="los"]').inner_text()

        # Jiudianxia is not Pubugou, and D062 is the orbit on this separate pin.
        open_query(page, 'Jiudianxia')
        head = page.locator('main .panel').first.locator('h2').inner_text()
        assert '34.922' in head and '103.833' in head
        assert '29.209' not in head
        assert page.locator('.status-banner').get_attribute('data-layer') == 'diag'
        assert 'D062 是轨道号' in page.locator('.panel').first.inner_text()

        for name in ('江坪河', '引子渡', '玛尔挡', '两河口'):
            open_query(page, name)
            panel = page.locator('.panel').first.inner_text()
            assert '质量未通过' in panel, name
            assert page.locator('.scope.bad').count() >= 1, name

        # Every pin resolves a detail. Export aliases open the same single pin.
        for i, dam_id in enumerate(dams['id']):
            open_query(page, dam_id)
            assert page.locator('[data-detail="missing"]').count() == 0, dam_id
            assert page.locator('.status-banner').count() == 1, dam_id
            assert '本包没有点位详情' not in page.locator('main .panel').first.inner_text(), dam_id
        open_query(page, 'CN-Pubugou-A026')
        assert '29.209' in page.locator('main .panel').first.locator('h2').inner_text()
        page.locator('.search input').fill('DRAFT-Pubugou-D062')
        page.locator('.search button').click()
        page.wait_for_timeout(400)
        assert page.locator('.toast').count() == 0
        assert page.locator('main .panel').first.locator('h2 small').inner_text().startswith('pubugou')
        open_query(page, 'CN-Jiudianxia-D062')
        assert page.locator('main .panel').first.locator('h2 small').inner_text().startswith('jiudianxia')

        # Old interactions: language, layer, coordinate search, zoom.
        page.locator('.leaflet-tile').first.wait_for()
        before_zoom = page.evaluate("""() => {
          const m = (document.querySelector('.leaflet-tile')?.src || '').match(/\\/tile\\/(\\d+)\\//)
          return m ? Number(m[1]) : null
        }""")
        page.locator('.leaflet-control-zoom-in').click()
        page.wait_for_function("""(prev) => {
          const m = (document.querySelector('.leaflet-tile')?.src || '').match(/\\/tile\\/(\\d+)\\//)
          return !!(m && Number(m[1]) !== prev)
        }""", arg=before_zoom, timeout=8000)
        page.locator('.search input').fill('34.922, 103.833')
        page.locator('.search button').click()
        page.locator('.status-banner').wait_for()
        assert '九甸峡' in page.locator('main .panel').first.locator('h2').inner_text() or 'Jiudianxia' in page.locator('main .panel').first.locator('h2').inner_text()
        page.locator('.lang-btn').click()
        page.wait_for_function("document.querySelector('[data-count=processed] span')?.textContent?.includes('actually processed')")
        assert cell(page, 'displayed') == '33'
        assert cell(page, 'processed') == '30'
        assert cell(page, 'queued') == '3'
        assert page.locator('.legend-row').inner_text().strip() == 'no outward number'
        en = page.locator('body').inner_text()
        assert 'not processed yet' not in en
        assert 'Local preview · not on geoforgehhu.com' not in en
        assert '100%' not in en
        page.locator('.hero-strip').screenshot(path=str(OUT / 'map-counts-en.png'))

        browser.close()
    if info_404:
        raise SystemExit('detail requests 404: ' + ', '.join(f'{s} {u}' for s, u in info_404[:12]))
    print('browser checks ok')
    print('screenshots', ', '.join(p.name for p in sorted(OUT.glob('map-*.png'))))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('FAILED', type(e).__name__, e, file=sys.stderr)
        raise
