# GeoForge 全球运行：页面工具包

用于按 GeoForge 风格搭建全球运行的实时地图页面，并接入 [geoforgehhu.com/cn/global-runs.html](https://geoforgehhu.com/cn/global-runs.html)。English: [README.md](README.md)。

起步页面面向**带时间序列的点数据**，例如基于 InSAR 的大坝形变。页面已包含：带返回按钮的 GeoForge 页头、中英文切换、
如实的运行状态、按数值着色的点地图、时间序列图和项目面板。你只需填入数据和文字。

## 两分钟试用

```
python tools/make_example_data.py     # 生成示例数据（已明确标注为虚构）到 app/public/data/
cd app && npm install && npm run dev  # 需要 Node 18+；打开 http://127.0.0.1:8870/
```

## 内容

| 路径 | 说明 |
| --- | --- |
| `app/` | 页面（React + Leaflet + TypeScript，用 Vite 构建） |
| `tools/make_example_data.py` | 生成示例数据：请按其格式编写自己的数据流程 |
| `tools/check_data.py` | 发布前检查数据文件夹 |
| `tools/status_writer.py` | 每 60 秒写出运行状态 |
| `docs/DATA_FORMAT.md` | 页面读取的全部文件和字段 |
| `docs/GLOBAL_RUNS_FEED.md` | 全球运行页面上的卡片及状态规则 |
| `docs/HOSTING.md` | 构建、nginx、响应头、检查 |
| `docs/STYLE.md` | 外观、用词及可公开的内容 |
| `docs/CHECKLIST.md` | 上线前检查清单 |

## 上线步骤

1. 运行示例，阅读 `docs/DATA_FORMAT.md`。
2. 让你的数据流程写出相同格式的文件（先做中国；扩展到全球不需要改代码）。
3. 在 `manifest.json` 中修改文字和数值；页面代码只在 `docs/STYLE.md` 允许的地方修改。
4. 部署（`docs/HOSTING.md`），启动状态写出脚本，完成 `docs/CHECKLIST.md`。
5. 把页面地址和一张卡片图片发给 GeoForge。我们检查后把你的卡片加入全球运行页面。

说明：文档正文为英文；字段名和命令与中文无关，可直接照用。用词要求：KI agents 译为“知识基础设施智能体”。
如在中国大陆服务器上用域名公开网站，需要 ICP 备案。

问题和修复：请在本仓库提交 issue。
